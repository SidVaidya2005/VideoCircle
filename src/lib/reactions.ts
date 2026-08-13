import { z } from 'zod';

import { REACTION_MIN_INTERVAL_MS } from '@/lib/constants';

/**
 * The whole vocabulary. Fixed on purpose: a reaction is rendered as text over
 * someone's video, so an open set would be an invitation to paint arbitrary
 * strings on another participant's face.
 *
 * Words, not emoji — the kit forbids emoji outright, and these render as the
 * brand's wide-tracked CAPS.
 */
export const REACTION_LABELS = ['nice', '+1', 'lol', 'wow', 'brb'] as const;

export type ReactionLabel = (typeof REACTION_LABELS)[number];

/**
 * The wire shape. Decoded bytes from a peer are untrusted input in exactly the way
 * a decrypted chat payload is: arriving over our own data channel proves the
 * sender is in the room, not that they sent something well-formed.
 */
const ReactionPayloadSchema = z.object({
  label: z.enum(REACTION_LABELS),
});

export type ReactionPayload = z.infer<typeof ReactionPayloadSchema>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Copied into a plain `ArrayBuffer` rather than returned straight from the
 * encoder: `TextEncoder.encode` is typed `Uint8Array<ArrayBufferLike>`, which
 * admits a `SharedArrayBuffer`, and `publishData` requires a plain one. The copy
 * is a few dozen bytes and keeps a cast out of the codebase.
 */
export function encodeReaction(label: ReactionLabel): Uint8Array<ArrayBuffer> {
  const encoded = encoder.encode(JSON.stringify({ label } satisfies ReactionPayload));
  const bytes = new Uint8Array(new ArrayBuffer(encoded.byteLength));
  bytes.set(encoded);
  return bytes;
}

/**
 * Returns null for anything that is not a known reaction — malformed JSON, a
 * valid object of the wrong shape, or a label outside the set. The caller renders
 * nothing rather than guessing, which is what stops a malformed peer putting text
 * over a tile.
 */
export function decodeReaction(payload: Uint8Array): ReactionPayload | null {
  try {
    const parsed: unknown = JSON.parse(decoder.decode(payload));
    const result = ReactionPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    // Malformed JSON and a wrong-shaped object are the same outcome here: not a
    // reaction, so nothing is rendered.
    return null;
  }
}

/**
 * Whether a reaction from this sender is far enough from their last one.
 *
 * Applied on both sides. The send-side throttle stops you flooding the channel;
 * the receive-side drop stops a peer flooding you, and only the second one matters
 * for a participant you do not control — a rate limit that lives only in the
 * sender's own client proves nothing about anyone else's.
 */
export function shouldAcceptReaction(lastAcceptedAt: number | undefined, now: number): boolean {
  return lastAcceptedAt === undefined || now - lastAcceptedAt >= REACTION_MIN_INTERVAL_MS;
}
