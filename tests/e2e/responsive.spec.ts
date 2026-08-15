import { expect, test, type Page } from '@playwright/test';

import { createMeeting } from './support/media';
import { CONNECT_TIMEOUT_MS, connectedStatus, joinAs } from './support/join';
import { createAccount, deleteAccount, signIn } from './support/session';
import { expectSweepClean, VIEWPORTS } from './support/viewport';
import { serviceClient } from './support/webhook';

/**
 * Feature 22's audit: every surface, every width, measured rather than eyeballed.
 *
 * A screenshot hides four pixels of overflow and says nothing at all about a 41px
 * button. Both are objective questions with objective answers, so they are asked
 * that way — see `support/viewport.ts` for the two measurements.
 *
 * **A surface is a route in a state, not a route.** `/room/[code]` is four of them:
 * the lobby, the call, the call with participants open, and the call with chat
 * open. They lay out differently and each has to be measured.
 *
 * Each surface is reached once and then *resized* through the widths, rather than
 * re-entered per width. Re-joining a real LiveKit room eight times per surface
 * would put minutes on the suite to measure layout that a resize re-runs honestly:
 * Playwright resizes the real viewport, so `matchMedia` fires and the panel really
 * does swap between a sheet and an inline column.
 */

const BASE_URL = 'http://localhost:3100';

/** Tailwind's `sm:`. Below it the secondary controls collapse into MORE. */
const CONTROLS_INLINE_FROM = 640;
/** Tailwind's `lg:`. Below it a call panel is a sheet; at or above it, a column. */
const PANEL_INLINE_FROM = 1024;

type PanelName = 'participants' | 'chat';

/** The control's accessible name states what pressing it will do, so it flips when open. */
function panelControl(panel: PanelName, open: boolean): RegExp {
  return new RegExp(`${open ? 'hide' : 'show'} ${panel}`, 'i');
}

async function openCallPanel(page: Page, panel: PanelName, width: number): Promise<void> {
  if (width < CONTROLS_INLINE_FROM) {
    await page.getByRole('button', { name: 'More options' }).click();
    await page.getByRole('menuitem', { name: panelControl(panel, false) }).click();
    return;
  }

  await page.getByRole('button', { name: panelControl(panel, false) }).click();
}

async function closeCallPanel(page: Page, panel: PanelName, width: number): Promise<void> {
  // A sheet dismisses itself; an inline column is closed from the control that
  // opened it. Escape on the inline form would do nothing at all and leave the
  // next viewport measuring a panel that was meant to be shut.
  if (width < PANEL_INLINE_FROM) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    return;
  }

  await page.getByRole('button', { name: panelControl(panel, true) }).click();
  await expect(page.getByRole('complementary')).toBeHidden();
}

test('Home holds at every width', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'VideoCircle' })).toBeVisible();

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectSweepClean(page, `Home @ ${viewport.name}`);
  }
});

test('the lobby holds at every width', async ({ page, request }) => {
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  // The preview has to be up before measuring: the device pickers do not exist
  // until acquisition succeeds, and they are the widest thing in the lobby.
  await expect(page.locator('video')).toBeVisible();

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectSweepClean(page, `lobby @ ${viewport.name}`);
  }
});

test('the call and both panels hold at every width', async ({ page, request }) => {
  // One real join, then eight resizes across four surfaces. Generous, because the
  // join alone is a real handshake against LiveKit Cloud.
  test.setTimeout(180_000);

  const code = await createMeeting(request);
  await joinAs(page, code, 'Ada Lovelace', { until: 'mounted' });
  await expect(connectedStatus(page)).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expectSweepClean(page, `call @ ${viewport.name}`);

    // The overflow measurement is horizontal and says nothing about a control bar
    // pushed off the *bottom* — which is the specific failure phone landscape
    // produces, and the one the build plan names. Only these three matter: mic,
    // camera and Leave are what someone reaches for under pressure, and
    // `code-standards.md` forbids collapsing them at any width.
    for (const control of [/^(Mute|Unmute) microphone$/, /^Turn (off|on) camera$/, /^Leave/]) {
      await expect(page.getByRole('button', { name: control })).toBeInViewport();
    }

    for (const panel of ['participants', 'chat'] as const) {
      await openCallPanel(page, panel, viewport.width);

      // Measured only once the panel is actually up. Below `lg:` it is a portaled
      // Radix dialog, above it an <aside>; either way, sweeping before it lands
      // measures the call again and calls it a passing panel.
      if (viewport.width < PANEL_INLINE_FROM) {
        await expect(page.getByRole('dialog')).toBeVisible();
      } else {
        await expect(page.getByRole('complementary')).toBeVisible();
      }

      await expectSweepClean(page, `call + ${panel} @ ${viewport.name}`);
      await closeCallPanel(page, panel, viewport.width);
    }
  }
});

test('call history holds at every width', async ({ page, context }) => {
  const db = serviceClient();
  const account = await createAccount();

  // Seeded here rather than lifted out of `history.spec.ts`, which owns these
  // shapes today. Consolidating the suite's fixtures touches every call spec at
  // once and belongs with the `joinAs` duplication feature 26 already carries.
  const alphabet = 'abcdefghjkmnopqrstuvwxyz23456789';
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)] ?? 'a';
  const code = `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
  const joinedAt = new Date(Date.now() - 3_000_000).toISOString();

  const { data: meeting, error } = await db
    .from('meetings')
    .insert({
      code,
      created_at: new Date(Date.now() - 3_600_000).toISOString(),
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;

  try {
    // The dense row is the one worth sweeping: a long name list is where a history
    // row would push the page wide, and the `+N more` split is what stops it.
    await db.from('meeting_participants').insert([
      {
        meeting_id: meeting.id,
        user_id: account.userId,
        identity: `user:${account.userId}`,
        display_name: account.displayName,
        joined_at: joinedAt,
        left_at: joinedAt,
      },
      ...Array.from({ length: 11 }, (_, index) => ({
        meeting_id: meeting.id,
        identity: `guest:${index}`,
        display_name: `Participant ${index}`,
        joined_at: joinedAt,
      })),
    ]);

    await signIn(context, account.email, BASE_URL);
    await page.goto('/history');
    await expect(page.getByRole('listitem').filter({ hasText: code })).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectSweepClean(page, `history @ ${viewport.name}`);
    }
  } finally {
    await db.from('meetings').delete().eq('id', meeting.id);
    await deleteAccount(account.userId);
  }
});
