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
  // Everything except static assets, image files, and the health check. The
  // session cookie has to be fresh before any page renders, and a page can be
  // reached from any route.
  //
  // `healthz` is excluded because it answers "is this process up" and refreshing
  // a Supabase session to do so would put an auth round trip — and a dependency
  // that can fail — inside the one endpoint whose whole value is answering
  // cheaply and unconditionally.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|healthz|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
