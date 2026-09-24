import { expect, test } from '@playwright/test';

import { createAccount, deleteAccount, signIn } from './support/session';

/**
 * Sign out, driven through the real account menu.
 *
 * This had no coverage until it broke in production: the form lived inside the
 * dropdown's content, choosing the item unmounted that content before the click's
 * default action ran, and Chrome drops the submission of a disconnected form without
 * a request or an error. So the assertion that matters is the POST itself — a test
 * that only checked for SIGN IN could pass on a page that never asked the server.
 */

const BASE_URL = 'http://localhost:3100';

test('Sign out in the account menu ends the session', async ({ page, context }) => {
  const account = await createAccount();

  try {
    await signIn(context, account.email, BASE_URL);
    await page.goto('/');

    const menu = page.getByRole('button', { name: `Account menu for ${account.displayName}` });
    await expect(menu).toBeVisible();
    await menu.click();

    const signOut = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/auth/signout',
    );
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await signOut;

    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();

    // The server agrees, not just the page that was rendered on the way back.
    await page.reload();
    await expect(page.getByRole('button', { name: 'SIGN IN' })).toBeVisible();
    await expect(menu).toHaveCount(0);
  } finally {
    await deleteAccount(account.userId);
  }
});
