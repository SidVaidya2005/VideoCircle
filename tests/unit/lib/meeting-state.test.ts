import { describe, expect, it } from 'vitest';

import { meetingJoinability } from '@/lib/meeting-state';

const NOW = new Date('2026-08-13T12:00:00.000Z');

describe('meetingJoinability', () => {
  it('admits a meeting that is open and unexpired', () => {
    expect(
      meetingJoinability({ ended_at: null, expires_at: '2026-08-14T12:00:00.000Z' }, NOW),
    ).toBe('open');
  });

  it('refuses a meeting that has ended', () => {
    expect(
      meetingJoinability(
        { ended_at: '2026-08-13T11:00:00.000Z', expires_at: '2026-08-14T12:00:00.000Z' },
        NOW,
      ),
    ).toBe('ended');
  });

  it('refuses a meeting whose link has expired', () => {
    expect(
      meetingJoinability({ ended_at: null, expires_at: '2026-08-13T11:59:59.000Z' }, NOW),
    ).toBe('expired');
  });

  it('treats the exact expiry instant as expired', () => {
    // The boundary is `now < expires_at`, so equality is out. Off by one here
    // would mint a token for a meeting the sweep already considers finished.
    expect(meetingJoinability({ ended_at: null, expires_at: NOW.toISOString() }, NOW)).toBe(
      'expired',
    );
  });

  it('reports a meeting that both ended and expired as ended', () => {
    // The more specific truth, and the more useful one: the call finished, it did
    // not merely time out. Telling someone their link expired would send them to
    // ask for a new one when the meeting simply ended without them.
    expect(
      meetingJoinability(
        { ended_at: '2026-08-12T09:00:00.000Z', expires_at: '2026-08-12T10:00:00.000Z' },
        NOW,
      ),
    ).toBe('ended');
  });
});
