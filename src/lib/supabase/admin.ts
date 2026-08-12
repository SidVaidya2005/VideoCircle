import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import type { Database } from '@/types/database';

/**
 * Admin client — the ONLY consumer of the service-role key.
 *
 * The service role bypasses RLS entirely, which is why it exists here and
 * nowhere else: every write to `meetings` and `meeting_participants` goes
 * through it, because guests have no Supabase session and therefore no JWT to
 * write with. There are no insert/update/delete policies on those tables at all.
 *
 * Anything reached through this client is unfiltered. Scope every query by hand.
 *
 * No session persistence or token refresh: this is a server singleton with no
 * user attached, and either would be meaningless or actively confusing.
 */
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
