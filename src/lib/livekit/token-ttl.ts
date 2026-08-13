/**
 * A token may never outlive the meeting it opens.
 *
 * Capped at one hour, or the time left before `expires_at`, whichever is smaller.
 * One hour is safe despite calls running longer: LiveKit proactively refreshes the
 * session token of a *connected* client, so this governs how long the token may be
 * used to **join**, not how long a call may last. A blip ninety minutes in
 * reconnects on the server-refreshed token, not this one.
 *
 * Pure and free of `server-only` so it can be tested directly — `token.ts` cannot,
 * since importing it requires the LiveKit secrets to be present.
 */
const MAX_TOKEN_TTL_SECONDS = 60 * 60;

export function tokenTtlSeconds(expiresAt: Date, now: Date): number {
  const remaining = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

  // Never zero. Callers reject an already-expired meeting before reaching here, so
  // a zero can only come from the sub-second remainder — and a zero TTL is read as
  // "no expiry" by some JWT implementations, which is the exact opposite of the
  // guarantee this function exists to make.
  return Math.max(1, Math.min(MAX_TOKEN_TTL_SECONDS, remaining));
}
