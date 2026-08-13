import { expect, test, type Page } from '@playwright/test';

import {
  blockDisplayMedia,
  createMeeting,
  dismissDisplayMedia,
  MOBILE,
  stopShareFromBrowser,
  stubDisplayMedia,
} from './support/media';

const shareControl = (page: Page) =>
  page.getByRole('button', { name: /^(share your screen|stop sharing your screen)$/i });

async function joinAs(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/room/${code}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  // Connected, not merely mounted. The control bar renders as soon as the tree
  // does, so waiting on Leave would let a share be requested mid-handshake, which
  // publishes into a room that is not there yet and is immediately unpublished.
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

test('a browser that cannot share has no share control anywhere', async ({ page, request }) => {
  await blockDisplayMedia(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  // Absent, never disabled. A dead button that can never work on this device is
  // noise, and it invites a tap that can only disappoint.
  await expect(shareControl(page)).toHaveCount(0);

  // And not hiding in MORE either, which is where width — not capability — puts
  // a control on a narrow window.
  await page.setViewportSize(MOBILE);
  await page.getByRole('button', { name: 'More options' }).click();
  await expect(page.getByRole('menuitem', { name: /share your screen/i })).toHaveCount(0);
});

test('a browser that can share has the control', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await expect(shareControl(page)).toBeEnabled();
  await expect(shareControl(page)).toHaveAttribute('aria-pressed', 'false');
});

test('a share reaches the other participant, promoted to the first tile', async ({
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
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await shareControl(page).click();

    // Three tiles each, and the share leads on both screens — the cap must never
    // be able to hide the thing everyone is looking at.
    await expect(guest.getByRole('listitem')).toHaveCount(3, { timeout: 20_000 });
    await expect(guest.getByRole('listitem').first()).toContainText('Ada Lovelace — screen');
    await expect(guest.getByRole('listitem').first().locator('video')).toHaveCount(1);

    // The sharer sees their own share, which is how you catch the most common
    // screen-share mistake: sharing the wrong window.
    await expect(page.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('listitem').first()).toContainText('You — screen');

    // Never mirrored. Only a self-*camera* is a mirror; a flipped spreadsheet is
    // unreadable.
    const shareClasses = await page
      .getByRole('listitem')
      .first()
      .locator('video')
      .getAttribute('class');
    expect(shareClasses).not.toContain('-scale-x-100');

    // The banner replaces the connection line, and the control reads engaged.
    await expect(page.getByText('Sharing your screen')).toBeVisible();
    await expect(shareControl(page)).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Stop', exact: true }).click();

    await expect(page.getByText('Sharing your screen')).toHaveCount(0);
    await expect(page.getByText('Connected')).toBeVisible();
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });
  } finally {
    await second.close();
  }
});

test('dismissing the picker changes nothing', async ({ page, request }) => {
  await dismissDisplayMedia(page);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await shareControl(page).click();

  // Cancelling a share is a normal action, not a fault: the control returns to
  // rest, no banner appears, and nothing is surfaced as an error.
  await expect(shareControl(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Sharing your screen')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('listitem')).toHaveCount(1);
});

test('a share ended from the browser syncs our state', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  // Shared to somebody, not into an empty room. A solo share — nobody else in the
  // call — is unreliable: LiveKit unpublishes it again within a second or so,
  // roughly half the time. It is not dynacast, which was tested off and made no
  // difference. See progress-tracker → Follow-ups; the behaviour is real and the
  // mechanism is still open, so this test exercises the case the feature is for
  // rather than encoding a known-bad one.
  await stubDisplayMedia(page);
  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace');
    await joinAs(guest, code, 'Grace Hopper');
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await shareControl(page).click();
    await expect(page.getByText('Sharing your screen')).toBeVisible({ timeout: 20_000 });

    // Chrome's own "Stop sharing" bar ends the track without touching our UI. We
    // hold no sharing state of our own, so useLocalParticipant's
    // LocalTrackUnpublished is what brings the bar and banner back — no reload,
    // no listener of ours.
    await stopShareFromBrowser(page);

    await expect(page.getByText('Sharing your screen')).toHaveCount(0, { timeout: 15_000 });
    await expect(shareControl(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(guest.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });
  } finally {
    await second.close();
  }
});
