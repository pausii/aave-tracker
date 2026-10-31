// AES-256-GCM with a key derived via PBKDF2-SHA256.
// The envelope format must match app/src/lib/crypto.ts (WebCrypto in the browser).
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';

export const ITERATIONS = 310000;

// Reusing `saltB64` keeps a key already cached in the browser valid.
export function encrypt(plainText, passphrase, saltB64) {
  const salt = saltB64 ? Buffer.from(saltB64, 'base64') : randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 2,
    iterations: ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: Buffer.concat([enc, tag]).toString('base64'),
  });
}

export function decrypt(envelopeJson, passphrase) {
  const { salt, iv, data, iterations } = JSON.parse(envelopeJson);
  const buf = Buffer.from(data, 'base64');
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(0, buf.length - 16);
  const key = pbkdf2Sync(passphrase, Buffer.from(salt, 'base64'), iterations, 32, 'sha256');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
