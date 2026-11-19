import { randomInt } from 'node:crypto';

/** Crockford base32 without ambiguous characters (I, L, O, U). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Short, human-friendly order reference to read over the phone, e.g. "D-7K2M9Q4T". */
export function newOrderNumber(): string {
  let out = '';
  for (let i = 0; i < 8; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `D-${out}`;
}
