import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MIN_HIT_AREA, MOBILE } from './support/media';

const participantsControl = (page: Page) =>
  page.getByRole('button', { name: /^(show|hide) participants/i });

const panelRows = (page: Page) => page.getByRole('listitem').filter({ hasText: /mic (on|off)/i });

async function joinAs(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

test('the panel lists everyone and marks your own row', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await participantsControl(page).click();

    await expect(panelRows(page)).toHaveCount(2);
    // Your own row carries your real name, unlike your tile, which reads YOU.
    // A list answering "who is here" should say who you are in it.
    await expect(panelRows(page).first()).toContainText('Ada Lovelace');
    await expect(panelRows(page).first()).toContainText('· you');
    await expect(panelRows(page).nth(1)).toContainText('Grace Hopper');
    // The marker is on your row only — otherwise it marks nothing.
    await expect(panelRows(page).nth(1)).not.toContainText('· you');
  } finally {
    await second.close();
  }
});

test('mic and camera state stay live without reopening the panel', async ({
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
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await participantsControl(page).click();
    const graceRow = panelRows(page).nth(1);
    await expect(graceRow).toContainText('mic on');
    await expect(graceRow).toContainText('cam on');

    await guest.getByRole('button', { name: 'Mute microphone' }).click();
    await guest.getByRole('button', { name: 'Turn off camera' }).click();

    // Rows read through useIsMuted per row, so they update where a snapshot of
    // participant state would have gone stale.
    await expect(graceRow).toContainText('mic off', { timeout: 15_000 });
    await expect(graceRow).toContainText('cam off', { timeout: 15_000 });
  } finally {
    await second.close();
  }
});

test('the badge counts everyone, and follows a join and a leave', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // The count lives in the accessible name because the badge itself is
  // aria-hidden — an aria-label overrides a button's contents.
  await expect(page.getByRole('button', { name: 'Show participants (1)' })).toBeVisible();

  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(guest, code, 'Grace Hopper');
    await expect(page.getByRole('button', { name: 'Show participants (2)' })).toBeVisible({
      timeout: 20_000,
    });

    await guest.getByRole('button', { name: 'Leave the meeting' }).click();
    await guest.getByRole('button', { name: 'Confirm leaving the meeting' }).click();

    await expect(page.getByRole('button', { name: 'Show participants (1)' })).toBeVisible({
      timeout: 20_000,
    });
  } finally {
    await second.close();
  }
});

test('the panel is a dialog on a phone and an aside on a desktop', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // Inline from lg: up — a real column beside the video, not an overlay.
  await participantsControl(page).click();
  await expect(page.getByRole('complementary', { name: 'Participants' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await participantsControl(page).click();
  await expect(page.getByRole('complementary', { name: 'Participants' })).toHaveCount(0);

  await page.setViewportSize(MOBILE);
  // Below sm: the secondary controls live in MORE, so this is the only way to
  // reach it on a phone — width decides placement, capability decides existence.
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: /show participants/i }).click();

  // Below lg: a real dialog: Radix traps focus, locks scroll and hides the rest
  // of the page from assistive tech — none of which a CSS class can do.
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Participants' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Close panel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the panel stays clean at 360px', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: /show participants/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  // Scoped to the dialog: it is portaled to document.body, so `main` does not
  // contain it, and an unscoped query picks up Next's 32px dev-tools badge —
  // Playwright's role engine pierces shadow DOM.
  const undersized = () =>
    page
      .getByRole('dialog')
      .getByRole('button')
      .evaluateAll(
        (nodes, min) =>
          nodes
            .filter((node) => node.getBoundingClientRect().width > 0)
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
