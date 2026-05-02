import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;
const SALT_LEN = 16;

/**
 * Hash a password with scrypt + per-row salt. Stored as `salt:hash` (hex).
 * scrypt is memory-hard and is the Node-native, no-dep choice for our scale.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Constant-time compare against a stored `salt:hash` value. Safe against
 * timing attacks. Returns false on any malformed input.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let candidate: Buffer;
  try {
    candidate = scryptSync(password, salt, KEY_LEN);
  } catch {
    return false;
  }
  const storedBuf = Buffer.from(hash, "hex");
  if (storedBuf.length !== candidate.length) return false;
  return timingSafeEqual(storedBuf, candidate);
}
