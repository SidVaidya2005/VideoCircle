import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session refresh, called from `src/middleware.ts` on every non-static request,
 * so a page never renders against an expired token.
 *
 * NOT marked `server-only`, and it does not import `@/lib/env`. This runs in the
 * Edge runtime under a bundle-size budget, and importing the Zod-parsed env
 * module would pull Zod in with it. Both values read here are `NEXT_PUBLIC_` and
 * inlined at build time, so nothing is lost but the parse. This is the single
 * sanctioned exception to reading `process.env` outside `src/lib/env*.ts` — see
 * code-standards.md → Environment Variables.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }

          // The second argument is not optional in spirit. When auth cookies are
          // set, @supabase/ssr passes the no-store cache directives that stop a CDN
          // or reverse proxy from caching this response and later serving one
          // user's session token to somebody else. Dropping it is silent until it
          // is catastrophic.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getUser(), never getSession(): getUser revalidates against the auth server,
  // getSession trusts whatever the cookie claims. This call is also what triggers
  // the refresh — its return value is deliberately unused here.
  await supabase.auth.getUser();

  return response;
}
