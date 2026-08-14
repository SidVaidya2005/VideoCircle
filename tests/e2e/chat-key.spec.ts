import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MOBILE } from './support/media';

test.use({ permissions: ['camera', 'microphone'] });

/**
 * A real key, not a realistic-looking string: 32 bytes as 43 base64url characters,
 * which is what `exportChatKey` produces and the only thing `importChatKey`
 * accepts. `invite.spec.ts` can use a shorter stand-in because it only ever carries
 * the fragment through a URL; here it is actually imported, and anything else lands
 * in the missing state.
 */
const CHAT_KEY = 'r3fcIJT0unOuMvHFFghZHC2eh4xPLxZPcz5iLvuHuko';

const chatControl = (page: Page) => page.getByRole('button', { name: /^show chat/i });
const unavailable = (page: Page) => page.getByText('does not carry', { exact: false });
const ready = (page: Page) => page.getByText('No messages yet', { exact: false });

async function joinAs(page: Page, code: string, name: string, hash = ''): Promise<void> {
  await page.goto(`/room/${code}${hash}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

test('a link carrying the key opens chat ready to use', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);

  await chatControl(page).click();

  await expect(ready(page)).toBeVisible();
  await expect(unavailable(page)).toHaveCount(0);
});

test('a link with no fragment explains itself instead of failing', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await chatControl(page).click();

  // The panel opens either way. A disabled control would say "chat is broken"
  // where the truth is "your link is missing a piece".
  await expect(unavailable(page)).toBeVisible();
  await expect(page.getByText('send the original link', { exact: false })).toBeVisible();
  await expect(ready(page)).toHaveCount(0);
});

test('a malformed key lands in the same state as no key at all', async ({ page, request }) => {
  const code = await createMeeting(request);
  // Valid base64url characters, wrong length for AES-GCM, so importKey rejects.
  await joinAs(page, code, 'Ada Lovelace', '#k=tooshort');

  await chatControl(page).click();

  // One state, one explanation: someone holding a truncated link cannot act on
  // the difference between "absent" and "unusable".
  await expect(unavailable(page)).toBeVisible();
  await expect(ready(page)).toHaveCount(0);
});

test('opening chat never puts the key on the network', async ({ page, request }) => {
  const code = await createMeeting(request);

  const leaked: string[] = [];
  page.on('request', (sent) => {
    if (sent.url().includes(CHAT_KEY)) leaked.push(`url ${sent.url()}`);
    const body = sent.postData();
    if (body?.includes(CHAT_KEY)) leaked.push(`body ${sent.url()}`);
  });

  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);
  await chatControl(page).click();
  await expect(ready(page)).toBeVisible();

  // Reading the key and importing it must be as invisible to the network as
  // carrying it was — the same claim invite.spec makes for the dialog.
  expect(leaked).toEqual([]);
});

test('chat and participants never occupy the column together', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);

  await chatControl(page).click();
  await expect(ready(page)).toBeVisible();

  await page.getByRole('button', { name: /^show participants/i }).click();

  await expect(ready(page)).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Participants' })).toBeVisible();
});

test('chat is reachable from MORE on a phone', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: /^show chat/i }).click();

  // The sheet form, not the inline column — CallPanel picks one or the other.
  await expect(
    page.getByRole('dialog').getByText('does not carry', { exact: false }),
  ).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});
