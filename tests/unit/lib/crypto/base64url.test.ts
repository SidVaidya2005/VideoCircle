import { describe, expect, it } from 'vitest';

import { fromBase64Url, toBase64Url } from '@/lib/crypto/base64url';

const URL_SAFE = /^[A-Za-z0-9_-]*$/;

describe('toBase64Url', () => {
  it('emits only URL-safe characters', () => {
    // 0..255 covers every byte, so it is guaranteed to produce the + and / that
    // plain base64 would emit and base64url must not.
    const allBytes = Uint8Array.from({ length: 256 }, (_unused, i) => i);
    expect(toBase64Url(allBytes)).toMatch(URL_SAFE);
  });

  it('drops padding', () => {
    expect(toBase64Url(Uint8Array.from([1]))).not.toContain('=');
  });

  it('handles empty input', () => {
    expect(toBase64Url(new Uint8Array())).toBe('');
  });
});

describe('round trip', () => {
  it('is lossless across every byte value', () => {
    const allBytes = Uint8Array.from({ length: 256 }, (_unused, i) => i);
    expect(Array.from(fromBase64Url(toBase64Url(allBytes)))).toEqual(Array.from(allBytes));
  });

  // Padding depends on length % 3, so all three residues need covering.
  it.each([31, 32, 33])('is lossless at length %i', (length) => {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
  });

  it('round-trips empty', () => {
    expect(fromBase64Url(toBase64Url(new Uint8Array()))).toHaveLength(0);
  });
});
