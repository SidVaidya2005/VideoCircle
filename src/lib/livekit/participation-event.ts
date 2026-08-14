/**
 * The two conversions a LiveKit webhook needs before its payload can become a
 * participation row.
 *
 * Pure and free of `server-only` for the same reason `meeting-state.ts` is: these
 * are the parts worth testing exhaustively, and `webhook.ts` cannot be imported
 * without the LiveKit secrets present. The route handler does the IO.
 */

/** `/api/token` is the only minter, and it builds `user:<uuid>` or `guest:<uuid>`. */
const USER_IDENTITY_PREFIX = 'user:';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The `profiles.id` behind a participant identity, or `null` for a guest.
 *
 * A `user:` prefix wrapping something that is not a UUID cannot come from
 * `/api/token`, so it means one of our own bugs. It still resolves to `null`
 * rather than throwing: an unparseable identity recorded as a guest costs one
 * wrong row in one person's history, whereas throwing would return `500` to a
 * webhook LiveKit then redelivers forever, and the retry can never parse any
 * better than the first attempt did.
 */
export function userIdFromIdentity(identity: string): string | null {
  if (!identity.startsWith(USER_IDENTITY_PREFIX)) return null;

  const candidate = identity.slice(USER_IDENTITY_PREFIX.length);
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * A LiveKit event timestamp — `bigint` seconds — as an ISO string Postgres takes.
 *
 * Every participation timestamp comes from this clock rather than `now()`, so a
 * delivery that arrives late, or succeeds only on its third retry, still records
 * when the thing actually happened. It is also what keeps the
 * `left_at >= joined_at` CHECK unreachable: both sides come from LiveKit, which
 * orders them, and mixing in a local `now()` is what would let a late-delivered
 * join land after an early-delivered leave.
 *
 * `0n` is proto3's default for an absent field, not a real 1970 timestamp, so it
 * falls back rather than writing a date fifty-six years wrong.
 */
export function eventTimestampIso(seconds: bigint, fallback: Date): string {
  if (seconds <= 0n) return fallback.toISOString();

  return new Date(Number(seconds) * 1000).toISOString();
}
