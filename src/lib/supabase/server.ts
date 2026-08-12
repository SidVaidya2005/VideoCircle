import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Server client — anon key plus the caller's session cookie, so RLS applies as
 * that user. This is the client for Server Components and route handlers that
 * read on a user's behalf.
 *
 * Never use it to write meeting data: guests have no session, so those writes go
 * through `supabaseAdmin`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // A Server Component cannot set cookies. Ignoring this is safe
            // because the proxy already refreshed the session on this request.
          }
        },
      },
    },
  );
}
