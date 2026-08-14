import { expect, test, type Page } from '@playwright/test';

import { createMeeting, stubDisplayMedia } from './support/media';

/**
 * The two edge cases F24 closes, both open since Phase 3 and 4.
 *
 * Neither is a crash. Both are the quieter failure where a control does nothing
 * and says nothing, which is the kind a person blames themselves for.
 */

/** A real 32-byte key. Anything shorter does not import — see chat.spec.ts. */
const KEY = 'r3fcIJT0unOuMvHFFghZHC2eh4xPLxZPcz5iLvuHuko';

const chatPanel = (page: Page) => page.getByRole('complementary', { name: 'Chat' });
const transcript = (page: Page) => chatPanel(page).getByRole('list');
const composer = (page: Page) => page.getByRole('textbox', { name: 'Message' });
const jumpToLatest = (page: Page) => page.getByRole('button', { name: 'New messages' });

async function joinAs(page: Page, code: string, name: string, hash = ''): Promise<void> {
  await page.goto(`/room/${code}${hash}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible({ timeout: 20_000 });
}

test('the share control is not pressable before the room is connected', async ({
  page,
  request,
}) => {
  const code = await createMeeting(request);
  await stubDisplayMedia(page);

  // Deterministic rather than racing the real handshake: the window this guards
  // is one to three seconds wide, so a test that clicked fast and hoped would
  // pass for the wrong reason most runs.
  //
  // TEST-NET-1 (192.0.2.0/24, reserved by RFC 5737 and routed nowhere), so the
  // connection *hangs* and the room sits in Connecting for the whole test. A
  // refused address does not work: `wss://127.0.0.1:1` is rejected instantly,
  // LiveKit reports JOIN_FAILURE, and the terminal disconnect notice built
  // earlier in this feature correctly replaces the room tree — control bar
  // included. That is right behaviour and a useless fixture, and it only showed
  // up under full-suite load, where losing the race is the normal case.
  await page.route('**/api/token', async (route) => {
    // Retried once on a thrown transport error, for the reason `createMeeting`
    // is: `next dev` intermittently resets a connection when several Playwright
    // workers hit it at once. Without this the interception itself failed under
    // full-suite load and the test reported a join failure rather than anything
    // about the share control.
    let response;
    try {
      response = await route.fetch();
    } catch {
      response = await route.fetch();
    }

    const body = (await response.json()) as { serverUrl: string };
    await route.fulfill({
      response,
      json: { ...body, serverUrl: 'wss://192.0.2.1' },
    });
  });

  await joinAs(page, code, 'Ada Lovelace');

  // The control bar renders as soon as the room tree mounts, well before the
  // handshake finishes — which is exactly the bug: pressing share here used to
  // publish into a room that was not there, and the publication was dropped a
  // moment later with nothing surfaced at all.
  const share = page.getByRole('button', { name: /^Share your screen/ });
  await expect(share).toBeVisible();
  await expect(share).toBeDisabled();

  // Disabled is not enough on its own. A dimmed control is indistinguishable from
  // a broken one, and this state lasts about as long as it takes to press twice
  // and give up.
  await expect(share).toHaveAccessibleName(/available once you are connected/i);
});

test('a message arriving while you read back is not silent', async ({ page, browser, request }) => {
  test.setTimeout(120_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);

    await page.getByRole('button', { name: /show chat/i }).click();
    await guest.getByRole('button', { name: /show chat/i }).click();
    await expect(chatPanel(page)).toBeVisible();

    // Enough to overflow the panel, so there is somewhere to scroll back to.
    for (let index = 0; index < 12; index += 1) {
      await composer(guest).fill(`difference engine note ${index}`);
      await guest.getByRole('button', { name: 'Send' }).click();
    }
    await expect(chatPanel(page).getByRole('listitem')).toHaveCount(12, { timeout: 30_000 });

    // Read back. The scroll pin deliberately holds the view still here, which is
    // correct and is also why anything arriving now was completely silent: the
    // unread badge counts only while the panel is *closed*.
    await transcript(page).evaluate((node) => (node.scrollTop = 0));
    await expect(jumpToLatest(page)).toBeHidden();

    await composer(guest).fill('and one more while you were reading');
    await guest.getByRole('button', { name: 'Send' }).click();

    await expect(jumpToLatest(page)).toBeVisible({ timeout: 30_000 });

    // And it does what it says: back to the floor, control gone, latest readable.
    await jumpToLatest(page).click();
    await expect(jumpToLatest(page)).toBeHidden();
    await expect(chatPanel(page).getByText('and one more while you were reading')).toBeVisible();
  } finally {
    await second.close();
  }
});

test('scrolling back in a quiet conversation shows nothing', async ({ page, browser, request }) => {
  test.setTimeout(120_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);

    await page.getByRole('button', { name: /show chat/i }).click();
    await guest.getByRole('button', { name: /show chat/i }).click();

    for (let index = 0; index < 12; index += 1) {
      await composer(guest).fill(`quiet note ${index}`);
      await guest.getByRole('button', { name: 'Send' }).click();
    }
    await expect(chatPanel(page).getByRole('listitem')).toHaveCount(12, { timeout: 30_000 });

    // The half that keeps the control honest. Signalling on scroll alone would
    // make it appear every time anyone reads back through a finished
    // conversation, which is a notification about nothing.
    await transcript(page).evaluate((node) => (node.scrollTop = 0));
    await page.waitForTimeout(1_000);
    await expect(jumpToLatest(page)).toBeHidden();
  } finally {
    await second.close();
  }
});
