import { describe, expect, it } from 'vitest';

import {
  buildHistoryEntries,
  formatDuration,
  splitParticipantNames,
  type MeetingRecord,
  type OtherParticipation,
  type OwnParticipation,
} from '@/lib/history';

const NOW = new Date('2026-08-14T12:00:00.000Z');

const MEETING: MeetingRecord = {
  id: 'meeting-1',
  code: 'abc-defg-hjk',
  endedAt: '2026-08-14T11:30:00.000Z',
  expiresAt: '2026-08-15T10:00:00.000Z',
};

/** Still open and unexpired — the live-call case. */
const LIVE_MEETING: MeetingRecord = {
  ...MEETING,
  id: 'meeting-live',
  endedAt: null,
  expiresAt: '2026-08-15T10:00:00.000Z',
};

function ownRow(overrides: Partial<OwnParticipation> = {}): OwnParticipation {
  return {
    identity: 'user:11111111-1111-4111-8111-111111111111',
    displayName: 'Ada',
    joinedAt: '2026-08-14T11:00:00.000Z',
    leftAt: '2026-08-14T11:20:00.000Z',
    meeting: MEETING,
    ...overrides,
  };
}

function otherRow(overrides: Partial<OtherParticipation> = {}): OtherParticipation {
  return {
    identity: 'guest:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    displayName: 'Grace',
    joinedAt: '2026-08-14T11:05:00.000Z',
    leftAt: null,
    meetingId: 'meeting-1',
    ...overrides,
  };
}

describe('buildHistoryEntries — grouping', () => {
  it('collapses a rejoin into one entry spanning first join to last leave', () => {
    // The case that decided the whole shape: a dropped connection writes a second
    // row, and two entries sharing a code and a guest list read as a bug.
    const entries = buildHistoryEntries({
      ownRows: [
        ownRow({ joinedAt: '2026-08-14T11:00:00.000Z', leftAt: '2026-08-14T11:05:00.000Z' }),
        ownRow({
          identity: 'user:11111111-1111-4111-8111-111111111111',
          joinedAt: '2026-08-14T11:09:00.000Z',
          leftAt: '2026-08-14T11:20:00.000Z',
        }),
      ],
      otherRows: [],
      now: NOW,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.startedAt).toBe('2026-08-14T11:00:00.000Z');
    // 11:00 → 11:20 spans the gap; it does not sum the two sessions to 16 minutes.
    expect(entries[0]?.duration).toEqual({ status: 'recorded', seconds: 20 * 60 });
  });

  it('returns nothing for a user with no history', () => {
    expect(buildHistoryEntries({ ownRows: [], otherRows: [], now: NOW })).toEqual([]);
  });

  it('orders entries newest first by the user’s own join', () => {
    const older: MeetingRecord = { ...MEETING, id: 'meeting-0', code: 'zzz-2222-yyy' };

    const entries = buildHistoryEntries({
      ownRows: [
        ownRow({ meeting: older, joinedAt: '2026-08-13T09:00:00.000Z' }),
        ownRow({ joinedAt: '2026-08-14T11:00:00.000Z' }),
      ],
      otherRows: [],
      now: NOW,
    });

    expect(entries.map((entry) => entry.code)).toEqual(['abc-defg-hjk', 'zzz-2222-yyy']);
  });
});

describe('buildHistoryEntries — duration', () => {
  it('reports a live call as in-progress rather than inventing a number', () => {
    // The failure this state exists to prevent: falling through to expires_at here
    // would render a duration derived from the 24-hour window.
    const entries = buildHistoryEntries({
      ownRows: [ownRow({ meeting: LIVE_MEETING, leftAt: null })],
      otherRows: [],
      now: NOW,
    });

    expect(entries[0]?.duration).toEqual({ status: 'in-progress' });
  });

  it('estimates from ended_at when the leave was never recorded', () => {
    const entries = buildHistoryEntries({
      ownRows: [ownRow({ leftAt: null })],
      otherRows: [],
      now: NOW,
    });

    // Marked estimated, not recorded — it can overstate by hours.
    expect(entries[0]?.duration).toEqual({ status: 'estimated', seconds: 30 * 60 });
  });

  it('falls back to expires_at when the meeting has no ended_at either', () => {
    const entries = buildHistoryEntries({
      ownRows: [
        ownRow({
          leftAt: null,
          meeting: { ...MEETING, endedAt: null, expiresAt: '2026-08-14T11:45:00.000Z' },
        }),
      ],
      otherRows: [],
      now: NOW,
    });

    expect(entries[0]?.duration).toEqual({ status: 'estimated', seconds: 45 * 60 });
  });

  it('an open row alongside a closed one still counts as open', () => {
    const entries = buildHistoryEntries({
      ownRows: [
        ownRow({ joinedAt: '2026-08-14T11:00:00.000Z', leftAt: '2026-08-14T11:05:00.000Z' }),
        ownRow({ meeting: LIVE_MEETING, joinedAt: '2026-08-14T11:09:00.000Z', leftAt: null }),
      ],
      otherRows: [],
      now: NOW,
    });

    expect(entries[0]?.duration).toEqual({ status: 'in-progress' });
  });

  it('clamps rather than reporting a negative duration', () => {
    // A token minted just before expiry produces a join after it — the same shape
    // that made the nightly sweep need a greatest() clamp.
    const entries = buildHistoryEntries({
      ownRows: [
        ownRow({
          joinedAt: '2026-08-14T11:50:00.000Z',
          leftAt: null,
          meeting: { ...MEETING, endedAt: null, expiresAt: '2026-08-14T11:45:00.000Z' },
        }),
      ],
      otherRows: [],
      now: NOW,
    });

    expect(entries[0]?.duration).toEqual({ status: 'estimated', seconds: 0 });
  });
});

describe('buildHistoryEntries — co-participants', () => {
  it('excludes the user’s own rows, including a rejoin’s', () => {
    const entries = buildHistoryEntries({
      ownRows: [ownRow()],
      otherRows: [
        otherRow({ identity: 'user:11111111-1111-4111-8111-111111111111', displayName: 'Ada' }),
        otherRow(),
      ],
      now: NOW,
    });

    expect(entries[0]?.otherNames).toEqual(['Grace']);
  });

  it('names a rejoining co-participant once', () => {
    const entries = buildHistoryEntries({
      ownRows: [ownRow()],
      otherRows: [
        otherRow({ joinedAt: '2026-08-14T11:05:00.000Z' }),
        otherRow({ joinedAt: '2026-08-14T11:12:00.000Z' }),
      ],
      now: NOW,
    });

    expect(entries[0]?.otherNames).toEqual(['Grace']);
  });

  it('keeps join order and ignores rows from other meetings', () => {
    const entries = buildHistoryEntries({
      ownRows: [ownRow()],
      otherRows: [
        otherRow({
          identity: 'guest:c',
          displayName: 'Third',
          joinedAt: '2026-08-14T11:15:00.000Z',
        }),
        otherRow({
          identity: 'guest:a',
          displayName: 'First',
          joinedAt: '2026-08-14T11:02:00.000Z',
        }),
        otherRow({ identity: 'guest:x', displayName: 'Elsewhere', meetingId: 'meeting-other' }),
      ],
      now: NOW,
    });

    expect(entries[0]?.otherNames).toEqual(['First', 'Third']);
  });

  it('leaves a solo meeting with no names rather than failing', () => {
    const entries = buildHistoryEntries({ ownRows: [ownRow()], otherRows: [], now: NOW });
    expect(entries[0]?.otherNames).toEqual([]);
  });
});

describe('splitParticipantNames', () => {
  it('shows every name when there is room', () => {
    expect(splitParticipantNames(['a', 'b', 'c'])).toEqual({ shown: ['a', 'b', 'c'], overflow: 0 });
  });

  it('collapses the tail of a full call into a count', () => {
    const names = Array.from({ length: 11 }, (_, index) => `p${index}`);
    const { shown, overflow } = splitParticipantNames(names);

    expect(shown).toEqual(['p0', 'p1', 'p2']);
    expect(overflow).toBe(8);
  });

  it('handles the empty case', () => {
    expect(splitParticipantNames([])).toEqual({ shown: [], overflow: 0 });
  });
});

describe('formatDuration', () => {
  it('formats as zero-padded HH:MM:SS, the design system’s own example', () => {
    expect(formatDuration(727)).toBe('00:12:07');
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('does not roll hours over at a day', () => {
    expect(formatDuration(25 * 3600)).toBe('25:00:00');
  });

  it('never renders a negative clock', () => {
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});
