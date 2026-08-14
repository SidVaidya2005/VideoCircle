import { expect, test } from '@playwright/test';

/**
 * The client half of Google sign-in, without Google.
 *
 * **Why this exists.** Feature 22 moved the Supabase browser client behind a
 * dynamic `import()` inside `signInWithGoogle`, because a static one put the whole
 * GoTrue client into the first-load bundle of a page most visitors use without an
 * account. That is a bundle win over the one path in the product with no automated
 * coverage at all: a dynamic import that failed to resolve would break sign-in and
 * nothing would have gone red.
 *
 * The consent screen is still Google's and still undrivable — see
 * `support/session.ts` for how signed-in *pages* are tested. What is provable here
 * is everything up to the moment we hand off: the button works, the module loads,
 * the client is constructed, and the request that leaves carries the redirect this
 * project's constraints require. The authorize call is intercepted rather than
 * followed, so no real OAuth round trip is started.
 */

const AUTHORIZE = '**/auth/v1/authorize*';

test('pressing Sign in reaches Supabase with the configured redirect', async ({ page }) => {
  const authorizeUrls: string[] = [];

  // Answered 204, not followed and not aborted. Following it would navigate to
  // accounts.google.com and make this a test of Google's uptime; aborting it makes
  // Chrome navigate to its own error page, which raced a later `goto` under
  // parallel load. A 204 to a top-level navigation leaves the current document
  // exactly where it is, so there is no navigation to race at all.
  await page.route(AUTHORIZE, async (route) => {
    authorizeUrls.push(route.request().url());
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Polled: the click now awaits a dynamic import before any request is made, so
  // reading the array once would race the chunk fetch — which is precisely the
  // behaviour under test.
  await expect.poll(() => authorizeUrls.length).toBeGreaterThan(0);

  const authorize = new URL(authorizeUrls[0] ?? '');
  expect(authorize.searchParams.get('provider')).toBe('google');

  // Resolved against NEXT_PUBLIC_SITE_URL, never window.location.origin: Render
  // terminates TLS at a proxy, and exactly one redirect URL is allow-listed in the
  // Supabase dashboard. `next` carries the path to return to, and — the part that
  // matters most — never the chat key.
  const redirectTo = new URL(authorize.searchParams.get('redirect_to') ?? '');
  expect(redirectTo.pathname).toBe('/auth/callback');
  expect(redirectTo.searchParams.get('next')).toBe('/');
});

test('the chat key is stashed for the round trip, never put in the redirect', async ({ page }) => {
  const authorizeUrls: string[] = [];
  await page.route(AUTHORIZE, async (route) => {
    authorizeUrls.push(route.request().url());
    await route.fulfill({ status: 204, body: '' });
  });

  // A fragment on the page we sign in from. Not a real key — nothing here imports
  // one — but it is what the stash logic keys on and what must not travel.
  const fragment = '#k=ZmFrZS1rZXktZm9yLXRoZS1zdGFzaC10ZXN0';
  await page.goto(`/${fragment}`);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect.poll(() => authorizeUrls.length).toBeGreaterThan(0);

  // The invariant, asserted against the whole URL rather than one parameter: the
  // key may appear in no part of anything that leaves the browser.
  expect(authorizeUrls[0]).not.toContain('ZmFrZS1rZXktZm9y');

  // Read straight off the still-current document: the 204 above means the page
  // never left the origin, so `sessionStorage` is reachable and this is the same
  // tab that wrote the stash.
  //
  // And it survived where it is supposed to — sessionStorage, same-origin and
  // same-tab, which is the one permitted detour from "the key lives in the hash".
  const stashed = await page.evaluate(() => sessionStorage.getItem('vc.pending-chat-key'));
  expect(stashed).toBe(fragment);
});
