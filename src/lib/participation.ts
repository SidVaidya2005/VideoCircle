import 'server-only';

import { userIdFromIdentity } from '@/lib/livekit/participation-event';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Postgres unique-violation. See `JOIN_IS_IDEMPOTENT` for the one that matters here. */
const UNIQUE_VIOLATION = '23505';

/**
 * `meeting_participants.display_name` is `NOT NULL`, and `/api/token` validates the
 * name at `min(1)` before it can reach a token — so this is unreachable unless
 * LiveKit sends a participant with no name at all. A row with a placeholder name is
 * still a truthful record that someone was there; refusing the insert would lose
 * the participation entirely.
 */
const FALLBACK_DISPLAY_NAME = 'Guest';

/**
 * Writes the participation rows that call history is built from.
 *
 * Every function here is idempotent, which is what makes it safe for the webhook
 * route to answer `500` and let LiveKit redeliver. None of them decides whether the
 * meeting *should* have been joined: LiveKit is reporting what already happened, and
 * a call that ran past its expiry is explicitly allowed to drain, so a join is
 * recorded regardless of `ended_at` and `expires_at`.
 *
 * The caller resolves the meeting id and passes it in, so the room-code lookup
 * happens once per event rather than once per write.
 */

export type JoinOutcome = 'recorded' | 'duplicate';

/**
 * Inserts one participation row.
 *
 * **`JOIN_IS_IDEMPOTENT`.** There is no dedupe ledger: the partial unique index
 * `meeting_participants_open_row_idx on (meeting_id, identity) where left_at is null`
 * already says a participant has at most one *open* row per meeting, so a
 * redelivered join collides and is reported as `duplicate` rather than doubling the
 * row. A genuine rejoin after a clean leave does not collide — the earlier row is
 * closed — and correctly produces a second row.
 *
 * The one case this misses: a join redelivered *after* its own row was closed finds
 * nothing to collide with and inserts a spurious open row. That needs a retry to
 * outlive an entire participation, and the nightly sweep closes what it leaves.
 *
 * `is_guest` is deliberately absent from the insert — it is a generated column and
 * the database rejects any explicit value.
 */
export async function recordParticipantJoined(params: {
  meetingId: string;
  identity: string;
  displayName: string;
  joinedAt: string;
}): Promise<JoinOutcome> {
  const { error } = await supabaseAdmin.from('meeting_participants').insert({
    meeting_id: params.meetingId,
    identity: params.identity,
    user_id: userIdFromIdentity(params.identity),
    display_name: params.displayName.trim() || FALLBACK_DISPLAY_NAME,
    joined_at: params.joinedAt,
  });

  if (error?.code === UNIQUE_VIOLATION) {
    return 'duplicate';
  }
  if (error) {
    throw error;
  }

  return 'recorded';
}

export type LeaveOutcome = 'closed' | 'no_open_row';

/**
 * Closes the open row for one participant.
 *
 * Scoped with `left_at is null`, which is what makes a redelivery a no-op instead
 * of overwriting a leave time that was already correct. The partial unique index
 * guarantees the filter matches at most one row.
 *
 * `no_open_row` covers two different situations and neither is an error worth
 * retrying: the leave was already recorded, or the join was never recorded at all
 * (its delivery failed permanently). Retrying cannot create a join row, so the
 * caller logs and answers `200`.
 */
export async function recordParticipantLeft(params: {
  meetingId: string;
  identity: string;
  leftAt: string;
}): Promise<LeaveOutcome> {
  const { data, error } = await supabaseAdmin
    .from('meeting_participants')
    .update({ left_at: params.leftAt })
    .eq('meeting_id', params.meetingId)
    .eq('identity', params.identity)
    .is('left_at', null)
    .select('id');

  if (error) {
    throw error;
  }

  return data.length > 0 ? 'closed' : 'no_open_row';
}

export interface CloseMeetingOutcome {
  participantsClosed: number;
  meetingClosed: boolean;
}

/**
 * Ends a meeting and reconciles anyone still recorded as present.
 *
 * The participation rows are closed *before* `ended_at` is set, mirroring the
 * nightly sweep. The two writes are not in one transaction and do not need to be:
 * each is scoped so re-running it is a no-op, so a failure between them fails the
 * whole request, LiveKit redelivers, and the second write completes while the first
 * matches nothing.
 *
 * Closing the open rows is the reconciliation for a dropped `participant_left` —
 * which is exactly what a killed browser tab produces.
 *
 * **No `greatest(joined_at, …)` clamp here, deliberately, even though the nightly
 * sweep needs one against the same `left_at >= joined_at` CHECK.** The difference is
 * whose clock each one compares. The sweep sets `left_at` from `meetings.expires_at`,
 * a Postgres value, against a `joined_at` that came from LiveKit — two clocks, so
 * nothing orders them and a late joiner can land after expiry. Here both sides are
 * LiveKit's: a participant joined before the room they were in finished, and both
 * timestamps come from the same source, so the ordering is a fact rather than a
 * hope. Adding a clamp anyway would suggest the two cases are the same, and the next
 * reader would take the sweep's clamp for style rather than for the bug it fixes.
 */
export async function closeMeeting(params: {
  meetingId: string;
  endedAt: string;
}): Promise<CloseMeetingOutcome> {
  const { data: closedRows, error: participantsError } = await supabaseAdmin
    .from('meeting_participants')
    .update({ left_at: params.endedAt })
    .eq('meeting_id', params.meetingId)
    .is('left_at', null)
    .select('id');

  if (participantsError) {
    throw participantsError;
  }

  const { data: closedMeeting, error: meetingError } = await supabaseAdmin
    .from('meetings')
    .update({ ended_at: params.endedAt })
    .eq('id', params.meetingId)
    .is('ended_at', null)
    .select('id');

  if (meetingError) {
    throw meetingError;
  }

  return {
    participantsClosed: closedRows.length,
    meetingClosed: closedMeeting.length > 0,
  };
}
