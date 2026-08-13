import { expect, test, type Page } from '@playwright/test';

import {
  createMeeting,
  liveTrackCounts,
  MIN_HIT_AREA,
  MOBILE,
  trackMediaAcquisition,
} from './support/media';

const mic = (page: Page) => page.getByRole('button', { name: /^(mute|unmute) microphone$/i });
const camera = (page: Page) => page.getByRole('button', { name: /^turn (on|off) camera$/i });
const leave = (page: Page) => page.getByRole('button', { name: 'Leave the meeting' });
const confirmLeave = (page: Page) =>
  page.getByRole('button', { name: 'Confirm leaving the meeting' });

async function joinAs(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(leave(page)).toBeVisible({ timeout: 20_000 });
}

test('the camera control releases the device, not just the picture', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(1);
  await expect(camera(page)).toHaveAttribute('aria-pressed', 'false');

  await camera(page).click();

  // Zero, not one: a muted track would still read as one here, and the hardware
  // light would still be on under a control that says off.
  await expect.poll(async () => (await liveTrackCounts(page)).video).toBe(0);
  await expect(camera(page)).toHaveAttribute('aria-pressed', 'true');
});

test('a camera turned off in the call reaches the other participant', async ({
  page,
  browser,
  request,
}) => {
  // Two real joins against LiveKit Cloud take most of the default budget before
  // this test's own assertions begin.
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    // Ada's tile on Grace's screen is the second one — Grace is pinned first.
    const adaTile = guest.getByRole('listitem').nth(1);
    await expect(adaTile.locator('video')).toHaveCount(1);

    await camera(page).click();

    // The tile stays and shows initials. Vanishing would read as leaving.
    await expect(adaTile.locator('video')).toHaveCount(0, { timeout: 15_000 });
    await expect(adaTile).toContainText('Ada Lovelace');
  } finally {
    await second.close();
  }
});

test('d and e toggle the microphone and camera', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('d');
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('d');
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');

  await page.keyboard.press('e');
  await expect(camera(page)).toHaveAttribute('aria-pressed', 'true');
});

test('a modified keystroke is not a shortcut', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // Cmd-D must stay a bookmark. The typing guard has no composer to prove it
  // against until F19, so it is unit-tested instead.
  await page.keyboard.press('Meta+d');
  await page.keyboard.press('Control+d');
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
});

test('Leave takes two presses', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');
  const roomUrl = page.url();

  await leave(page).click();

  // Armed, and still in the call — a misfired tap on a phone must not end it.
  await expect(confirmLeave(page)).toBeVisible();
  expect(page.url()).toBe(roomUrl);

  await confirmLeave(page).click();
  await page.waitForURL('/');
});

test('pressing another control disarms Leave', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await leave(page).click();
  await expect(confirmLeave(page)).toBeVisible();

  await mic(page).click();

  // An armed Leave must never sit waiting under a thumb that has moved on.
  await expect(confirmLeave(page)).toHaveCount(0);
  await expect(leave(page)).toBeVisible();
});

test('controls whose panels do not exist yet say they are unavailable', async ({
  page,
  request,
}) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  for (const name of ['Open chat', 'Show participants', 'Raise hand']) {
    await expect(page.getByRole('button', { name, disabled: true })).toBeVisible();
  }

  // Screen share is the one secondary control that acts, since F12. Absence still
  // means exactly one thing — your device cannot do this — which screen-share.spec
  // proves by removing the capability.
  await expect(page.getByRole('button', { name: 'Share your screen' })).toBeEnabled();
});

test('the phone bar keeps mic, camera, MORE and Leave', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await expect(mic(page)).toBeVisible();
  await expect(camera(page)).toBeVisible();
  await expect(leave(page)).toBeVisible();

  // The secondary three are off the bar, not merely narrower.
  await expect(page.getByRole('button', { name: 'Open chat' })).toBeHidden();

  await page.getByRole('button', { name: 'More options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Open chat' })).toBeVisible();
});

test('no control shrinks below the hit-area floor at 360px', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // Scoped to main for the same reason the route announcer is: Playwright's role
  // engine pierces shadow DOM, so an unscoped query also measures Next's dev-tools
  // badge, which is 32px and not ours.
  const boxes = await page
    .getByRole('main')
    .getByRole('button')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const { width, height } = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') ?? node.textContent, width, height };
      }),
    );

  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect.soft(box.width, `${box.label} width`).toBeGreaterThanOrEqual(MIN_HIT_AREA);
    expect.soft(box.height, `${box.label} height`).toBeGreaterThanOrEqual(MIN_HIT_AREA);
  }

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
