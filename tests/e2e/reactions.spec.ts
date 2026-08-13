import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MIN_HIT_AREA, MOBILE } from './support/media';

const reactionsControl = (page: Page) => page.getByRole('button', { name: /^Reactions/ });
const handToggle = (page: Page) => page.getByRole('button', { name: /^(Raise|Lower) hand$/ });

async function joinAs(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

test('a reaction lands on the sender’s tile and expires on its own', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await reactionsControl(page).click();
    await page.getByRole('button', { name: 'nice', exact: true }).click();

    // On Grace's screen it belongs to Ada's tile, not to Grace's own and not to
    // the grid at large. Grace is pinned first, so Ada is the second tile.
    const adaTile = guest.getByRole('listitem').nth(1);
    await expect(adaTile).toContainText('nice', { timeout: 15_000 });
    await expect(guest.getByRole('listitem').first()).not.toContainText('nice');

    // Gone on its own, with nobody touching anything.
    await expect(adaTile).not.toContainText('nice', { timeout: 15_000 });
  } finally {
    await second.close();
  }
});

test('a raised hand shows on the tile and in the list, on both sides', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await reactionsControl(page).click();
    await handToggle(page).click();

    // Ada's own tile, and Ada's tile as Grace sees it.
    await expect(page.getByRole('listitem').first()).toContainText('hand up');
    await expect(guest.getByRole('listitem').nth(1)).toContainText('hand up', {
      timeout: 15_000,
    });

    // And in the roster on Grace's side.
    await guest.getByRole('button', { name: /^show participants/i }).click();
    await expect(
      guest.getByRole('listitem').filter({ hasText: 'Ada Lovelace' }).last(),
    ).toContainText('hand up');

    // Lowering clears it everywhere.
    await handToggle(page).click();
    await expect(page.getByRole('listitem').first()).not.toContainText('hand up');
    await expect(guest.getByRole('listitem').nth(1)).not.toContainText('hand up', {
      timeout: 15_000,
    });
  } finally {
    await second.close();
  }
});

test('someone joining after a hand goes up still sees it', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const latecomer = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');

    await reactionsControl(page).click();
    await handToggle(page).click();
    await expect(page.getByRole('listitem').first()).toContainText('hand up');

    // The case the data channel cannot serve at all, and the whole reason
    // raise-hand rides a participant attribute: this join happens after the
    // message would have been sent, so an ephemeral one is simply gone.
    await joinAs(latecomer, code, 'Grace Hopper');
    await expect(latecomer.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await expect(latecomer.getByRole('listitem').nth(1)).toContainText('hand up', {
      timeout: 15_000,
    });
  } finally {
    await second.close();
  }
});

test('reactions are reachable and sized on a phone', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // Below sm: the popover would be a popover inside a menu, so the same actions
  // are flat items in MORE instead.
  await page.getByRole('button', { name: 'More options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Raise hand' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'nice' }).click();

  await expect(page.getByRole('listitem').first()).toContainText('nice');

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

test('the reactions popover clears the hit-area floor', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await reactionsControl(page).click();

  const undersized = () =>
    page
      .getByRole('dialog')
      .getByRole('button')
      .evaluateAll(
        (nodes, min) =>
          nodes
            .map((node) => ({
              label: node.textContent?.trim() ?? '',
              box: node.getBoundingClientRect(),
            }))
            .filter(({ box }) => box.height < min || box.width < min)
            .map(({ label, box }) => `${label} ${Math.round(box.width)}x${Math.round(box.height)}`),
        MIN_HIT_AREA,
      );

  await expect.poll(undersized).toEqual([]);
});
