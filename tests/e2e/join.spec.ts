import { expect, test } from '@playwright/test';

import { createMeeting, liveTrackCounts, MOBILE, trackMediaAcquisition } from './support/media';

/**
 * These connect to LiveKit Cloud for real. Mocking the SFU would mean testing the
 * mock, which is precisely the layer that does not break.
 */
test('pressing Join connects to the room', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill('Joiner');
  await page.getByRole('button', { name: 'Join now' }).click();

  await expect(page.getByText('Connected', { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible();
});

test('the preview is released before the room connects', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);

  await page.getByLabel('Your name').fill('Joiner');
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible({ timeout: 20_000 });

  // The room acquires its own camera, so one live track is expected — but never
  // two. A leaked preview track holds the device the room is asking for and, on
  // some hardware, stops it acquiring at all.
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBeLessThanOrEqual(1);
});

test('Leave returns to Home', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill('Leaver');
  await page.getByRole('button', { name: 'Join now' }).click();

  const leave = page.getByRole('button', { name: 'Leave' });
  await expect(leave).toBeVisible({ timeout: 20_000 });
  await leave.click();

  await page.waitForURL('/');
  await expect(page.getByRole('heading', { name: 'VideoCircle' })).toBeVisible();
});

test('a meeting that never existed explains itself instead of hanging', async ({ page }) => {
  // Reached by opening a real lobby and having the meeting vanish underneath —
  // simulated here by pointing the page at a code the database has never seen,
  // which is the same race the 404 branch exists for.
  const code = await createMeeting(page.request);
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill('Racer');

  // Intercept so the server answers as it would for a meeting closed between the
  // page rendering and Join being pressed.
  await page.route('**/api/token', (route) =>
    route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'meeting_ended', message: 'This meeting has ended.' },
      }),
    }),
  );

  await page.getByRole('button', { name: 'Join now' }).click();

  // Scoped to main: Next injects its own role="alert" route announcer into the
  // document, so an unscoped query matches two elements.
  await expect(page.getByRole('main').getByRole('alert')).toContainText('This meeting has ended.');
  // No retry for a meeting that is gone — the only thing left to do is start one.
  await expect(page.getByRole('link', { name: 'Start a new meeting' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});

test('a transient failure offers a retry', async ({ page, request }) => {
  const code = await createMeeting(request);
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill('Retrier');

  await page.route('**/api/token', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'token_failed', message: 'Could not join the meeting. Please try again.' },
      }),
    }),
  );

  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

  // Retry returns to the lobby rather than a blank screen, with the controls
  // still there.
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Join now' })).toBeEnabled();
});

test('Join is unavailable until a name is entered', async ({ page, request }) => {
  const code = await createMeeting(request);
  await page.goto(`/room/${code}`);

  const join = page.getByRole('button', { name: 'Join now' });
  await expect(join).toBeDisabled();

  await page.getByLabel('Your name').fill('   ');
  await expect(join).toBeDisabled();

  await page.getByLabel('Your name').fill('Real Name');
  await expect(join).toBeEnabled();
});

test('the lobby still fits a phone with the Join control present', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.setViewportSize(MOBILE);
  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
