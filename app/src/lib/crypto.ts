// AES-256-GCM + PBKDF2-SHA256 decryption. Same envelope format as src/crypto.js.
import type { Envelope, Portfolio } from './types';

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64ToBytes = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

// Non-extractable key: JavaScript cannot read its bytes, only decrypt with it.
export async function deriveKey(passphrase: string, envelope: Envelope): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBytes(envelope.salt), iterations: envelope.iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

export async function decryptWithKey(envelope: Envelope, key: CryptoKey): Promise<Portfolio> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(envelope.iv) }, key, b64ToBytes(envelope.data));
  return JSON.parse(dec.decode(plain)) as Portfolio;
}
