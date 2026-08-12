import { expect, test } from '@playwright/test';

// Every surface must work at the project's 360px mobile floor. Measured rather
// than eyeballed: a screenshot hides a few pixels of overflow, a real phone does not.
const MOBILE = { width: 360, height: 740 };
const MIN_HIT_AREA = 44;

const ROUTES = ['/', '/tokens'] as const;

test('Home renders inside the shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'VideoCircle' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('Built by Siddarth Vaidya');
  await expect(page.getByRole('banner')).toBeVisible();
});

test('brand tokens resolve to real values', async ({ page }) => {
  await page.goto('/');

  const computed = await page.evaluate(() => {
    const probe = (cls: string, prop: string) => {
      const el = document.createElement('div');
      el.className = cls;
      document.body.appendChild(el);
      const value = getComputedStyle(el).getPropertyValue(prop);
      el.remove();
      return value;
    };
    return {
      body: getComputedStyle(document.body).backgroundColor,
      signal: probe('bg-signal', 'background-color'),
      // Proves the kit tokens whose names collide with Tailwind's own theme
      // namespaces still resolve — they depend on globals.css cascading after
      // the Tailwind import.
      radiusSm: probe('rounded-sm', 'border-top-left-radius'),
      easing: probe('ease-out-quint', 'transition-timing-function'),
    };
  });

  expect(computed.body).toBe('rgb(37, 36, 35)'); // warm near-black, never true black
  expect(computed.signal).toBe('rgb(255, 75, 75)');
  expect(computed.radiusSm).toBe('6.4px'); // 0.4rem
  expect(computed.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
});

test('the typeface is self-hosted, never fetched from Google', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) external.push(request.url());
  });

  await page.goto('/');

  expect(external).toEqual([]);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain('JetBrains Mono');
});

for (const route of ROUTES) {
  test(`${route} has no horizontal overflow at 360px`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(route);

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(overflows).toBe(false);
  });

  test(`${route} keeps every control at a 44px hit area`, async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(route);

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
  });
}

test.describe('reduced motion', () => {
  test('transitions collapse when the user asks for less motion', async ({ page }) => {
    // Emulated on the page rather than via test.use({ reducedMotion }), which did
    // not reach the context under this config — matchMedia still reported false.
    // The assertion below proves the emulation actually took.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/tokens');

    const { matches, duration } = await page.evaluate(() => {
      const el = document.createElement('div');
      el.className = 'transition-colors duration-(--duration-base)';
      document.body.appendChild(el);
      const value = getComputedStyle(el).transitionDuration;
      el.remove();
      return {
        matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: value,
      };
    });

    // Guards the guard: if the emulation silently stops applying, the duration
    // assertion below would pass for the wrong reason.
    expect(matches).toBe(true);

    // Chrome serialises 0.01ms as "1e-05s", so compare numerically rather than
    // asserting a string the browser is free to format however it likes.
    expect(Number.parseFloat(duration)).toBeLessThan(0.001);
  });
});
