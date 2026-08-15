import { describe, expect, it } from 'vitest';

import { config } from '@/proxy';

/**
 * The proxy's matcher, tested as the regex Next actually compiles it into.
 *
 * This exists because the obvious e2e assertion — request `/healthz` and check no
 * `sb-` cookie comes back — is **vacuously green**. `updateSession` only sets
 * auth cookies when there is a session to refresh, so an anonymous request sets
 * none whether the proxy ran or not. That test passed with the exclusion removed,
 * which is the definition of a test that looks at nothing.
 *
 * The matcher is read from `src/proxy.ts` rather than restated here, so the
 * pattern has exactly one home and this cannot drift from what ships.
 */

function matches(path: string): boolean {
  return config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path));
}

describe('proxy matcher', () => {
  it('excludes the health check', () => {
    // Excluded so a liveness probe does not cost a Supabase auth round trip, and
    // does not inherit a dependency that can fail.
    expect(matches('/healthz')).toBe(false);
  });

  it('still covers every route that renders against a session', () => {
    for (const path of ['/', '/history', '/room/abc-defg-hjk', '/auth/callback', '/api/token']) {
      expect(matches(path), path).toBe(true);
    }
  });

  it('still excludes static assets', () => {
    for (const path of ['/_next/static/chunk.js', '/favicon.ico', '/brand/mark.svg']) {
      expect(matches(path), path).toBe(false);
    }
  });
});
