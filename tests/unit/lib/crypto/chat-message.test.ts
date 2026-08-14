import { describe, expect, it } from 'vitest';

import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants';
import { generateChatKey } from '@/lib/crypto/chat-key';
import { decryptChatMessage, encryptChatMessage } from '@/lib/crypto/chat-message';

const SENDER = 'guest:1f0c1e2a-0000-4000-8000-000000000001';
const OTHER = 'guest:1f0c1e2a-0000-4000-8000-000000000002';
const IV_BYTES = 12;

function message(body: string) {
  return { body, sentAt: 1_760_000_000_000 };
}

describe('encryptChatMessage / decryptChatMessage', () => {
  it('round-trips a message under the right key and sender', async () => {
    const key = await generateChatKey();
    const packed = await encryptChatMessage(key, SENDER, message('see you at four'));

    await expect(decryptChatMessage(key, SENDER, packed)).resolves.toEqual(
      message('see you at four'),
    );
  });

  it('puts no plaintext in the ciphertext', async () => {
    const key = await generateChatKey();
    const packed = await encryptChatMessage(key, SENDER, message('the password is hunter2'));

    // The claim the whole feature exists for, at the smallest scope that can
    // state it: the bytes handed to publishData contain nothing readable.
    expect(new TextDecoder().decode(packed)).not.toContain('hunter2');
  });

  it('uses a fresh IV for every message', async () => {
    const key = await generateChatKey();
    const first = await encryptChatMessage(key, SENDER, message('same text'));
    const second = await encryptChatMessage(key, SENDER, message('same text'));

    // Reusing a nonce under one AES-GCM key is a total break, not a weakness.
    expect(first.subarray(0, IV_BYTES)).not.toEqual(second.subarray(0, IV_BYTES));
    expect(first).not.toEqual(second);
  });

  it('rejects a message encrypted under a different key', async () => {
    const key = await generateChatKey();
    const other = await generateChatKey();
    const packed = await encryptChatMessage(key, SENDER, message('for the room'));

    // Someone who opened /room/[code] with a fragment from another meeting.
    await expect(decryptChatMessage(other, SENDER, packed)).rejects.toThrow();
  });

  it('rejects a tampered ciphertext', async () => {
    const key = await generateChatKey();
    const packed = await encryptChatMessage(key, SENDER, message('transfer approved'));

    const tampered = Uint8Array.from(packed);
    // One bit, in the ciphertext rather than the IV. GCM authenticates, so this
    // must fail rather than decrypt to something else.
    const last = tampered.length - 1;
    tampered[last] = (tampered[last] ?? 0) ^ 0x01;

    await expect(decryptChatMessage(key, SENDER, tampered)).rejects.toThrow();
  });

  it('rejects a message replayed under a different sender identity', async () => {
    const key = await generateChatKey();
    const packed = await encryptChatMessage(key, SENDER, message('i agree'));

    // Everyone in the room holds the key, so without the identity bound as
    // additional authenticated data, any participant could rebroadcast this and
    // have it attributed to them.
    await expect(decryptChatMessage(key, OTHER, packed)).rejects.toThrow();
  });

  it('refuses to encrypt a body past the limit', async () => {
    const key = await generateChatKey();

    await expect(
      encryptChatMessage(key, SENDER, message('x'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1))),
    ).rejects.toThrow();

    // The boundary itself is allowed — the limit is a maximum, not a bound.
    await expect(
      encryptChatMessage(key, SENDER, message('x'.repeat(MAX_CHAT_MESSAGE_LENGTH))),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it('refuses to encrypt an empty body', async () => {
    const key = await generateChatKey();
    await expect(encryptChatMessage(key, SENDER, message(''))).rejects.toThrow();
  });

  it('rejects a well-formed payload of the wrong shape', async () => {
    const key = await generateChatKey();

    // Crafted with crypto.subtle directly, because encryptChatMessage validates
    // its own input and so cannot produce this. A participant running modified
    // code can: holding the key proves they are in the room, not that they sent
    // something well formed.
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(SENDER) },
      key,
      new TextEncoder().encode(JSON.stringify({ body: { evil: true }, sentAt: 'soon' })),
    );

    const packed = new Uint8Array(IV_BYTES + ciphertext.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ciphertext), IV_BYTES);

    await expect(decryptChatMessage(key, SENDER, packed)).rejects.toThrow();
  });

  it('rejects bytes that are not a message at all', async () => {
    const key = await generateChatKey();

    // Short of the IV length, and random noise. Neither may take the call down.
    await expect(decryptChatMessage(key, SENDER, new Uint8Array())).rejects.toThrow();
    await expect(
      decryptChatMessage(key, SENDER, crypto.getRandomValues(new Uint8Array(64))),
    ).rejects.toThrow();
  });
});
