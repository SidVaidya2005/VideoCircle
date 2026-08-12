import 'server-only';

import { z } from 'zod';

/**
 * Supabase's secret environment — never reaches the browser.
 *
 * `import 'server-only'` above is the build-time guard: importing this module from
 * a Client Component fails the build rather than shipping a service-role key to
 * every visitor. The value is consumed in exactly one place,
 * `src/lib/supabase/admin.ts`.
 *
 * **Secrets are parsed per service, not all together.** This module held the
 * LiveKit pair too until feature 06, and because it parses at module load, a route
 * that touches only Supabase failed to build whenever LiveKit was unconfigured —
 * `/api/meetings` does not call LiveKit and has no business depending on it. The
 * same coupling would bite in production: briefly misconfiguring a LiveKit key
 * during a rotation would take meeting creation down with it. LiveKit's own
 * secrets get their own module in feature 09, alongside the first code that needs
 * them.
 */
const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// `parse` rather than `safeParse`: a misconfigured deploy should fail at boot,
// loudly, instead of at the first request that needs a credential. Splitting by
// service keeps that loudness while narrowing who hears it.
export const serverEnv = ServerEnvSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
