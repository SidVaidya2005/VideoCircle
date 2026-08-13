import { describe, expect, it } from 'vitest';

import { REACTION_MIN_INTERVAL_MS } from '@/lib/constants';
import {
  decodeReaction,
  encodeReaction,
  REACTION_LABELS,
  shouldAcceptReaction,
} from '@/lib/reactions';

const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

describe('encodeReaction / decodeReaction', () => {
  it('round-trips every label in the set', () => {
    for (const label of REACTION_LABELS) {
      expect(decodeReaction(encodeReaction(label))).toEqual({ label });
    }
  });

  it('drops a label outside the set', () => {
    // The whole point of a fixed vocabulary: this string would otherwise be
    // rendered as text over someone's video.
    expect(decodeReaction(bytes({ label: 'you are fired' }))).toBeNull();
    expect(decodeReaction(bytes({ label: '<script>alert(1)</script>' }))).toBeNull();
  });

  it('drops a valid JSON value of the wrong shape', () => {
    // Arriving over our own topic proves the sender is in the room, not that they
    // sent something well-formed.
    expect(decodeReaction(bytes({}))).toBeNull();
    expect(decodeReaction(bytes({ label: 42 }))).toBeNull();
    expect(decodeReaction(bytes(['nice']))).toBeNull();
    expect(decodeReaction(bytes('nice'))).toBeNull();
    expect(decodeReaction(bytes(null))).toBeNull();
  });

  it('drops malformed bytes without throwing', () => {
    // A throw here would land in a data-channel handler and take the call with it.
    expect(decodeReaction(new TextEncoder().encode('{not json'))).toBeNull();
    expect(decodeReaction(new Uint8Array([0xff, 0xfe, 0xfd]))).toBeNull();
    expect(decodeReaction(new Uint8Array())).toBeNull();
  });

  it('ignores extra keys rather than rejecting the reaction', () => {
    // Forward compatibility: a later version adding a field must not make its
    // reactions invisible to this one.
    expect(decodeReaction(bytes({ label: 'nice', sentAt: 123 }))).toEqual({ label: 'nice' });
  });
});

describe('shouldAcceptReaction', () => {
  it('accepts the first reaction from a participant', () => {
    expect(shouldAcceptReaction(undefined, 1_000)).toBe(true);
  });

  it('rejects a second one inside the interval', () => {
    expect(shouldAcceptReaction(1_000, 1_000 + REACTION_MIN_INTERVAL_MS - 1)).toBe(false);
  });

  it('accepts again exactly on the interval', () => {
    expect(shouldAcceptReaction(1_000, 1_000 + REACTION_MIN_INTERVAL_MS)).toBe(true);
  });

  it('bounds a burst to one per interval', () => {
    // A peer firing as fast as it can: only the ones past each interval land.
    let lastAccepted: number | undefined;
    let accepted = 0;

    for (let now = 0; now < 5_000; now += 50) {
      if (shouldAcceptReaction(lastAccepted, now)) {
        accepted += 1;
        lastAccepted = now;
      }
    }

    expect(accepted).toBe(5_000 / REACTION_MIN_INTERVAL_MS);
  });
});
