import 'server-only';

import { z } from 'zod';

/**
 * LiveKit's secret environment — never reaches the browser.
 *
 * A module of its own, beside `env.server.ts` rather than merged into it. Both
 * parse at import so a misconfigured deploy fails at boot rather than at the first
 * request, and that loudness is exactly why they must not share a schema: one
 * combined module makes every consumer fail on every *other* service's missing
 * credential. That is not hypothetical — these two keys lived in `env.server.ts`
 * until feature 06, where they stopped `/api/meetings` building at all, an endpoint
 * that never calls LiveKit. In production the same coupling would take meeting
 * creation down during a LiveKit key rotation.
 *
 * Consumed only by `src/lib/livekit/token.ts`, and by the webhook receiver when
 * feature 20 adds it.
 */
const LiveKitEnvSchema = z.object({
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
});

export type LiveKitEnv = z.infer<typeof LiveKitEnvSchema>;

export const livekitEnv = LiveKitEnvSchema.parse({
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
});
