// Keeps the CryptoKey and sign-in time in IndexedDB, with a 7-day session limit.
const DB = 'aave-tracker';
const STORE = 'session';
export const SESSION_DAYS = 7;
const MAX_AGE_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

interface Session {
  key: CryptoKey;
  savedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function saveSession(key: CryptoKey): Promise<void> {
  const session: Session = { key, savedAt: Date.now() };
  await tx('readwrite', (s) => s.put(session, 'current'));
}

export async function loadSession(): Promise<CryptoKey | null> {
  const session = await tx<Session | undefined>('readonly', (s) => s.get('current'));
  if (!session) return null;
  if (Date.now() - session.savedAt > MAX_AGE_MS) {
    await clearSession();
    return null;
  }
  return session.key;
}

export async function clearSession(): Promise<void> {
  await tx('readwrite', (s) => s.delete('current'));
}
