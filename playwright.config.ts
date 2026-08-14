import { readFileSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * Puts `.env.local` into the suite's own process.
 *
 * Next loads that file for the server it starts, but the Playwright process is
 * plain Node and inherits nothing — and the webhook spec has to sign payloads with
 * `LIVEKIT_API_SECRET` and read rows back with the service-role key. A real
 * environment variable always wins, so CI keeps supplying its own, and a missing
 * file is not an error for the same reason.
 *
 * Deliberately not a dotenv dependency: this reads `KEY=value` and nothing else,
 * which is all this file has ever contained.
 */
function loadEnvLocal(): void {
  let contents;
  try {
    contents = readFileSync('.env.local', 'utf8');
  } catch {
    return; // CI supplies these directly.
  }

  for (const line of contents.split('\n')) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    const key = match?.[1];
    const rawValue = match?.[2];
    if (!key || rawValue === undefined || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
}

loadEnvLocal();

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
