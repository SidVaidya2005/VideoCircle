import { expect, test, type Page } from '@playwright/test';

import { joinAs } from './support/join';

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

test('the camera control releases the device, not just the picture', async ({ page, request }) => {
  await trackMediaAcquisition(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

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
    await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
    await joinAs(guest, code, 'Grace Hopper', { until: 'mounted' });
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
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

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
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

  // Cmd-D must stay a bookmark. The typing guard has no composer to prove it
  // against until F19, so it is unit-tested instead.
  await page.keyboard.press('Meta+d');
  await page.keyboard.press('Control+d');
  await expect(mic(page)).toHaveAttribute('aria-pressed', 'false');
});

test('Leave takes two presses', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
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
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

  await leave(page).click();
  await expect(confirmLeave(page)).toBeVisible();

  await mic(page).click();

  // An armed Leave must never sit waiting under a thumb that has moved on.
  await expect(confirmLeave(page)).toHaveCount(0);
  await expect(leave(page)).toBeVisible();
});

test('every control on the bar acts', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

  // No stubs remain: screen share stopped being one at F12, participants at F14,
  // reactions and raise hand at F15, chat at F17. A disabled control in a call is
  // a dead end under pressure, so the bar carries none.
  await expect(page.getByRole('button', { name: /^show chat/i })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^show participants/i })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^Reactions/ })).toBeEnabled();

  // Absence still means exactly one thing — your device cannot do this — which
  // screen-share.spec proves by removing the capability.
  await expect(page.getByRole('button', { name: 'Share your screen' })).toBeEnabled();

  const disabled = await page
    .getByRole('main')
    .getByRole('button')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.hasAttribute('disabled'))
        .map((node) => node.getAttribute('aria-label') ?? node.textContent?.trim() ?? ''),
    );
  expect(disabled).toEqual([]);
});

test('the phone bar keeps mic, camera, MORE and Leave', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

  await expect(mic(page)).toBeVisible();
  await expect(camera(page)).toBeVisible();
  await expect(leave(page)).toBeVisible();

  // The secondary controls are off the bar, not merely narrower.
  await expect(page.getByRole('button', { name: /^show chat/i })).toBeHidden();

  await page.getByRole('button', { name: 'More options' }).click();
  await expect(page.getByRole('menuitem', { name: /^show chat/i })).toBeVisible();
});

test('no control shrinks below the hit-area floor at 360px', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

  // Polled, not measured once: animate-tile-in runs a 700ms scale(0.96), so every
  // control inside a freshly mounted tile measures fractionally small while it
  // plays. Polling waits that out and still fails a genuinely undersized control.
  //
  // Scoped to main for the same reason the route announcer is: Playwright's role
  // engine pierces shadow DOM, so an unscoped query also measures Next's dev-tools
  // badge, which is 32px and not ours.
  const undersized = () =>
    page
      .getByRole('main')
      .getByRole('button')
      .evaluateAll(
        (nodes, min) =>
          nodes
            .map((node) => ({
              label: node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '',
              box: node.getBoundingClientRect(),
            }))
            .filter(({ box }) => box.height < min || box.width < min)
            .map(({ label, box }) => `${label} ${Math.round(box.width)}x${Math.round(box.height)}`),
        MIN_HIT_AREA,
      );

  await expect.poll(undersized).toEqual([]);
  expect(await page.getByRole('main').getByRole('button').count()).toBeGreaterThan(0);

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
