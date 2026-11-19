import { randomInt } from 'node:crypto';

/** Crockford base32 without ambiguous characters (I, L, O, U). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Short, human-friendly references that can be read over the phone:
 * D-7K2M9Q4T (order), B-… (booking), S-… (service request), T-… (ticket).
 * 32^8 ≈ 10^12 combinations; uniqueness is still enforced by a DB constraint.
 */
export function newReference(prefix: 'D' | 'B' | 'S' | 'T'): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${out}`;
}
