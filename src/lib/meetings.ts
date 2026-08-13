import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Looks up a meeting by its share code. Returns `null` when no such meeting exists.
 *
 * Goes through `supabaseAdmin` rather than the request-scoped server client because
 * RLS on `meetings` admits only an `authenticated` user who already holds a
 * participation row for it. A guest opening a share link has neither a session nor a
 * participation row, so the anon client would read nothing and *every* valid code
 * would look unknown. The admin client stays behind this module for that reason —
 * pages call this function instead of reaching for the service-role client
 * themselves, which keeps the boundary in `architecture.md` intact.
 *
 * Existence only, deliberately: `/api/token` re-reads the row at join time for
 * `ended_at` and `expires_at`, because a meeting can be closed by its last
 * participant between this page rendering and someone pressing Join.
 */
export async function findMeetingByCode(code: string): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    // Propagated, not swallowed. Returning null here would render "no such
    // meeting" for a database outage, sending someone to create a new meeting
    // when the one they were invited to is fine.
    console.error('[meetings] lookup failed', error);
    throw error;
  }

  return data;
}
