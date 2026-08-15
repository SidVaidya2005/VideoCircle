import { apiOk } from '@/lib/api';

/**
 * Liveness: is this process serving HTTP. Nothing more.
 *
 * **It deliberately does not check Supabase or LiveKit**, which is the opposite of
 * Render's own advice that a health check should verify its dependencies. That
 * advice assumes restarting the instance can fix the dependency. Here it cannot,
 * and would actively hurt: a free Supabase project pauses after ~7 days idle
 * (`constraints.md` → Hosting), so a readiness check would fail, Render would
 * restart the instance after 60 seconds of failures, and the restart would not
 * wake Supabase — a restart loop that takes the whole app down over a database
 * that a single request would have revived.
 *
 * Reading no dependency is also what lets this stay outside `src/app/api/`: there
 * is nothing to authorize, parse, or delegate. It is infrastructure, not product
 * API. It still answers in the project's one response shape, because a second
 * shape is how response handling drifts.
 *
 * `render.yaml` deliberately does **not** point `healthCheckPath` here — see the
 * comment there.
 */
export async function GET() {
  return apiOk({ status: 'ok' });
}
