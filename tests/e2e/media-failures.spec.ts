import { expect, test } from '@playwright/test';

import { MEDIA_FAILURE_COPY } from '@/lib/media/media-failure-copy';

import { createMeeting, stubMediaFailure } from './support/media';

/**
 * The three device failures the lobby has to explain, and which nothing could
 * reach until now.
 *
 * These assert the **mapping**, not the prose: the copy itself is already covered
 * structurally by `tests/unit/lib/media/media-failure-copy.test.ts`, and the entry
 * is imported here rather than restated so editing a sentence does not fail a test
 * that is not about sentences. What these catch is a rejection being classified as
 * the wrong state — a blocked camera telling someone to go buy a webcam.
 *
 * The rejection is stubbed, deliberately and unavoidably. See `stubMediaFailure`
 * for the seven flag combinations that were measured and rejected first.
 */

const CASES = [
  { name: 'NotAllowedError', failure: 'denied' },
  { name: 'NotFoundError', failure: 'no-device' },
  { name: 'NotReadableError', failure: 'in-use' },
] as const;

for (const { name, failure } of CASES) {
  test(`${name} is explained as "${failure}"`, async ({ page, request }) => {
    await stubMediaFailure(page, name);
    const code = await createMeeting(request);

    await page.goto(`/room/${code}`);

    const notice = page.getByRole('main');
    await expect(notice.getByText(MEDIA_FAILURE_COPY[failure].title)).toBeVisible({
      timeout: 20_000,
    });
    // The hint is the half people actually need, and the half a generic error
    // would drop. Asserting it separately keeps a notice that renders a title
    // over an empty body from passing.
    await expect(notice.getByText(MEDIA_FAILURE_COPY[failure].hint)).toBeVisible();

    // No other failure's title may be on screen at the same time — that is what
    // makes this a mapping assertion rather than a "some notice appeared" one.
    for (const other of CASES) {
      if (other.failure === failure) continue;
      await expect(notice.getByText(MEDIA_FAILURE_COPY[other.failure].title)).toHaveCount(0);
    }
  });
}

test('a device failure still lets you into the call', async ({ page, request }) => {
  // The lobby explains the failure and stays usable: view-only and audio-only are
  // the whole reason the notice is a state rather than a dead end.
  await stubMediaFailure(page, 'NotAllowedError');
  const code = await createMeeting(request);

  await page.goto(`/room/${code}`);
  await expect(page.getByText(MEDIA_FAILURE_COPY.denied.title)).toBeVisible({ timeout: 20_000 });

  await page.getByLabel('Your name').fill('Blocked Guest');
  await page.getByRole('button', { name: 'Join now' }).click();
  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible({ timeout: 30_000 });
});
