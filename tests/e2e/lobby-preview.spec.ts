import { expect, test } from '@playwright/test';

import {
  createMeeting,
  liveTrackCounts,
  MALFORMED_CODE,
  MOBILE,
  trackMediaAcquisition,
  UNKNOWN_CODE,
} from './support/media';

test('a real meeting code opens a lobby with a live self-preview', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);

  const video = page.locator('video');
  await expect(video).toBeVisible();

  // readyState >= HAVE_CURRENT_DATA plus real dimensions: proves frames are
  // arriving, which a merely-present <video> element does not.
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(await video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0);

  await expect(page.getByText(code)).toBeVisible();
});

test('the lobby never holds more than one track per device', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);

  // A second live track of either kind means an acquisition was orphaned — the
  // failure mode when a development double-mount resolves its request after its
  // own cleanup has already run, which leaves the camera light on.
  const live = await liveTrackCounts(page);
  expect(live.video).toBe(1);

  // Not asserted as exactly 1: audio capture hangs rather than resolving on some
  // machines, this one included, which is the behaviour the acquisition timeout
  // exists for. The leak this test guards is duplicates, not absence.
  expect(live.audio).toBeLessThanOrEqual(1);
});

test('a well-formed code that names no meeting is not found', async ({ page }) => {
  const response = await page.goto(`/room/${UNKNOWN_CODE}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading')).toContainText('does not open a meeting');
  await expect(page.locator('video')).toHaveCount(0);
});

test('a malformed code is not found', async ({ page }) => {
  const response = await page.goto(`/room/${MALFORMED_CODE}`);

  expect(response?.status()).toBe(404);
  await expect(page.locator('video')).toHaveCount(0);
});

test('the lobby has no horizontal overflow at 360px', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.setViewportSize(MOBILE);
  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});
