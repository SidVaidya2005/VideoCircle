import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MIN_HIT_AREA, MOBILE } from './support/media';

// Chromium refuses navigator.clipboard.writeText without this, which reads as a
// broken copy button rather than a missing grant. The project's own hook treats a
// refusal and a hang alike, so the failure is silent by design — the permission
// has to be given explicitly for the success path to be reachable at all.
test.use({ permissions: ['camera', 'microphone', 'clipboard-write'] });

/** Long enough to be unmistakable in a URL, and shaped like a real exported key. */
const CHAT_KEY = 'aB3-_xYZ09kQwErTyUiOpAsDfGhJkLzXcVbNm12';

const inviteControl = (page: Page) => page.getByRole('button', { name: 'Invite others' });
const linkField = (page: Page) => page.getByRole('textbox', { name: 'Invite link' });

async function joinAs(page: Page, code: string, name: string, hash = ''): Promise<void> {
  await page.goto(`/room/${code}${hash}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

test('the dialog shows the live link, fragment and all', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);

  await inviteControl(page).click();

  // The configured origin, the code, and the fragment exactly as it stands —
  // base64url is case-sensitive, so a normalised link would still join the call
  // and silently fail to decrypt chat.
  await expect(linkField(page)).toHaveValue(new RegExp(`/room/${code}#k=${CHAT_KEY}$`));
  await expect(page.getByText('This link carries the chat key', { exact: false })).toBeVisible();
});

test('a link with no key says so instead of warning about one', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace');

  await inviteControl(page).click();

  // Someone who arrived through a stripped link would otherwise pass the same
  // broken link on, and nothing about the call would look wrong.
  await expect(page.getByText('has no chat key', { exact: false })).toBeVisible();
  await expect(page.getByText('carries the chat key', { exact: false })).toHaveCount(0);
  await expect(linkField(page)).not.toHaveValue(/#/);
});

test('copying confirms', async ({ page, request }) => {
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);

  await inviteControl(page).click();
  await page.getByRole('button', { name: 'Copy invite link' }).click();

  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
});

test('a refused clipboard leaves the link selected instead of stranded', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    // Refused, unavailable or hung all land here. The control must never claim a
    // copy that did not happen.
    navigator.clipboard.writeText = () => Promise.reject(new Error('blocked'));
  });

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);

  await inviteControl(page).click();
  await page.getByRole('button', { name: 'Copy invite link' }).click();

  await expect(page.getByRole('alert')).toContainText('The link is selected');

  const selected = await linkField(page).evaluate((node: HTMLInputElement) =>
    node.value.slice(node.selectionStart ?? 0, node.selectionEnd ?? 0),
  );
  expect(selected).toContain(CHAT_KEY);
});

test('the chat key never reaches the network', async ({ page, request }) => {
  const code = await createMeeting(request);

  const leaked: string[] = [];
  page.on('request', (sent) => {
    if (sent.url().includes(CHAT_KEY)) leaked.push(`url ${sent.url()}`);
    const body = sent.postData();
    if (body?.includes(CHAT_KEY)) leaked.push(`body ${sent.url()}`);
  });

  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);
  await inviteControl(page).click();
  await page.getByRole('button', { name: 'Copy invite link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();

  // The product's central privacy claim: the fragment is never transmitted, and
  // showing it in a dialog must not change that.
  expect(leaked).toEqual([]);
});

test('the invite dialog is reachable and sized on a phone', async ({ page, request }) => {
  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${CHAT_KEY}`);

  // Below sm: every secondary control lives in MORE.
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Invite others' }).click();

  await expect(linkField(page)).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  const undersized = () =>
    page
      .getByRole('dialog')
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
