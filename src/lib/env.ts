import { z } from 'zod';

/**
 * Public environment — the `NEXT_PUBLIC_*` values only.
 *
 * These are compiled into the client bundle and visible to anyone, so this module
 * is safe to import from a Server Component, a route handler, or a Client
 * Component alike. Secrets live in `env.server.ts`, which is `server-only`.
 *
 * The split is not stylistic. Next replaces non-public `process.env` reads with
 * `undefined` in the browser, so a single schema covering secrets would throw the
 * moment any client module imported it.
 */
// The protocol constraints are load-bearing, not decoration: a bare `z.url()`
// accepts "localhost:3000" — a syntactically valid URL whose scheme is "localhost" —
// which would sail through validation and then break every OAuth redirect and share
// link built from it.
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_LIVEKIT_URL: z.url({ protocol: /^wss$/ }),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;

// Next inlines NEXT_PUBLIC_* at build time only for statically written references,
// so each one is spelled out rather than spread from process.env.
export const env = PublicEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
});
