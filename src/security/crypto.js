/**
 * Encrypt / decrypt ML tokens at rest (AES-256-GCM).
 * TOKEN_ENC_KEY must be 32 bytes (base64 or hex).
 * Only used when tokens are stored; not required for the current skeleton.
 */
import crypto from 'node:crypto';
import config from '../config.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * @returns {Buffer}
 */
function getKey() {
  const raw = config.tokenEncKey;
  if (!raw) {
    throw new Error('TOKEN_ENC_KEY is not set');
  }
  // Accept base64 or hex
  let key;
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length === 64) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }
  if (key.length !== 32) {
    throw new Error('TOKEN_ENC_KEY must decode to 32 bytes');
  }
  return key;
}

/**
 * @param {string} plaintext
 * @returns {string} base64(iv + tag + ciphertext)
 */
export function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * @param {string} encoded
 * @returns {string}
 */
export function decrypt(encoded) {
  const key = getKey();
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
