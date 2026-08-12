import { expect, test } from '@playwright/test';

test('Home renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'VideoCircle' })).toBeVisible();
});

test('Home has no horizontal overflow at 360px', async ({ page }) => {
  // 360px is the project's mobile floor. Measured rather than eyeballed, because a
  // screenshot hides a few pixels of overflow and a real phone does not.
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});
