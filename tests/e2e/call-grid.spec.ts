import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MOBILE } from './support/media';
import { CONNECT_TIMEOUT_MS, connectedStatus, joinAs } from './support/join';

const tiles = (page: Page) => page.getByRole('listitem');

test('two people in one room see each other', async ({ page, browser, request }) => {
  const code = await createMeeting(request);

  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
    await joinAs(guest, code, 'Grace Hopper', { until: 'mounted' });

    // Each sees two tiles: their own, pinned first, and the other's.
    await expect(tiles(page)).toHaveCount(2, { timeout: 20_000 });
    await expect(tiles(guest)).toHaveCount(2, { timeout: 20_000 });

    // You are labelled "You", never by your own typed name — and the other person
    // is named, which is what proves the remote tile is really theirs.
    await expect(tiles(page).first()).toContainText('You');
    await expect(tiles(page).nth(1)).toContainText('Grace Hopper');

    await expect(tiles(guest).first()).toContainText('You');
    await expect(tiles(guest).nth(1)).toContainText('Ada Lovelace');

    // The headcount agrees with the grid. It lives on the participants control
    // since F14 — the status strip's own count was removed rather than kept as a
    // second source that could disagree.
    await expect(page.getByRole('button', { name: 'Show participants (2)' })).toBeVisible();
  } finally {
    await second.close();
  }
});

test('a participant who leaves stops holding a tile', async ({ page, browser, request }) => {
  const code = await createMeeting(request);

  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
    await joinAs(guest, code, 'Grace Hopper', { until: 'mounted' });
    await expect(tiles(page)).toHaveCount(2, { timeout: 20_000 });

    // Two presses since F11: the first arms the control, the second disconnects.
    await guest.getByRole('button', { name: 'Leave the meeting' }).click();
    await guest.getByRole('button', { name: 'Confirm leaving the meeting' }).click();

    // Down to one tile, and back to the alone state — a tile left behind for
    // someone who has gone is indistinguishable from a frozen call.
    await expect(tiles(page)).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Show participants (1)' })).toBeVisible();
  } finally {
    await second.close();
  }
});

test('a camera-off participant keeps a named tile', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill('Ada Lovelace');
  // Off in the lobby, so the room is joined with no camera published at all —
  // the placeholder path, not the muted-publication one. The toggle names its
  // own state, so the accessible name is "Camera on" here.
  await page.getByRole('button', { name: /^camera (on|off)$/i }).click();
  await page.getByRole('button', { name: 'Join now' }).click();

  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible({ timeout: 20_000 });

  // The tile exists, carries the name, and shows no video. Without
  // withPlaceholder this count is zero: turning your camera off would delete you
  // from the grid rather than showing who you are.
  await expect(tiles(page)).toHaveCount(1);
  await expect(tiles(page).first()).toContainText('You');
  await expect(tiles(page).first().locator('video')).toHaveCount(0);
});

test('a dropped connection reconnects without tearing down the call', async ({
  page,
  context,
  request,
}) => {
  // Two offline transitions against a real SFU; the default budget is not enough
  // once the suite is running these in parallel.
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
  await expect(connectedStatus(page)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });

  await context.setOffline(true);
  await expect(page.getByText('Reconnecting')).toBeVisible({ timeout: 30_000 });

  // The tile survives the blip and the way out stays live. Unmounting the room
  // tree here would drop every attached video element and make adaptiveStream
  // rebuild its subscriptions from nothing — a transient blip rendered as a
  // full rejoin. Leave is never disabled: this is when it is reached for.
  await expect(tiles(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Leave' })).toBeEnabled();

  await context.setOffline(false);
  await expect(connectedStatus(page)).toBeVisible({ timeout: 30_000 });
  await expect(tiles(page)).toHaveCount(1);
});

test('the call has no horizontal overflow at 360px', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);

  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
