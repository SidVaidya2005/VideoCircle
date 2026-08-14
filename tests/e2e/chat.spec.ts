import { expect, test, type Page } from '@playwright/test';

import { createMeeting, MIN_HIT_AREA, MOBILE } from './support/media';

declare global {
  interface Window {
    /** Everything this page has pushed through a data channel, as text. */
    __vcDataChannelSends?: string[];
  }
}

test.use({ permissions: ['camera', 'microphone'] });

/** Two real keys, 32 bytes each. `#k=` values shorter than that do not import. */
const KEY = 'r3fcIJT0unOuMvHFFghZHC2eh4xPLxZPcz5iLvuHuko';
const OTHER_KEY = 'CuLBKghDAblXyI_ImbVVGu00LW1tJCWDMPYbPTtt_VU';

const chatControl = (page: Page) => page.getByRole('button', { name: /^show chat/i });
const composer = (page: Page) => page.getByRole('textbox', { name: 'Message' });
/** Scoped to the panel: video tiles are list items too, on the same page. */
const chatPanel = (page: Page) => page.getByRole('complementary', { name: 'Chat' });
const entries = (page: Page) => chatPanel(page).getByRole('listitem');
const transcript = (page: Page) => chatPanel(page).getByRole('list');

/** The control names itself for its action, and carries the unread count when there is one. */
const chatControlNamed = (page: Page, name: RegExp) => page.getByRole('button', { name });

function scrollTopOf(page: Page): Promise<number> {
  return transcript(page).evaluate((node) => node.scrollTop);
}

async function joinAs(page: Page, code: string, name: string, hash = ''): Promise<void> {
  await page.goto(`/room/${code}${hash}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

/** Types and sends into an already-open panel. Separate from opening it, because the
 *  control toggles — sending twice through one helper would close the panel. */
async function typeAndSend(page: Page, body: string): Promise<void> {
  await composer(page).fill(body);
  await page.getByRole('button', { name: 'Send' }).click();
}

async function sendMessage(page: Page, body: string): Promise<void> {
  await chatControl(page).click();
  await typeAndSend(page, body);
}

/**
 * Records every payload this page pushes through a data channel.
 *
 * `page.on('request')` cannot see any of this: the data channel is SCTP over
 * WebRTC, so no HTTP request is ever made and a request-level assertion would pass
 * without ever having looked at the bytes. Patching the send method is the only
 * place the outgoing payload exists in the page.
 */
async function recordDataChannelSends(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const sends: string[] = [];
    window.__vcDataChannelSends = sends;

    const original = RTCDataChannel.prototype.send;
    // The real signature is four overloads; one function taking the union of them
    // is what a patch has to be, and `send` is a method, so it assigns cleanly.
    RTCDataChannel.prototype.send = function patched(
      this: RTCDataChannel,
      data: string | Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>,
    ) {
      if (typeof data === 'string') {
        sends.push(data);
      } else if (ArrayBuffer.isView(data)) {
        sends.push(
          new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)),
        );
      } else if (data instanceof ArrayBuffer) {
        sends.push(new TextDecoder().decode(data));
      }
      // A Blob falls through unrecorded: LiveKit never sends one, and there is
      // nothing to read out of it synchronously.

      // Reflect.apply rather than original.call: `send` is four overloads, and
      // `.call` on an overloaded method resolves to the last of them, so every
      // branch above would be checked against ArrayBufferView alone.
      Reflect.apply(original, this, [data]);
    };
  });
}

test('a message reaches the other participant', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await sendMessage(page, 'the analytical engine weaves patterns');

    await chatControl(guest).click();
    await expect(entries(guest)).toContainText('the analytical engine weaves patterns');
    // Attributed to whoever sent it, by the name they joined under.
    await expect(entries(guest)).toContainText('Ada Lovelace');

    // The sender holds its own copy — LiveKit does not echo your data back to you.
    await expect(entries(page)).toContainText('You');
    await expect(entries(page)).toContainText('the analytical engine weaves patterns');
  } finally {
    await second.close();
  }
});

test('nothing readable leaves the browser', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  await recordDataChannelSends(page);

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await sendMessage(page, 'zebracrossing');
    await expect(entries(page)).toContainText('zebracrossing');

    const sends = await page.evaluate(() => window.__vcDataChannelSends ?? []);

    // Non-empty first: without this the assertion below passes on a page that
    // never sent anything, which is the failure mode of every "nothing leaked"
    // check ever written.
    expect(sends.length).toBeGreaterThan(0);
    expect(sends.filter((payload) => payload.includes('zebracrossing'))).toEqual([]);

    // The key rides in the fragment and must not appear either.
    expect(sends.filter((payload) => payload.includes(KEY))).toEqual([]);
  } finally {
    await second.close();
  }
});

test('a message under a different key reads as unreadable, not as a crash', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  const errors: string[] = [];
  guest.on('pageerror', (error) => errors.push(error.message));

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    // Same room, different key: what a forwarded link from another meeting, or a
    // mangled fragment, produces.
    await joinAs(guest, code, 'Grace Hopper', `#k=${OTHER_KEY}`);
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await sendMessage(page, 'this should not be readable');

    await chatControl(guest).click();
    await expect(entries(guest)).toContainText('Unreadable message');
    await expect(entries(guest)).not.toContainText('this should not be readable');

    // A rejected decrypt must not reach the render tree.
    expect(errors).toEqual([]);
  } finally {
    await second.close();
  }
});

test('a link with no key shows the explanation, not a wall of placeholders', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper');
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await sendMessage(page, 'nobody without the key can read this');

    await chatControl(guest).click();
    await expect(guest.getByText('does not carry', { exact: false })).toBeVisible();
    // Dropped rather than collected: the panel has already said why, and a column
    // of placeholders under that explanation is noise.
    await expect(guest.getByText('Unreadable message')).toHaveCount(0);
    await expect(composer(guest)).toHaveCount(0);
  } finally {
    await second.close();
  }
});

test('Enter sends and Shift+Enter does not', async ({ page, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);

  await chatControl(page).click();

  await composer(page).fill('first line');
  await composer(page).press('Shift+Enter');
  await composer(page).pressSequentially('second line');

  // Still in the field, now two lines long, and nothing has been sent.
  await expect(entries(page)).toHaveCount(0);
  await expect(composer(page)).toHaveValue('first line\nsecond line');

  await composer(page).press('Enter');

  await expect(entries(page)).toHaveCount(1);
  // Cleared on send rather than on resolve — a composer held hostage to the
  // network makes a fast conversation feel broken.
  await expect(composer(page)).toHaveValue('');
});

test('a typed newline survives the round trip', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await chatControl(page).click();
    await composer(page).fill('line one');
    await composer(page).press('Shift+Enter');
    await composer(page).pressSequentially('line two');
    await composer(page).press('Enter');

    await chatControl(guest).click();
    // Both halves arrive, and the break between them is preserved rather than
    // collapsed into a space.
    await expect(entries(guest)).toContainText('line one');
    await expect(entries(guest)).toContainText('line two');

    const rendered = await entries(guest).last().innerText();
    expect(rendered).toContain('line one\nline two');
  } finally {
    await second.close();
  }
});

test('the badge counts what landed while chat was shut, and clears on open', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await chatControl(guest).click();
    await typeAndSend(guest, 'one');
    await typeAndSend(guest, 'two');

    // The count is in the accessible name, not only the badge: an aria-label
    // overrides a button's contents, so the number would otherwise be unreachable.
    await expect(chatControlNamed(page, /^show chat \(2 unread\)$/i)).toBeVisible();

    await chatControl(page).click();
    await expect(chatControlNamed(page, /^hide chat$/i)).toBeVisible();

    // Arriving while the panel is open is not unread, and closing marks it seen —
    // otherwise everything read with the panel open would come back as unread.
    await typeAndSend(guest, 'three');
    await expect(entries(page)).toHaveCount(3);
    await chatControlNamed(page, /^hide chat$/i).click();
    await expect(chatControlNamed(page, /^show chat$/i)).toBeVisible();

    // And your own messages never count toward it.
    await chatControl(page).click();
    await typeAndSend(page, 'mine');
    await chatControlNamed(page, /^hide chat$/i).click();
    await expect(chatControlNamed(page, /^show chat$/i)).toBeVisible();
  } finally {
    await second.close();
  }
});

test('a new message moves the view only when you are already at the bottom', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);

  await chatControl(page).click();
  for (let index = 0; index < 15; index += 1) {
    await typeAndSend(page, `message number ${index}`);
  }
  await expect(entries(page)).toHaveCount(15);

  // At the bottom: the list follows. Asserted in both directions, because a pin
  // that never scrolls at all would pass the scrolled-up case on its own.
  const atBottom = await transcript(page).evaluate(
    (node) => node.scrollHeight - node.scrollTop - node.clientHeight,
  );
  expect(atBottom).toBeLessThanOrEqual(2);

  await transcript(page).evaluate((node) => node.scrollTo({ top: 0 }));
  const before = await scrollTopOf(page);
  expect(before).toBe(0);

  await typeAndSend(page, 'arriving while you read back');
  await expect(entries(page)).toHaveCount(16);

  // The view stays exactly where it was left.
  expect(await scrollTopOf(page)).toBe(before);
});

test('the sheet form carries the whole panel on a phone', async ({ page, request }) => {
  test.setTimeout(90_000);

  await page.setViewportSize(MOBILE);
  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);

  // Below sm: every secondary control lives in MORE.
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: /^show chat/i }).click();

  const sheet = page.getByRole('dialog');
  await sheet.getByRole('textbox', { name: 'Message' }).fill('from a phone');
  await sheet.getByRole('button', { name: 'Send' }).click();

  await expect(sheet.getByRole('listitem')).toContainText('from a phone');

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  // The composer and its Send are the only things pressed in here, and both are
  // reached one-handed. Polled, because animate-tile-in leaves anything freshly
  // mounted measuring fractionally small while it plays.
  const undersized = () =>
    sheet.getByRole('button').evaluateAll(
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

test('switching to another panel still marks chat read', async ({ page, browser, request }) => {
  test.setTimeout(90_000);

  const code = await createMeeting(request);
  const second = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await second.newPage();

  try {
    await joinAs(page, code, 'Ada Lovelace', `#k=${KEY}`);
    await joinAs(guest, code, 'Grace Hopper', `#k=${KEY}`);
    await expect(page.getByRole('listitem')).toHaveCount(2, { timeout: 20_000 });

    await chatControl(page).click();
    await sendMessage(guest, 'read with the panel open');
    await expect(entries(page)).toHaveCount(1);

    // Chat closes without the chat control ever being touched. What was read
    // while it was open must not come back as unread.
    await page.getByRole('button', { name: /^show participants/i }).click();

    await expect(chatControlNamed(page, /^show chat$/i)).toBeVisible();
  } finally {
    await second.close();
  }
});
