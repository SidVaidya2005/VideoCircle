import { expect, test, type Page } from '@playwright/test';

import { createMeeting } from './support/media';

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

async function joinAs(page: Page, code: string, name: string, hash = ''): Promise<void> {
  await page.goto(`/room/${code}${hash}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 20_000 });
}

async function sendMessage(page: Page, body: string): Promise<void> {
  await chatControl(page).click();
  await composer(page).fill(body);
  await page.getByRole('button', { name: 'Send' }).click();
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
