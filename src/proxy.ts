import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

/**
 * Next 16 renamed the `middleware` file convention to `proxy`. A pure rename —
 * the file name and the exported function name changed, nothing else — but the
 * old name printed a deprecation notice on every build.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets and image files. The session cookie has to be
  // fresh before any page renders, and a page can be reached from any route.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
