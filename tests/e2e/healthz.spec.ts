import { expect, test } from '@playwright/test';

/**
 * The health check, and the two things about it that can silently stop being true.
 */

test('healthz answers 200 without touching a dependency', async ({ request }) => {
  const response = await request.get('/healthz');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

// That the proxy does not run on this path is asserted in
// `tests/unit/proxy-matcher.test.ts`, against the matcher itself. The obvious
// version of that check here — request it and expect no `sb-` cookie — passes
// whether the proxy runs or not, because there is no session to refresh on an
// anonymous request. It was written, seen to pass with the exclusion removed, and
// replaced.
