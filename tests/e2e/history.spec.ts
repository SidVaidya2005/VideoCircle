import { expect, test } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

import { MIN_HIT_AREA, MOBILE } from './support/media';
import { createAccount, deleteAccount, signIn, type TestAccount } from './support/session';
import { serviceClient } from './support/webhook';

/**
 * Call History, driven by real sessions.
 *
 * Sign-in goes through the admin API rather than Google's consent screen — see
 * `support/session.ts`. The session is genuine, so `getUser()` revalidates it and
 * RLS sees the real `auth.uid()`; only the identity provider handshake is skipped.
 */

const BASE_URL = 'http://localhost:3100';

interface SeededMeeting {
  meetingId: string;
  code: string;
}

/**
 * A code in the room-code alphabet, which excludes i, l, 0 and 1 — the database
 * CHECKs the shape, so a lazier generator fails at insert rather than in the UI.
 * Random rather than sequential because the suite runs fully parallel.
 */
function uniqueCode(): string {
  const alphabet = 'abcdefghjkmnopqrstuvwxyz23456789';
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)] ?? 'a';

  return `${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}`;
}

async function seedMeeting(
  db: SupabaseClient<Database>,
  options: { endedAt?: string | null; expiresAt?: string; createdAt?: string } = {},
): Promise<SeededMeeting> {
  const code = uniqueCode();
  const { data, error } = await db
    .from('meetings')
    .insert({
      code,
      created_at: options.createdAt ?? new Date(Date.now() - 3_600_000).toISOString(),
      expires_at: options.expiresAt ?? new Date(Date.now() + 3_600_000).toISOString(),
      ended_at: options.endedAt ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { meetingId: data.id, code };
}

async function seedParticipant(
  db: SupabaseClient<Database>,
  params: {
    meetingId: string;
    userId?: string | null;
    identity: string;
    displayName: string;
    joinedAt: string;
    leftAt?: string | null;
  },
): Promise<void> {
  const { error } = await db.from('meeting_participants').insert({
    meeting_id: params.meetingId,
    user_id: params.userId ?? null,
    identity: params.identity,
    display_name: params.displayName,
    joined_at: params.joinedAt,
    left_at: params.leftAt ?? null,
  });

  if (error) throw error;
}

async function cleanUp(
  db: SupabaseClient<Database>,
  meetingIds: string[],
  accounts: TestAccount[],
) {
  for (const id of meetingIds) await db.from('meetings').delete().eq('id', id);
  for (const account of accounts) await deleteAccount(account.userId);
}

test('a signed-out visitor is sent Home', async ({ page }) => {
  await page.goto('/history');

  // The final URL, not merely a status: a redirect that renders history anyway
  // would still report 200 on the original request.
  await expect(page).toHaveURL(`${BASE_URL}/`);
});

test('a signed-in user with no calls sees the empty state', async ({ page, context }) => {
  const account = await createAccount();

  try {
    await signIn(context, account.email, BASE_URL);
    await page.goto('/history');

    await expect(page.getByRole('heading', { name: 'Every meeting you joined' })).toBeVisible();
    await expect(page.getByText('Nothing yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a meeting' })).toBeVisible();
  } finally {
    await cleanUp(serviceClient(), [], [account]);
  }
});

test('a meeting shows its code, duration and the other people in it', async ({ page, context }) => {
  const db = serviceClient();
  const account = await createAccount();
  const meeting = await seedMeeting(db);
  const joinedAt = new Date(Date.now() - 3_000_000).toISOString();

  try {
    await seedParticipant(db, {
      meetingId: meeting.meetingId,
      userId: account.userId,
      identity: `user:${account.userId}`,
      displayName: account.displayName,
      joinedAt,
      leftAt: new Date(Date.parse(joinedAt) + 727_000).toISOString(),
    });
    await seedParticipant(db, {
      meetingId: meeting.meetingId,
      identity: 'guest:11111111-1111-4111-8111-111111111111',
      displayName: 'Grace',
      joinedAt,
    });

    await signIn(context, account.email, BASE_URL);
    await page.goto('/history');

    const entry = page.getByRole('listitem').filter({ hasText: meeting.code });
    await expect(entry).toBeVisible();
    // 727 seconds — the design system's own duration example.
    await expect(entry).toContainText('00:12:07');
    await expect(entry).toContainText('Grace');
    // Their own name is never listed among the others.
    await expect(entry).not.toContainText(account.displayName);
  } finally {
    await cleanUp(db, [meeting.meetingId], [account]);
  }
});

test('a rejoin collapses into one entry spanning both sessions', async ({ page, context }) => {
  const db = serviceClient();
  const account = await createAccount();
  const meeting = await seedMeeting(db);
  const first = new Date(Date.now() - 3_000_000);

  try {
    await seedParticipant(db, {
      meetingId: meeting.meetingId,
      userId: account.userId,
      identity: `user:${account.userId}`,
      displayName: account.displayName,
      joinedAt: first.toISOString(),
      leftAt: new Date(first.getTime() + 300_000).toISOString(),
    });
    await seedParticipant(db, {
      meetingId: meeting.meetingId,
      userId: account.userId,
      identity: `user:${account.userId}`,
      displayName: account.displayName,
      joinedAt: new Date(first.getTime() + 540_000).toISOString(),
      leftAt: new Date(first.getTime() + 1_200_000).toISOString(),
    });

    await signIn(context, account.email, BASE_URL);
    await page.goto('/history');

    const entries = page.getByRole('listitem').filter({ hasText: meeting.code });
    await expect(entries).toHaveCount(1);
    // 20 minutes: first join to last leave, not the 16 minutes actually connected.
    await expect(entries).toContainText('00:20:00');
  } finally {
    await cleanUp(db, [meeting.meetingId], [account]);
  }
});

test('one account never sees another account’s meetings', async ({ page, context }) => {
  // The build plan's headline claim, in a browser rather than only in SQL.
  const db = serviceClient();
  const [ada, bob] = await Promise.all([createAccount(), createAccount()]);
  const adaMeeting = await seedMeeting(db);
  const bobMeeting = await seedMeeting(db);
  const joinedAt = new Date(Date.now() - 3_000_000).toISOString();

  try {
    await seedParticipant(db, {
      meetingId: adaMeeting.meetingId,
      userId: ada.userId,
      identity: `user:${ada.userId}`,
      displayName: ada.displayName,
      joinedAt,
      leftAt: joinedAt,
    });
    await seedParticipant(db, {
      meetingId: bobMeeting.meetingId,
      userId: bob.userId,
      identity: `user:${bob.userId}`,
      displayName: bob.displayName,
      joinedAt,
      leftAt: joinedAt,
    });

    await signIn(context, bob.email, BASE_URL);
    await page.goto('/history');

    await expect(page.getByRole('listitem').filter({ hasText: bobMeeting.code })).toHaveCount(1);
    // Not merely absent from the list — the code must not appear anywhere on the page.
    await expect(page.locator('body')).not.toContainText(adaMeeting.code);
    await expect(page.locator('body')).not.toContainText(ada.displayName);
  } finally {
    await cleanUp(db, [adaMeeting.meetingId, bobMeeting.meetingId], [ada, bob]);
  }
});

test('Rejoin is offered only where a token would still be minted', async ({ page, context }) => {
  const db = serviceClient();
  const account = await createAccount();
  const open = await seedMeeting(db);
  const ended = await seedMeeting(db, { endedAt: new Date(Date.now() - 60_000).toISOString() });
  const joinedAt = new Date(Date.now() - 3_000_000).toISOString();

  try {
    for (const meeting of [open, ended]) {
      await seedParticipant(db, {
        meetingId: meeting.meetingId,
        userId: account.userId,
        identity: `user:${account.userId}`,
        displayName: account.displayName,
        joinedAt,
        leftAt: joinedAt,
      });
    }

    await signIn(context, account.email, BASE_URL);
    await page.goto('/history');

    const openEntry = page.getByRole('listitem').filter({ hasText: open.code });
    const endedEntry = page.getByRole('listitem').filter({ hasText: ended.code });

    await expect(openEntry.getByRole('link', { name: 'Rejoin' })).toBeVisible();
    await expect(endedEntry.getByRole('link', { name: 'Rejoin' })).toHaveCount(0);
    // The caveat is stated wherever a rejoin is offered.
    await expect(page.getByText(/chat will be unreadable/)).toBeVisible();
  } finally {
    await cleanUp(db, [open.meetingId, ended.meetingId], [account]);
  }
});

test.describe('timezone', () => {
  // UTC+14, so it disagrees with UTC and with any plausible CI machine zone.
  test.use({ timezoneId: 'Pacific/Kiritimati' });

  test('times are rendered in the reader’s zone, not the server’s', async ({ page, context }) => {
    const db = serviceClient();
    const account = await createAccount();
    const meeting = await seedMeeting(db);
    // 22:30 UTC — the following day in Kiritimati, so the two zones cannot agree
    // on the date, let alone the hour.
    const joinedAt = new Date(Date.now() - 86_400_000);
    joinedAt.setUTCHours(22, 30, 0, 0);

    try {
      await seedParticipant(db, {
        meetingId: meeting.meetingId,
        userId: account.userId,
        identity: `user:${account.userId}`,
        displayName: account.displayName,
        joinedAt: joinedAt.toISOString(),
        leftAt: joinedAt.toISOString(),
      });

      await signIn(context, account.email, BASE_URL);
      await page.goto('/history');

      // What the BROWSER makes of that instant.
      const expected = await page.evaluate(
        (iso) =>
          new Date(iso).toLocaleString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
        joinedAt.toISOString(),
      );

      // Retrying, because the server pass renders UTC and the reader's zone only
      // appears once hydration re-runs the component. A one-shot read here passes
      // or fails on timing rather than on correctness — it caught the server text
      // the first time and would have caught UTC the second, but only by luck.
      await expect(page.locator('time').first()).toHaveText(expected);

      // Not vacuous: the fixture instant falls on a different date in UTC, so a
      // page that never left the server snapshot cannot satisfy the assertion above.
      const inUtc = joinedAt.toLocaleString('en-GB', {
        timeZone: 'UTC',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      expect(expected).not.toBe(inUtc);
    } finally {
      await cleanUp(db, [meeting.meetingId], [account]);
    }
  });
});

test.describe('mobile', () => {
  test('history is usable at 360px', async ({ page, context }) => {
    const db = serviceClient();
    const account = await createAccount();
    const meeting = await seedMeeting(db);
    const joinedAt = new Date(Date.now() - 3_000_000).toISOString();

    try {
      await seedParticipant(db, {
        meetingId: meeting.meetingId,
        userId: account.userId,
        identity: `user:${account.userId}`,
        displayName: account.displayName,
        joinedAt,
        leftAt: joinedAt,
      });
      // Eleven others, so the +N more path is what gets measured.
      for (let index = 0; index < 11; index += 1) {
        await seedParticipant(db, {
          meetingId: meeting.meetingId,
          identity: `guest:${index}`,
          displayName: `Participant ${index}`,
          joinedAt,
        });
      }

      await signIn(context, account.email, BASE_URL);
      await page.setViewportSize(MOBILE);
      await page.goto('/history');

      await expect(page.getByRole('listitem').filter({ hasText: meeting.code })).toContainText(
        '+8 more',
      );

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows).toBe(false);

      const undersized = await page.evaluate((min) => {
        return [...document.querySelectorAll('a, button')]
          .map((el) => ({
            label: el.textContent?.trim().slice(0, 24) ?? '',
            box: el.getBoundingClientRect(),
          }))
          .filter(({ box }) => box.width > 0 && (box.height < min || box.width < min))
          .map(({ label, box }) => `${label} ${Math.round(box.width)}x${Math.round(box.height)}`);
      }, MIN_HIT_AREA);

      expect(undersized).toEqual([]);
    } finally {
      await cleanUp(db, [meeting.meetingId], [account]);
    }
  });
});
