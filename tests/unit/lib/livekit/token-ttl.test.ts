import { describe, expect, it } from 'vitest';

import { tokenTtlSeconds } from '@/lib/livekit/token-ttl';

const NOW = new Date('2026-08-13T12:00:00.000Z');

function inHours(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

/**
 * The guarantee under test: a token can never outlive the meeting it opens.
 */
describe('tokenTtlSeconds', () => {
  it('caps at one hour when the meeting has far longer to run', () => {
    expect(tokenTtlSeconds(inHours(24), NOW)).toBe(3600);
  });

  it('uses the remaining time when it is under an hour', () => {
    // Hour 23 of a 24-hour window: one hour left, not four.
    expect(tokenTtlSeconds(inHours(0.25), NOW)).toBe(900);
  });

  it('never returns zero', () => {
    // A zero TTL is read as "no expiry" by some JWT implementations — the exact
    // opposite of the guarantee. Callers reject an expired meeting before here,
    // so this can only arise from a sub-second remainder.
    expect(tokenTtlSeconds(new Date(NOW.getTime() + 100), NOW)).toBe(1);
  });

  it('never returns a negative for an already-expired meeting', () => {
    expect(tokenTtlSeconds(inHours(-5), NOW)).toBe(1);
  });
});
