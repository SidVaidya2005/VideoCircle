import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  createMeeting,
  liveTrackCounts,
  MIN_HIT_AREA,
  MOBILE,
  trackMediaAcquisition,
} from './support/media';

const cameraToggle = (page: Page) => page.getByRole('button', { name: /^camera (on|off)$/i });
const cameraPicker = (page: Page) => page.getByLabel('Camera', { exact: true });
const micToggle = (page: Page) => page.getByRole('button', { name: /^mic (on|off)$/i });
// The toggle says "Mic" and the picker says "Microphone", so these cannot collide
// — but `exact` regardless, per the substring trap `support/join.ts` documents.
const microphonePicker = (page: Page) => page.getByLabel('Microphone', { exact: true });

/**
 * The options naming a device the browser actually enumerated.
 *
 * `DevicePicker` renders `No devices found` when it has none, and `System
 * default` before one is chosen — both non-empty *text* on an empty value. So
 * "some option has a label" is satisfied by a picker holding no devices at all,
 * which is how the camera version of this test read from F08 until F26, when
 * emptying the device list was seen not to fail it. A real device is the one
 * carrying a deviceId.
 */
const realDevices = (picker: Locator) => picker.locator('option:not([value=""])');

/**
 * Whether every label came from the browser rather than from our fallback.
 *
 * Labels are empty until media permission is granted, and `DevicePicker`
 * substitutes a numbered `Camera 1` / `Microphone 1` when that happens — so a
 * non-empty label proves nothing on its own. Enumeration running *before*
 * acquisition produces exactly the fallback, which is the bug these two tests
 * exist to catch, so the fallback shape is what must be absent.
 */
function everyLabelIsReal(labels: string[]): boolean {
  return labels.every((label) => !/^(Camera|Microphone) \d+$/.test(label.trim()));
}

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

  const options = realDevices(cameraPicker(page));
  await expect.poll(async () => await options.count()).toBeGreaterThan(0);

  expect(everyLabelIsReal(await options.allTextContents())).toBe(true);
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

/**
 * The microphone half of the lobby, which had no coverage at all until F26.
 *
 * The camera tests above already exercise the shared acquisition code, so these
 * exist for what is genuinely separate: `use-media-preview.ts` keeps its own
 * state, its own generation counter and its own acquire call per device, and the
 * combined request falls back to two independent ones precisely so a dead camera
 * cannot take a working microphone down with it.
 *
 * The reason this gap stayed open so long was a false one — a claim recorded
 * since F08 that `getUserMedia({audio:true})` hangs on this machine. `7.26.4`
 * measured it at 173ms. Nothing was ever blocking these.
 */
test('turning the mic off releases the device, not just mutes it', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(1);

  await micToggle(page).click();

  // Zero live audio tracks is the operating system's microphone indicator going
  // out, and that is the entire claim. A muted track still reads as 1 here — a
  // control saying OFF above a device the OS still shows as recording is the one
  // failure that destroys trust in a lobby, and it is invisible from inside the
  // browser. It also keeps the SDK's muted-track trap out of reach: `setDeviceId`
  // returns early on a muted track, so the picker below would silently stop
  // working.
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(0);
  await expect(micToggle(page)).toHaveAttribute('aria-pressed', 'false');
});

test('turning the mic back on re-acquires exactly one track', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  await micToggle(page).click();
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(0);

  await micToggle(page).click();

  // One, never two. The lobby leak fixed at `6.00.2` was exactly this shape — a
  // superseded request resolving, finding nothing cancelled, and being held
  // alongside the live one — and it survived the whole project because no test
  // had ever counted an audio track.
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(1);
  await expect(micToggle(page)).toHaveAttribute('aria-pressed', 'true');
});

test('the microphone picker lists a real device with a label', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  const options = realDevices(microphonePicker(page));
  await expect.poll(async () => await options.count()).toBeGreaterThan(0);

  expect(everyLabelIsReal(await options.allTextContents())).toBe(true);
});

test('selecting a microphone swaps it in place, without a reload', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(1);

  // Marks this document instance; a navigation would wipe it.
  await page.evaluate(() => Object.defineProperty(window, '__sameDocument', { value: true }));

  const value = await microphonePicker(page).locator('option').first().getAttribute('value');
  await microphonePicker(page).selectOption(value ?? '');

  // Still exactly one: the swap must release the old track rather than stack a
  // second one behind it.
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(1);
  expect(
    await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
  ).toBe(true);
});

test('device choices survive a reload', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.locator('video')).toBeVisible();

  await cameraToggle(page).click();
  await expect(cameraToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await micToggle(page).click();
  await expect(micToggle(page)).toHaveAttribute('aria-pressed', 'false');

  await page.reload();

  // Persisted, and honoured before any device is touched — someone who left with
  // the camera off must not have it opened again on the way back in. Both
  // devices, because they are stored under separate keys and restored by
  // separate branches: the microphone is the one where getting it wrong lights
  // the OS indicator for someone who explicitly turned it off.
  await expect(cameraToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(micToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('video')).toHaveCount(0);
  await expect.poll(async () => (await liveTrackCounts(page)).audio).toBe(0);
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
