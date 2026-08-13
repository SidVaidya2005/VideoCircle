/**
 * A participant, reduced to what ordering needs.
 *
 * Structural rather than LiveKit's type so the decision is testable under Node,
 * where the unit suite runs without a DOM or a room.
 */
export interface SortableParticipant {
  isLocal: boolean;
  /** Milliseconds. Undefined for a participant LiveKit has not timestamped yet. */
  joinedAt?: number;
  /** The tiebreaker when two people are stamped the same millisecond. */
  identity: string;
}

/**
 * You first, then everyone else in the order they arrived.
 *
 * You lead because the list answers "who is here" for the person reading it, and
 * finding yourself in a scrolled list of twelve is a small indignity the sort can
 * remove for free.
 *
 * Identity breaks a tie: two people can be stamped the same millisecond, and an
 * unstable order would let rows swap places on any re-render. A missing timestamp
 * sorts last rather than first — an unstamped participant is one LiveKit has only
 * just seen.
 */
export function sortParticipants<T extends SortableParticipant>(participants: readonly T[]): T[] {
  return [...participants].sort((a, b) => {
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;

    const joined =
      (a.joinedAt ?? Number.MAX_SAFE_INTEGER) - (b.joinedAt ?? Number.MAX_SAFE_INTEGER);
    if (joined !== 0) return joined;

    return a.identity.localeCompare(b.identity);
  });
}
