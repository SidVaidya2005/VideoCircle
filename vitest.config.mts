import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic only — crypto, room codes, formatting. Nothing here needs a DOM.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Mirrors the `@/*` path in tsconfig.json. Set by hand rather than via a
      // tsconfig-paths plugin, which would be a dependency the project has not approved.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
