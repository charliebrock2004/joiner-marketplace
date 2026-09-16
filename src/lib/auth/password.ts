import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./constants.ts";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing with scrypt from node's standard library.
 *
 * scrypt is memory-hard and is the strongest password KDF available without
 * pulling in a native dependency (argon2/bcrypt both need compilation).
 *
 * Parameters follow the OWASP minimum for scrypt: N=2^16, r=8, p=1. maxmem has
 * to be raised explicitly because node's 32MB default is below what N=2^16
 * needs (roughly 128 * N * r = 64MB).
 */
const PARAMS = { N: 2 ** 16, r: 8, p: 1, maxmem: 192 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH };

/** Produces `scrypt$N$r$p$salt$hash`, all binary parts base64url encoded. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

/**
 * Verifies a password against a stored hash.
 *
 * Returns false rather than throwing for a malformed hash, and always compares
 * in constant time so a timing signal cannot distinguish a wrong password from
 * a near-miss.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // Refuse absurd parameters from a tampered row rather than allocating on them.
  if (N > 2 ** 20 || r > 32 || p > 16) return false;

  try {
    const salt = Buffer.from(rawSalt ?? "", "base64url");
    const expected = Buffer.from(rawHash ?? "", "base64url");
    if (salt.length === 0 || expected.length === 0) return false;

    const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
      N,
      r,
      p,
      maxmem: PARAMS.maxmem,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
