import { describe, expect, it } from 'vitest';

import { safeNext } from '@/lib/auth/safe-next';

const ORIGIN = 'https://videocircle.example';

describe('safeNext', () => {
  it('keeps a same-origin path', () => {
    expect(safeNext('/history', ORIGIN)).toBe('/history');
  });

  it('preserves the query string', () => {
    expect(safeNext('/history?page=2', ORIGIN)).toBe('/history?page=2');
  });

  it('accepts an absolute URL on our own origin, reduced to its path', () => {
    expect(safeNext(`${ORIGIN}/history`, ORIGIN)).toBe('/history');
  });

  // The three that a startsWith('/') check would wave through.
  it('rejects a protocol-relative URL', () => {
    expect(safeNext('//evil.com', ORIGIN)).toBe('/');
  });

  it('rejects a backslash-prefixed URL, which WHATWG URL normalises to //', () => {
    expect(safeNext('/\\evil.com', ORIGIN)).toBe('/');
  });

  it('rejects an absolute URL on another origin', () => {
    expect(safeNext('https://evil.com/history', ORIGIN)).toBe('/');
  });

  it('rejects a different port on the same host', () => {
    expect(safeNext('https://videocircle.example:8443/history', ORIGIN)).toBe('/');
  });

  it('drops a fragment, which `next` must never carry', () => {
    expect(safeNext('/room/abc-defg-hjk#k=secret', ORIGIN)).toBe('/room/abc-defg-hjk');
  });

  it('falls back to Home on an unparseable value', () => {
    expect(safeNext('http://[', ORIGIN)).toBe('/');
  });

  it('falls back to Home on an empty value', () => {
    expect(safeNext('', ORIGIN)).toBe('/');
  });
});
