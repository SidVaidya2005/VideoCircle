/**
 * Whether a meeting can still be joined, and if not, why.
 *
 * Deliberately free of `server-only` and of any database import: it is the one
 * piece of join logic worth testing exhaustively, and a module that reaches for
 * Supabase could only be tested against a live database. The route handler does
 * the IO and hands the row here.
 */
export type MeetingJoinability = 'open' | 'ended' | 'expired';

export interface MeetingState {
  ended_at: string | null;
  expires_at: string;
}

/**
 * `ended` is checked before `expired` because it is the more specific truth: a
 * meeting that finished and then sat past its expiry is both, and "this meeting
 * has ended" is what actually happened. The reverse order would tell someone
 * their link expired when the call simply finished without them.
 */
export function meetingJoinability(meeting: MeetingState, now: Date): MeetingJoinability {
  if (meeting.ended_at !== null) return 'ended';
  if (new Date(meeting.expires_at) <= now) return 'expired';
  return 'open';
}
