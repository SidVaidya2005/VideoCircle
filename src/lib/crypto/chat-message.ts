import { z } from 'zod';

import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants';

const IV_BYTES = 12; // AES-GCM standard nonce length.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Decrypted bytes are still untrusted input: any participant holding the link key
 * can encrypt an arbitrary payload. A valid GCM tag proves the sender had the key,
 * not that they sent well-formed data.
 *
 * Applied on the way out as well as the way in, which is where
 * `MAX_CHAT_MESSAGE_LENGTH` is actually enforced — an input's `maxLength` is a
 * courtesy to the person typing, not a rule anything depends on.
 */
const ChatPlaintextSchema = z.object({
  body: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
  sentAt: z.number().int().positive(),
});

export type ChatPlaintext = z.infer<typeof ChatPlaintextSchema>;

/**
 * Encrypts one message, returning `iv || ciphertext`.
 *
 * The IV is generated here, per message, and must never be hoisted to a module
 * constant: reusing a nonce under one AES-GCM key is a total break, not a
 * weakness.
 *
 * `senderIdentity` is bound as additional authenticated data — authenticated but
 * not encrypted. It means a participant cannot replay someone else's ciphertext
 * under their own name, because the tag check fails on the way back in.
 *
 * The return type is pinned to `Uint8Array<ArrayBuffer>` for the same reason
 * `encodeReaction` pins it: `publishData` will not take the `ArrayBufferLike`
 * default, which admits a `SharedArrayBuffer`.
 *
 * Throws if the message is not well formed — most usefully, if the body is longer
 * than the limit. Nothing over-long ever reaches the channel.
 */
export async function encryptChatMessage(
  key: CryptoKey,
  senderIdentity: string,
  message: ChatPlaintext,
): Promise<Uint8Array<ArrayBuffer>> {
  const validated = ChatPlaintextSchema.parse(message);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(senderIdentity) },
    key,
    encoder.encode(JSON.stringify(validated)),
  );

  const packed = new Uint8Array(new ArrayBuffer(IV_BYTES + ciphertext.byteLength));
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), IV_BYTES);
  return packed;
}

/**
 * Decrypts one message.
 *
 * Throws if the payload was tampered with, if it was encrypted under a different
 * key, if the sender identity does not match the one bound at encryption, or if
 * the decrypted body is not a well-formed message. Every one of those is the same
 * outcome to a reader — an unreadable message — and the caller renders it as one
 * rather than letting it reach the render tree.
 */
export async function decryptChatMessage(
  key: CryptoKey,
  senderIdentity: string,
  packed: Uint8Array,
): Promise<ChatPlaintext> {
  // Copied for the same reason `encodeReaction` copies on the way out: what
  // arrives from the data channel is typed `Uint8Array<ArrayBufferLike>`, which
  // admits a `SharedArrayBuffer`, and Web Crypto's `BufferSource` excludes one.
  // The copy costs a few hundred bytes and keeps a cast out of the codebase.
  const bytes = Uint8Array.from(packed);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytes.subarray(0, IV_BYTES),
      additionalData: encoder.encode(senderIdentity),
    },
    key,
    bytes.subarray(IV_BYTES),
  );

  // JSON.parse throws on malformed JSON; the schema throws on a valid JSON value
  // of the wrong shape. Both surface as the same unreadable message.
  return ChatPlaintextSchema.parse(JSON.parse(decoder.decode(plaintext)));
}
