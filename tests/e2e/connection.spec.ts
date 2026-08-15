import { expect, test, type Page } from '@playwright/test';

import { createMeeting, stubDisplayMedia } from './support/media';
import { CONNECT_TIMEOUT_MS, connectedStatus, joinAs } from './support/join';
import { readReconnectEvidence, recordReconnectEvidence } from './support/reconnect';

/**
 * What a call does while it is degrading, recovering, or over.
 *
 * `call-grid.spec.ts` already proves the room tree survives a blip. These are the
 * claims F23 adds on top: that the recovery is *visible*, that it is visible even
 * while sharing, and — the one that decided whether restoration code exists at all
 * — that mic intent survives the round trip.
 */

const mic = (page: Page) => page.getByRole('button', { name: /^(mute|unmute) microphone$/i });
const banner = (page: Page) => page.getByText('Reconnecting');

/**
 * Attaches the recording to whichever test installed one, however that test ended.
 *
 * In an `afterEach` rather than a `finally` around the assertion, because the
 * first instrumented run died at the *reconnect banner* — well before the mic
 * assertion — and took its evidence with it. A failure anywhere in the test is
 * exactly when the recording is worth having.
 */
test.afterEach(async ({ page }, testInfo) => {
  const evidence = await readReconnectEvidence(page).catch(() => null);
  if (!evidence) return; // This test did not install the recorder.

  await testInfo.attach('reconnect-evidence', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
});

test('the reconnect banner appears while recovering and clears afterwards', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
  await expect(connectedStatus(page)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });

  await context.setOffline(true);
  await expect(banner(page)).toBeVisible({ timeout: 30_000 });

  // The banner says more than the state name. A person watching frozen video
  // needs to know the call is coming back, not just read a word it could as
  // easily be stuck on.
  await expect(page.getByText('trying to restore the connection')).toBeVisible();

  // Never disabled while reconnecting — this is exactly when it is reached for.
  await expect(page.getByRole('button', { name: 'Leave' })).toBeEnabled();

  await context.setOffline(false);
  await expect(connectedStatus(page)).toBeVisible({ timeout: 30_000 });
  await expect(banner(page)).toBeHidden();
});

test('a reconnect during a screen share is still visible', async ({
  page,
  browser,
  context,
  request,
}) => {
  test.setTimeout(120_000);

  const code = await createMeeting(request);
  await stubDisplayMedia(page);

  // Two participants, because a share published into an empty room is unpublished
  // again within about a second roughly half the time — a known LiveKit behaviour
  // recorded in constraints.md, and one that would make this test flake for a
  // reason that has nothing to do with what it is asserting.
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
    await joinAs(guest, code, 'Grace Hopper', { until: 'mounted' });

    await page.getByRole('button', { name: 'Share your screen' }).click();
    await expect(page.getByText('Sharing your screen')).toBeVisible({ timeout: 20_000 });

    // The regression this exists for: `CallStatus` used to check sharing first, so
    // the strip kept saying "Sharing your screen" through an entire reconnect. The
    // state the person already chose was hiding the one they needed.
    await context.setOffline(true);
    await expect(banner(page)).toBeVisible({ timeout: 30_000 });

    // And it hands the strip back afterwards. NOT "Connected": a call you are
    // presenting to is a connected call, so the sharing line is what a recovered
    // share is supposed to show — the two never appear at once, which is what
    // keeps the strip one line at 360px.
    await context.setOffline(false);
    await expect(page.getByText('Sharing your screen')).toBeVisible({ timeout: 30_000 });
    await expect(banner(page)).toBeHidden();
  } finally {
    await second.close();
  }
});

test('a call that cannot recover ends in a notice, not silently at Home', async ({
  page,
  context,
  request,
}) => {
  // Outlasting LiveKit's own retry budget is the only way to reach a terminal
  // disconnect without a test-only path through production code.
  test.setTimeout(180_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
  await expect(connectedStatus(page)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });

  await context.setOffline(true);

  // The regression this exists for: every disconnect used to push Home, so a
  // dropped call left you on the landing page unable to tell whether you had left
  // or been dropped, with no way back except finding the link again.
  //
  // Anchored on Rejoin, not on `getByRole('alert')`: Next injects its own
  // route-announcer alert outside `main`, so an unscoped alert query resolves
  // instantly against markup that is not ours and the real wait never happens.
  await expect(page.getByRole('button', { name: 'Rejoin' })).toBeVisible({ timeout: 150_000 });
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();

  // Still on the room URL. Being pushed Home is precisely what this replaces.
  expect(new URL(page.url()).pathname).toBe(`/room/${code}`);
});

test('a muted microphone is still muted after a reconnect', async ({ page, context, request }) => {
  test.setTimeout(90_000);

  // This test fails about once in eighteen runs and the assertion alone cannot say
  // why: a resume and a full restart are different code paths, and only the
  // restart republishes tracks. The recording below is what tells them apart, and
  // it is attached on every run so the rare red one arrives already diagnosed.
  await recordReconnectEvidence(page);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
  await expect(connectedStatus(page)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });

  // aria-pressed rather than the accessible name: the control is a toggle and
  // `aria-pressed` is what it exposes as its state, so this asserts the thing a
  // screen reader would be told.
  await mic(page).click();
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');

  await context.setOffline(true);
  await expect(banner(page)).toBeVisible({ timeout: 30_000 });

  await context.setOffline(false);
  await expect(connectedStatus(page)).toBeVisible({ timeout: 30_000 });

  // The build plan assumed this needs restoring code. Whether it does is exactly
  // what this asserts: coming back unmuted from a network blip you did not choose
  // means saying something to a room you thought could not hear you.
  //
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
});
