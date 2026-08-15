import { expect, type Page } from '@playwright/test';

/**
 * Lobby → call, the way every call spec starts.
 *
 * This was copy-pasted into twelve specs in seven variants before it lived here.
 * The variants reduced to two axes, both of which survive as options: the URL
 * fragment, and how far to wait.
 */

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
    until === 'connected'
      ? page.getByText('Connected')
      : page.getByRole('button', { name: 'Leave' });

  await expect(target).toBeVisible({ timeout: 20_000 });
}
