import { expect, type Page } from '@playwright/test';

/**
 * Lobby → call, the way every call spec starts.
 *
 * This was copy-pasted into twelve specs in seven variants before it lived here.
 * The variants reduced to two axes, both of which survive as options: the URL
 * fragment, and how far to wait.
 */

/**
 * The status strip reading exactly `Connected`.
 *
 * `exact` is the whole point, and leaving it off was a silent defect for the life
 * of the suite. `getByText('Connected')` defaults to a case-insensitive
 * *substring* match, and the strip's first state is `Disconnected` — which
 * contains it. So every wait for a connected room resolved against the room
 * before it had connected at all, and returned instantly.
 *
 * Measured, not reasoned: it let `reactions.spec.ts` fire `setAttributes` 2.7s
 * before the signal was up, where livekit-client refuses the request outright
 * (`cannot send signal request before connected`) and the raised hand is never
 * recorded — 7 failures in 40 at one worker, 24 in 40 at four. It is also why the
 * reconnect banner sometimes never appeared: `setOffline` was hitting a room that
 * had nothing to disconnect from.
 *
 * Every spec waiting on a connected room uses this rather than its own locator,
 * so the mistake has one place it could come back.
 */
export const connectedStatus = (page: Page) => page.getByText('Connected', { exact: true });

/**
 * How long to allow a room to reach `Connected`.
 *
 * This was 20s while the gate was vacuous, which means it was never a measurement
 * of anything. With a real gate it is: Playwright defaults to 4 workers on an
 * 8-core machine and the call specs open two contexts each, so the suite asks one
 * laptop for eight concurrent WebRTC sessions with synthetic video. At one worker
 * a connect landed inside 20s in 38 of 40 runs; at four, a quarter of them did
 * not.
 *
 * So this budget is about the suite's own parallelism, and it is deliberately not
 * a statement about the product — `project-overview.md`'s criterion is under 10s
 * of application time for one person on a warm deployed instance, which this
 * neither measures nor relaxes.
 */
export const CONNECT_TIMEOUT_MS = 45_000;

export type JoinUntil = 'connected' | 'mounted';

export interface JoinOptions {
  /** Appended to the room URL verbatim. The chat key, in practice. */
  hash?: string;
  /**
   * `connected` waits for the room to report Connected. `mounted` waits only for
   * the control bar, which renders as soon as the room tree does — one to three
   * seconds earlier.
   *
   * The default is `connected` because it is strictly stronger, and because the
   * gap between the two is a real source of flakiness: a screen share requested
   * while the bar is up but the room is not yet connected publishes into nothing
   * and is immediately unpublished. Pass `mounted` only when the test is about
   * that window itself.
   */
  until?: JoinUntil;
}

export async function joinAs(
  page: Page,
  code: string,
  name: string,
  options: JoinOptions = {},
): Promise<void> {
  const { hash = '', until = 'connected' } = options;

  await page.goto(`/room/${code}${hash}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Join now' }).click();

  const target =
    until === 'connected' ? connectedStatus(page) : page.getByRole('button', { name: 'Leave' });

  await expect(target).toBeVisible({ timeout: CONNECT_TIMEOUT_MS });
}
