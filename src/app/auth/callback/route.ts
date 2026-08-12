import { NextResponse, type NextRequest } from 'next/server';

import { safeNext } from '@/lib/auth/safe-next';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * Completes the Google OAuth PKCE exchange and sends the user onward.
 *
 * This handler redirects rather than returning `apiOk`/`apiError`: it is navigated
 * to by the browser, not fetched, so a JSON body would render as text. The
 * response-shape rule governs the JSON API under `src/app/api/`.
 *
 * Every redirect resolves against `NEXT_PUBLIC_SITE_URL`, not `request.url`. Render
 * terminates TLS at a proxy, so the request's own origin is not reliably the public
 * one, and `X-Forwarded-Host` is caller-controlled and therefore no better.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const next = searchParams.get('next') ?? '/';

  // The provider reports refusals here, and by far the most common one is the user
  // pressing Cancel on the consent screen. That is a decision, not a fault, so it
  // goes quietly Home — an error banner after a deliberate cancel reads as a bug.
  const providerError = searchParams.get('error');
  if (providerError) {
    if (providerError !== 'access_denied') {
      console.error('[auth/callback] provider returned an error', providerError);
    }
    const destination = providerError === 'access_denied' ? '/' : '/?error=auth';
    return NextResponse.redirect(new URL(destination, siteUrl));
  }

  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // `next` is attacker-influenced — it is a query parameter on a URL anyone can
      // build and send. safeNext resolves and compares origins; see its module doc.
      return NextResponse.redirect(new URL(safeNext(next, siteUrl), siteUrl));
    }

    console.error('[auth/callback] code exchange failed', error);
  }

  return NextResponse.redirect(new URL('/?error=auth', siteUrl));
}
