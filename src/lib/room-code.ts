// 32 unambiguous characters: no i, l, 0, or 1. A 32-char alphabet divides 256
// evenly, so byte % length introduces no modulo bias.
const ALPHABET = 'abcdefghjkmnopqrstuvwxyz23456789';
const GROUPS = [3, 4, 3] as const;

export const ROOM_CODE_PATTERN = /^[a-hj-km-z2-9]{3}-[a-hj-km-z2-9]{4}-[a-hj-km-z2-9]{3}$/;

/** 10 characters from a 32-symbol alphabet = 50 bits of entropy. */
export function generateRoomCode(): string {
  const length = GROUPS.reduce((sum, n) => sum + n, 0);
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);

  let cursor = 0;
  return GROUPS.map((size) => chars.slice(cursor, (cursor += size)).join('')).join('-');
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_PATTERN.test(code);
}
