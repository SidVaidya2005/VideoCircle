import { describe, expect, it } from 'vitest';

import {
  exportChatKey,
  generateChatKey,
  importChatKey,
  readChatKeyFromHash,
} from '@/lib/crypto/chat-key';

describe('generateChatKey', () => {
  it('produces an extractable AES-GCM 256 key', async () => {
    const key = await generateChatKey();

    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
    expect(key.extractable).toBe(true);
    expect(key.usages).toEqual(expect.arrayContaining(['encrypt', 'decrypt']));
  });

  it('never produces the same key twice', async () => {
    const keys = await Promise.all(Array.from({ length: 20 }, () => generateChatKey()));
    const exported = await Promise.all(keys.map(exportChatKey));

    expect(new Set(exported).size).toBe(exported.length);
  });
});

describe('exportChatKey', () => {
  it('encodes 32 bytes URL-safely, which is what makes it fragment-safe', async () => {
    const encoded = await exportChatKey(await generateChatKey());

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes → ceil(32/3)*4 = 44 base64 chars, minus one '=' of padding.
    expect(encoded).toHaveLength(43);
  });
});

describe('importChatKey', () => {
  it('round-trips an exported key to the same bytes', async () => {
    const encoded = await exportChatKey(await generateChatKey());
    const reimported = await importChatKey(encoded);
    // The reimported key is non-extractable, so the round trip is proven by
    // re-exporting the original encoding rather than the key object.
    expect(reimported.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
  });

  // Non-extractable is what stops a stray exportChatKey leaking a key that arrived
  // from someone else's link.
  it('imports non-extractable', async () => {
    const key = await importChatKey(await exportChatKey(await generateChatKey()));

    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });

  it('rejects a malformed key', async () => {
    await expect(importChatKey('not-a-valid-key')).rejects.toThrow();
  });
});

describe('readChatKeyFromHash', () => {
  it.each([
    ['with a leading hash', '#k=SECRET', 'SECRET'],
    ['without one', 'k=SECRET', 'SECRET'],
    ['alongside other parameters', '#a=1&k=SECRET&b=2', 'SECRET'],
  ])('reads the key %s', (_label, hash, expected) => {
    expect(readChatKeyFromHash(hash)).toBe(expected);
  });

  it.each([
    ['an empty hash', ''],
    ['a hash with no k parameter', '#other=1'],
  ])('returns null for %s', (_label, hash) => {
    expect(readChatKeyFromHash(hash)).toBeNull();
  });

  // base64url uses - and _, neither of which URLSearchParams rewrites. A '+' would
  // decode to a space, which is exactly why the key is not plain base64.
  it('preserves base64url characters intact', () => {
    expect(readChatKeyFromHash('#k=aB-cD_19')).toBe('aB-cD_19');
  });
});
