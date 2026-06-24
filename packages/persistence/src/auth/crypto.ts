/**
 * Password hashing via the Web Crypto API (PBKDF2-HMAC-SHA-256). Passwords are
 * never stored or compared in plaintext: each account gets a random salt and the
 * derived key is what we persist. Available in browsers and Node ≥ 18 (both
 * expose `globalThis.crypto.subtle`).
 */
const ITERATIONS = 100_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;
const TOKEN_BYTES = 24;

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error('Web Crypto (crypto.subtle) is unavailable');
  return c.subtle;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await subtle().importKey(
    'raw',
    enc.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export interface PasswordHash {
  readonly salt: string;
  readonly hash: string;
}

/** Hash a password, generating a fresh random salt (or reusing one for verification). */
export async function hashPassword(password: string, existingSalt?: string): Promise<PasswordHash> {
  const salt = existingSalt ? base64ToBytes(existingSalt) : randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);
  return { salt: bytesToBase64(salt), hash: bytesToBase64(key) };
}

/** Constant-time string comparison (avoids leaking match progress via timing). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verify a password against a stored salt + hash. */
export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqual(hash, expectedHash);
}

/** A random opaque session token (URL-safe base64). */
export function generateToken(): string {
  return bytesToBase64(randomBytes(TOKEN_BYTES)).replace(/\+/g, '-').replace(/\//g, '_');
}
