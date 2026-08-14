import { DisconnectReason } from 'livekit-client';
import { describe, expect, it } from 'vitest';

import { describeDisconnect, isDeliberateLeave } from '@/lib/livekit/disconnect-reason';

import { forbiddenCopyReason } from '../../../support/forbidden-copy';

/**
 * Every member of the enum, plus `undefined`, because a reason nobody thought
 * about must fail a test here rather than render a blank panel in a call that
 * has just dropped.
 */
const ALL_REASONS = Object.values(DisconnectReason).filter(
  (value): value is DisconnectReason => typeof value === 'number',
);

describe('isDeliberateLeave', () => {
  it('is true only for a client-initiated disconnect', () => {
    expect(isDeliberateLeave(DisconnectReason.CLIENT_INITIATED)).toBe(true);

    for (const reason of ALL_REASONS.filter((r) => r !== DisconnectReason.CLIENT_INITIATED)) {
      expect(isDeliberateLeave(reason)).toBe(false);
    }
  });

  // The whole reason this is a comparison rather than a truthiness check. Both of
  // these are falsy, both mean an involuntary drop, and treating either as a
  // deliberate leave sends the person silently Home from a call that failed —
  // UNKNOWN_REASON being the commonest involuntary drop of all.
  it('does not mistake a missing or unknown reason for a leave', () => {
    expect(DisconnectReason.UNKNOWN_REASON).toBe(0); // pins the trap itself
    expect(isDeliberateLeave(DisconnectReason.UNKNOWN_REASON)).toBe(false);
    expect(isDeliberateLeave(undefined)).toBe(false);
  });
});

describe('describeDisconnect', () => {
  it('answers for every reason the SDK can give, and for none at all', () => {
    for (const reason of [...ALL_REASONS, undefined]) {
      const described = describeDisconnect(reason);

      expect(described.title.length).toBeGreaterThan(0);
      expect(described.message.length).toBeGreaterThan(0);
    }
  });

  // `code-standards.md` → Error Handling: a user-facing message never carries an
  // error code, a provider name, or an enum member. Asserted rather than reviewed,
  // because copy is exactly what gets edited later without re-reading the rule.
  //
  // Through the shared set rather than patterns of its own, added at F24: two
  // copies of "what counts as a leak" would drift, and the half that drifted
  // looser is the half that would stop catching anything.
  it('never leaks a code, an enum member, or a provider name', () => {
    for (const reason of [...ALL_REASONS, undefined]) {
      const { title, message } = describeDisconnect(reason);

      for (const [field, text] of Object.entries({ title, message })) {
        const leak = forbiddenCopyReason(text);
        expect(leak, `${String(reason)}.${field} contains ${leak}: ${text}`).toBeNull();
      }
    }
  });

  it('does not offer a rejoin for a meeting that is over or that refused you', () => {
    expect(describeDisconnect(DisconnectReason.ROOM_DELETED).rejoinable).toBe(false);
    expect(describeDisconnect(DisconnectReason.ROOM_CLOSED).rejoinable).toBe(false);
    expect(describeDisconnect(DisconnectReason.PARTICIPANT_REMOVED).rejoinable).toBe(false);
  });

  it('offers a rejoin when trying again could plausibly work', () => {
    expect(describeDisconnect(undefined).rejoinable).toBe(true);
    expect(describeDisconnect(DisconnectReason.UNKNOWN_REASON).rejoinable).toBe(true);
    expect(describeDisconnect(DisconnectReason.SIGNAL_CLOSE).rejoinable).toBe(true);
    expect(describeDisconnect(DisconnectReason.SERVER_SHUTDOWN).rejoinable).toBe(true);
  });

  it('distinguishes a second window from a lost connection', () => {
    // Reachable only for a signed-in participant, whose identity is the same in
    // every tab. Telling them "the connection was lost" would send them straight
    // back to knock the other window out, and round again.
    const duplicate = describeDisconnect(DisconnectReason.DUPLICATE_IDENTITY);
    const lost = describeDisconnect(undefined);

    expect(duplicate.message).not.toBe(lost.message);
    expect(duplicate.rejoinable).toBe(true);
  });
});
