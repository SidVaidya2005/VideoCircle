'use client';

import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

/** Same-origin, same-tab, and cleared the moment it is consumed. */
const CHAT_KEY_STASH = 'vc.pending-chat-key';

/**
 * Starts the Google OAuth round trip, returning to `returnTo` afterwards.
 *
 * `returnTo` is a path with an optional query string — never an origin, never a
 * fragment. It is re-validated server-side on the way back, because the callback
 * URL is something anyone can construct; see `@/lib/auth/safe-next`.
 *
 * Resolves against `NEXT_PUBLIC_SITE_URL` rather than `window.location.origin` so
 * that exactly one redirect URL needs allow-listing in the Supabase dashboard, and
 * so the origin here matches the one the callback handler redirects against.
 *
 * On success the browser navigates away and this never returns. A rejection is
 * therefore the only observable outcome, and it propagates to the caller to render.
 */
export async function signInWithGoogle(returnTo: string): Promise<void> {
  // The OAuth round trip destroys the fragment: our own JS navigates away, and the
  // provider redirects back to a URL it constructs. Carrying the key through `next`
  // or OAuth `state` would put it in a query string on a request that reaches both
  // Google and our server — exactly what the invariant forbids. sessionStorage never
  // leaves the browser, so the key survives without ever being transmitted. It is
  // transit only: the callback restores the fragment and deletes the entry, so the
  // key is still *read* from the hash and nowhere else.
  if (window.location.hash.startsWith('#k=')) {
    sessionStorage.setItem(CHAT_KEY_STASH, window.location.hash);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(returnTo)}`,
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Restores a chat-key fragment stashed before sign-in, without a navigation.
 *
 * Runs once on mount of the returned-to page, before anything reads the key. No
 * caller until F17 — the room page is what owns a fragment — but it ships with its
 * counterpart because a stash with no restorer, and a lost key generally, fail
 * silently: the call still works and only chat is quietly unreadable.
 */
export function restoreChatKeyFragment(): void {
  const stashed = sessionStorage.getItem(CHAT_KEY_STASH);
  if (!stashed) return;

  sessionStorage.removeItem(CHAT_KEY_STASH);

  // Never clobber a fragment already on the URL — that one is authoritative and
  // the stash is stale.
  if (!window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search + stashed);
  }
}
