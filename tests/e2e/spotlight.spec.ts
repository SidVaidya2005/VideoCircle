import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MIN_HIT_AREA, MOBILE, stubDisplayMedia } from './support/media';

const tiles = (page: Page) => page.getByRole('listitem');

async function joinAs(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  // Connected, not merely mounted — a share requested mid-handshake publishes
  // into a room that is not there yet.
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

/**
 * Spotlight renders a list named for the focused participant; the grid renders one
 * named for all of them. Counting lists would not work — with nobody else in the
 * call the filmstrip is empty and only one list renders either way.
 */
function isSpotlight(page: Page): Promise<boolean> {
  return page
    .getByRole('list', { name: 'Focused participant' })
    .count()
    .then((count) => count === 1);
}

test('double-click pins a tile and pins it back off', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  expect(await isSpotlight(page)).toBe(false);

  await tiles(page).first().dblclick();

  expect(await isSpotlight(page)).toBe(true);
  await expect(tiles(page).first()).toContainText('pinned');

  await tiles(page).first().dblclick();

  expect(await isSpotlight(page)).toBe(false);
  await expect(page.getByText('pinned')).toHaveCount(0);
});

test('the tile menu pins without a pointer gesture', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // The gesture is a double-click or long-press, which neither a keyboard nor a
  // screen reader can perform. This is the path that makes the gesture allowable.
  await page.getByRole('button', { name: /^Options for/ }).click();
  await page.getByRole('menuitem', { name: 'Pin' }).click();

  expect(await isSpotlight(page)).toBe(true);
  await expect(tiles(page).first()).toContainText('pinned');

  await page
    .getByRole('button', { name: /^Options for/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: 'Unpin' }).click();

  expect(await isSpotlight(page)).toBe(false);
});

test('a share focuses itself and releases the layout when it stops', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  await stubDisplayMedia(page);
  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(tiles(guest)).toHaveCount(2, { timeout: 20_000 });
    expect(await isSpotlight(guest)).toBe(false);

    await page.getByRole('button', { name: 'Share your screen' }).click();
    await expect(tiles(guest)).toHaveCount(3, { timeout: 20_000 });

    // The receiver's layout switches on its own, with the share as the focus.
    expect(await isSpotlight(guest)).toBe(true);
    await expect(tiles(guest).first()).toContainText('Ada Lovelace — screen');

    // The sharer's own camera stays in the strip: you keep their face at exactly
    // the moment they are presenting and talking.
    await expect(tiles(guest).nth(1)).toContainText('You');
    await expect(tiles(guest).nth(2)).toContainText('Ada Lovelace');

    await page.getByRole('button', { name: 'Stop', exact: true }).click();

    await expect(tiles(guest)).toHaveCount(2, { timeout: 20_000 });
    expect(await isSpotlight(guest)).toBe(false);
  } finally {
    await second.close();
  }
});

test('a pin outranks a running share', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  await stubDisplayMedia(page);
  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(tiles(guest)).toHaveCount(2, { timeout: 20_000 });

    await page.getByRole('button', { name: 'Share your screen' }).click();
    await expect(tiles(guest)).toHaveCount(3, { timeout: 20_000 });
    await expect(tiles(guest).first()).toContainText('— screen');

    // Grace pins her own camera while Ada's share is running. A deliberate choice
    // outranks an automatic one.
    const ownTile = tiles(guest).filter({ hasText: 'You' }).first();
    await ownTile.dblclick();

    await expect(tiles(guest).first()).toContainText('You');
    await expect(tiles(guest).first()).toContainText('pinned');
  } finally {
    await second.close();
  }
});

test('spotlight stays clean at 360px', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await tiles(page).first().dblclick();
  expect(await isSpotlight(page)).toBe(true);

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  // Polled rather than measured once: pinning re-mounts the tile, and
  // animate-tile-in runs a 700ms scale(0.96) that makes everything inside it
  // measure fractionally small while it plays. Polling waits that out and still
  // fails on a control that is genuinely undersized.
  //
  // Scoped to main because Playwright's role engine pierces shadow DOM and would
  // otherwise measure Next's dev-tools badge.
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
});
