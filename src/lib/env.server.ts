import 'server-only';

import { z } from 'zod';

/**
 * Secret environment — never reaches the browser.
 *
 * `import 'server-only'` above is the build-time guard: importing this module from
 * a Client Component fails the build rather than shipping a service-role key to
 * every visitor. The values themselves are consumed in exactly one place each —
 * `SUPABASE_SERVICE_ROLE_KEY` in `src/lib/supabase/admin.ts`, the LiveKit pair in
 * `src/lib/livekit/token.ts` and `src/lib/livekit/webhook.ts`.
 */
const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// `parse` rather than `safeParse`: a misconfigured deploy should fail at boot,
// loudly, instead of at the first request that needs a credential.
export const serverEnv = ServerEnvSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
});
