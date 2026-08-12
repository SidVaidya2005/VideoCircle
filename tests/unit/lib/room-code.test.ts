import { describe, expect, it } from 'vitest';

import { ROOM_CODE_PATTERN, generateRoomCode, isValidRoomCode } from '@/lib/room-code';

describe('isValidRoomCode', () => {
  it('accepts the canonical shape', () => {
    expect(isValidRoomCode('abc-defg-hjk')).toBe(true);
  });

  // The four excluded characters are the whole point of the alphabet: they are the
  // ones people mistake for each other when reading a code aloud or off a screen.
  it.each(['i', 'l', '0', '1'])('rejects a code containing %s', (char) => {
    expect(isValidRoomCode(`ab${char}-defg-hjk`)).toBe(false);
  });

  it.each([
    ['wrong group lengths', 'ab-defg-hjk'],
    ['a missing hyphen', 'abcdefg-hjk'],
    ['no hyphens at all', 'abcdefghjk'],
    ['uppercase', 'ABC-DEFG-HJK'],
    ['trailing whitespace', 'abc-defg-hjk '],
    ['a leading slash', '/abc-defg-hjk'],
    ['an extra group', 'abc-defg-hjk-lmn'],
    ['empty', ''],
  ])('rejects %s', (_label, code) => {
    expect(isValidRoomCode(code)).toBe(false);
  });

  it('is anchored, so a code embedded in a longer string does not match', () => {
    expect(ROOM_CODE_PATTERN.test('/room/abc-defg-hjk')).toBe(false);
  });
});

describe('generateRoomCode', () => {
  it('always produces a code its own validator accepts', () => {
    for (let i = 0; i < 1_000; i += 1) {
      expect(isValidRoomCode(generateRoomCode())).toBe(true);
    }
  });

  it('never emits an ambiguous character', () => {
    const codes = Array.from({ length: 1_000 }, generateRoomCode).join('');
    expect(codes).not.toMatch(/[il01]/);
  });

  // Not a birthday-paradox proof — 50 bits needs ~33M codes for an even chance of
  // one collision. This catches the real failure mode: a generator that is not
  // random at all, or one seeded identically per call.
  it('produces no duplicate across a large sample', () => {
    const SAMPLE = 20_000;
    const codes = new Set(Array.from({ length: SAMPLE }, generateRoomCode));
    expect(codes.size).toBe(SAMPLE);
  });

  it('uses the full alphabet rather than a subset', () => {
    const seen = new Set(Array.from({ length: 5_000 }, generateRoomCode).join('').split(''));
    seen.delete('-');
    expect(seen.size).toBe(32);
  });
});
