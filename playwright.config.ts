import { defineConfig, devices } from '@playwright/test';

// Deliberately NOT 3000. With `reuseExistingServer`, anything already holding the
// dev port gets reused — a leftover `next start`, or an editor's port-forwarding
// helper — and the suite then tests something other than what it just built. That
// failed confusingly once: a stale production server made the dev-only /tokens
// route 404 and five unrelated tests went red. A dedicated port removes the class
// of problem rather than the instance.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  // Two-participant flows need two contexts running at once; never serialise them away.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    permissions: ['camera', 'microphone'],
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Chromium-only, which is why they are scoped to this project rather than
          // to `use` at the top level.
          args: [
            '--use-fake-ui-for-media-stream', // auto-grant the permission prompt
            '--use-fake-device-for-media-stream', // synthetic camera and mic
          ],
        },
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run build && npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
