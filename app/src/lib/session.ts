import type { Envelope, Portfolio } from './types';
import { deriveKey, decryptWithKey } from './crypto';
import { saveSession, loadSession, clearSession } from './storage';

const DATA_URL = 'portfolio.enc.json';

async function fetchEnvelope(): Promise<Envelope> {
  let res: Response;
  try {
    res = await fetch(DATA_URL, { cache: 'no-store' });
  } catch {
    throw new Error('Could not reach the data file.');
  }
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

  let envelope: Envelope;
  try {
    envelope = await fetchEnvelope();
  } catch {
    // Being unable to reach the file says nothing about the key. Throwing the
    // session away here would force the passphrase to be typed again after a
    // moment offline, which is both annoying and pointless.
    return null;
  }

  try {
    return await decryptWithKey(envelope, key);
  } catch {
    // The key genuinely no longer opens this file, so it is of no further use.
    await clearSession();
    return null;
  }
}

// Re-read the data with the stored key, for an app that is already open.
// Never clears the session: this runs in the background, where a failure is
// far more likely to be a flaky network than a bad key.
export async function refreshPortfolio(): Promise<Portfolio | null> {
  const key = await loadSession().catch(() => null);
  if (!key) return null;
  try {
    return await decryptWithKey(await fetchEnvelope(), key);
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await clearSession();
}
