import { meetingJoinability } from '@/lib/meeting-state';

/**
 * Turning participation rows into the entries Call History renders.
 *
 * Pure and free of `server-only`: the grouping, the duration decision and the
 * co-participant dedupe are the parts worth testing exhaustively, and the page
 * around them only does IO. Times arrive as ISO strings because that is what
 * Postgres returns, and `now` is a parameter so every boundary is testable
 * without a clock.
 */

/** One row of `meeting_participants`, as much of it as history needs. */
export interface ParticipationRecord {
  identity: string;
  displayName: string;
  joinedAt: string;
  leftAt: string | null;
}

export interface MeetingRecord {
  id: string;
  code: string;
  endedAt: string | null;
  expiresAt: string;
}

export interface OwnParticipation extends ParticipationRecord {
  meeting: MeetingRecord;
}

export interface OtherParticipation extends ParticipationRecord {
  meetingId: string;
}

/**
 * How long the user was in a meeting, and how well we know it.
 *
 * `estimated` is deliberately its own state rather than being folded into
 * `recorded`. It means the leave was never recorded and the end came from the
 * meeting instead, which can overstate the time by hours — someone who joined and
 * closed their laptop leaves a row that only expiry closes. Rendering that as an
 * exact figure would be the kind of confident wrong number nobody thinks to
 * question. It is also transient: `room_finished` and the nightly sweep both close
 * open rows, so this appears only in the window before either has run.
 */
export type HistoryDuration =
  | { status: 'in-progress' }
  | { status: 'recorded'; seconds: number }
  | { status: 'estimated'; seconds: number };

export interface HistoryEntry {
  meetingId: string;
  code: string;
  /** The user's first join, not the meeting's creation — this is *their* history. */
  startedAt: string;
  duration: HistoryDuration;
  /** Everyone else who was there, deduped, in join order. */
  otherNames: string[];
  /** Whether a Rejoin link may be offered. The same rule `/api/token` enforces. */
  joinable: boolean;
}

/** Beyond this, the rest collapse into a count. Keeps every row one height. */
export const MAX_VISIBLE_PARTICIPANT_NAMES = 3;

export function splitParticipantNames(names: readonly string[]): {
  shown: string[];
  overflow: number;
} {
  return {
    shown: names.slice(0, MAX_VISIBLE_PARTICIPANT_NAMES),
    overflow: Math.max(0, names.length - MAX_VISIBLE_PARTICIPANT_NAMES),
  };
}

function earliest(times: readonly string[]): string {
  return times.reduce((min, at) => (Date.parse(at) < Date.parse(min) ? at : min));
}

function latest(times: readonly string[]): string {
  return times.reduce((max, at) => (Date.parse(at) > Date.parse(max) ? at : max));
}

/**
 * Reuses the join rule rather than restating it, so the Rejoin link can never be
 * offered for a meeting `/api/token` would answer 410 for.
 */
function isJoinable(meeting: MeetingRecord, now: Date): boolean {
  return (
    meetingJoinability({ ended_at: meeting.endedAt, expires_at: meeting.expiresAt }, now) === 'open'
  );
}

function elapsedSeconds(from: string, to: string): number {
  // Clamped: a fallback end can precede the join. /api/token only checks expiry
  // when it MINTS, so a token issued just before `expires_at` produces a join
  // after it — the same shape that made the nightly sweep need a clamp.
  return Math.max(0, Math.floor((Date.parse(to) - Date.parse(from)) / 1000));
}

/**
 * The duration for one meeting, from every row the user has in it.
 *
 * An open row means they never left *that* session. Whether that reads as a live
 * call or as a lost leave event depends entirely on the meeting: if it is still
 * joinable the call is genuinely happening, and any number here would be invented.
 */
function resolveDuration(
  rows: readonly OwnParticipation[],
  meeting: MeetingRecord,
  now: Date,
): HistoryDuration {
  const firstJoin = earliest(rows.map((row) => row.joinedAt));
  const closed = rows.flatMap((row) => (row.leftAt === null ? [] : [row.leftAt]));
  const hasOpenRow = closed.length < rows.length;

  if (!hasOpenRow) {
    return { status: 'recorded', seconds: elapsedSeconds(firstJoin, latest(closed)) };
  }

  if (isJoinable(meeting, now)) {
    return { status: 'in-progress' };
  }

  return {
    status: 'estimated',
    seconds: elapsedSeconds(firstJoin, meeting.endedAt ?? meeting.expiresAt),
  };
}

/**
 * Groups participation rows into one entry per meeting, newest first.
 *
 * **One entry per meeting, not per row.** A rejoin — which a dropped connection
 * produces routinely — writes a second row, and showing it as a second meeting
 * with the same code and the same people reads as a bug rather than as history.
 * The span therefore runs from the user's first join to their last leave.
 *
 * `ownRows` are already scoped to the current user by the query. `otherRows` are
 * every participation row in those meetings, the user's own included; they are
 * filtered out here by identity, which covers a rejoiner's second identity without
 * needing to know the user's id.
 */
export function buildHistoryEntries(params: {
  ownRows: readonly OwnParticipation[];
  otherRows: readonly OtherParticipation[];
  now: Date;
}): HistoryEntry[] {
  const ownByMeeting = new Map<string, OwnParticipation[]>();
  for (const row of params.ownRows) {
    const existing = ownByMeeting.get(row.meeting.id);
    if (existing) existing.push(row);
    else ownByMeeting.set(row.meeting.id, [row]);
  }

  const entries = [...ownByMeeting.entries()].map(([meetingId, rows]) => {
    // Every row in the group carries the same meeting; the first is as good as any.
    const meeting = rows[0]?.meeting;
    if (!meeting) throw new Error(`history group for ${meetingId} is empty`);

    const ownIdentities = new Set(rows.map((row) => row.identity));
    const seen = new Set<string>();
    const otherNames: string[] = [];

    for (const row of [...params.otherRows]
      .filter((row) => row.meetingId === meetingId)
      .sort((a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt))) {
      if (ownIdentities.has(row.identity) || seen.has(row.identity)) continue;

      seen.add(row.identity);
      otherNames.push(row.displayName);
    }

    return {
      meetingId,
      code: meeting.code,
      startedAt: earliest(rows.map((row) => row.joinedAt)),
      duration: resolveDuration(rows, meeting, params.now),
      otherNames,
      joinable: isJoinable(meeting, params.now),
    };
  });

  return entries.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

/**
 * A duration as `HH:MM:SS`.
 *
 * The design system's own example for a duration (`00:12:07`), and it is why this
 * does not reuse `formatChatTime`'s terse `12m`: that formats an *age* that ticks,
 * where approximate is the point. A duration is a fixed measurement, the brand is a
 * terminal, and a monospace column of clock values scans in a way `12m` beside
 * `1h` does not.
 */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const parts = [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60];

  return parts.map((part) => String(part).padStart(2, '0')).join(':');
}
