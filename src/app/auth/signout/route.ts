import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Ends the session and returns the user Home.
 *
 * **POST only, deliberately.** A GET signout is a link, and a link is fetched by
 * `next/link` prefetch, by a browser's speculative loading, and by any `<img>` on
 * any site the user happens to visit — all of which would sign them out without an
 * action. Requiring POST means the request has to come from our own form.
 *
 * 303, not the 307 `NextResponse.redirect` defaults to: 307 preserves the method,
 * which would re-issue this as `POST /` and answer 405.
 */
export async function POST() {
  const supabase = await createClient();

  // Failure here is not worth blocking on. signOut() clears the cookie locally even
  // when revoking the session server-side fails, and leaving the user staring at an
  // error on a surface that says "signed in" is worse than the stale server session,
  // which expires on its own.
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[auth/signout] sign out failed', error);
  }

  return NextResponse.redirect(new URL('/', env.NEXT_PUBLIC_SITE_URL), { status: 303 });
}
