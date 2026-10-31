import type { Envelope, Portfolio } from './types';
import { deriveKey, decryptWithKey } from './crypto';
import { saveSession, loadSession, clearSession } from './storage';

const DATA_URL = 'portfolio.enc.json';

async function fetchEnvelope(): Promise<Envelope> {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load data (${res.status}).`);
  return (await res.json()) as Envelope;
}

// Sign in with a passphrase: derive the key, decrypt, then store the
// non-extractable key so later visits skip the prompt.
export async function unlockWithPassphrase(passphrase: string): Promise<Portfolio> {
  const envelope = await fetchEnvelope();
  const key = await deriveKey(passphrase, envelope);
  const portfolio = await decryptWithKey(envelope, key).catch(() => {
    throw new Error('Incorrect passphrase.');
  });
  await saveSession(key);
  return portfolio;
}

// Try a stored session. Returns null when there is none or it no longer works.
export async function restoreSession(): Promise<Portfolio | null> {
  const key = await loadSession().catch(() => null);
  if (!key) return null;
  try {
    return await decryptWithKey(await fetchEnvelope(), key);
  } catch {
    await clearSession();
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearSession();
}
