import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';

/**
 * Browser client — anon key, used only for sign-in.
 *
 * Safe to import from a Client Component: `@/lib/env` holds `NEXT_PUBLIC_*`
 * values only. Secrets live in `@/lib/env.server`, which is `server-only` and
 * would fail the build if it ever reached here.
 */
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
