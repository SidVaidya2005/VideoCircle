import { expect, test, type Page } from '@playwright/test';

import {
  createMeeting,
  liveTrackCounts,
  MIN_HIT_AREA,
  MOBILE,
  trackMediaAcquisition,
} from './support/media';

const cameraToggle = (page: Page) => page.getByRole('button', { name: /^camera (on|off)$/i });
const cameraPicker = (page: Page) => page.getByLabel('Camera', { exact: true });

test('turning the camera off releases the device, not just the picture', async ({
  page,
  request,
}) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);

  await cameraToggle(page).click();

  // The point of the whole design: zero live tracks means the hardware light is
  // off. A muted track would still read as 1 here and the test would fail, which
  // is exactly what it is for.
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await expect(page.locator('video')).toHaveCount(0);
  // Scoped to the paragraph: the toggle's own label is also "Camera off", and
  // matching it instead would pass without the preview frame saying anything.
  await expect(page.getByRole('paragraph').filter({ hasText: 'Camera off' })).toBeVisible();
  await expect(cameraToggle(page)).toHaveAttribute('aria-pressed', 'false');
});

test('turning the camera back on re-acquires exactly one track', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  await cameraToggle(page).click();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);

  await cameraToggle(page).click();
  await expect(page.locator('video')).toBeVisible();

  // Back to one, never two: the released track must not be left behind alongside
  // the new one.
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
  await expect(cameraToggle(page)).toHaveAttribute('aria-pressed', 'true');
});

test('the camera picker lists a real device with a label', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  const options = cameraPicker(page).locator('option');
  await expect.poll(async () => await options.count()).toBeGreaterThan(0);

  // Labels are empty until permission is granted, so a non-empty one proves the
  // enumeration ran at the right moment rather than on mount.
  const labels = await options.allTextContents();
  expect(labels.some((label) => label.trim().length > 0)).toBe(true);
});

test('selecting a camera keeps the preview running without a reload', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  // Marks this document instance. A navigation would wipe it, which is how the
  // test proves the track was replaced in place rather than by reloading.
  await page.evaluate(() => Object.defineProperty(window, '__sameDocument', { value: true }));

  const value = await cameraPicker(page).locator('option').first().getAttribute('value');
  await cameraPicker(page).selectOption(value ?? '');

  await expect(page.locator('video')).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
  expect(
    await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
  ).toBe(true);
});

test('device choices survive a reload', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  await cameraToggle(page).click();
  await expect(cameraToggle(page)).toHaveAttribute('aria-pressed', 'false');

  await page.reload();

  // Persisted, and honoured before any device is touched — someone who left with
  // the camera off must not have it opened again on the way back in.
  await expect(cameraToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('video')).toHaveCount(0);
});

test('the display name is capped at the shared maximum', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);

  const field = page.getByLabel('Your name');
  await field.fill('x'.repeat(80));

  // MAX_DISPLAY_NAME_LENGTH, enforced here and again by /api/token in the next
  // feature.
  expect(await field.inputValue()).toHaveLength(48);
});

test('every lobby control clears the 44px hit area at 360px', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.setViewportSize(MOBILE);
  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  const undersized = await page.evaluate((min) => {
    return [...document.querySelectorAll('a, button, select, input')]
      .map((el) => ({
        label: el.textContent?.trim().slice(0, 24) || el.getAttribute('aria-label') || el.tagName,
        box: el.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width > 0 && (box.height < min || box.width < min))
      .map(({ label, box }) => `${label} ${Math.round(box.width)}x${Math.round(box.height)}`);
  }, MIN_HIT_AREA);

  expect(undersized).toEqual([]);

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
