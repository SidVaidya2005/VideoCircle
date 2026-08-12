import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Enforces the design system's non-negotiables in src/**: no raw hex or colour
// functions, no arbitrary token-covered values, no `dark:` variants, no
// backdrop-blur, no emoji. It relies on the `react` plugin that nextVitals
// registers, so it must be spread after it.
import designAdherence from './context/Design/_adherence.eslint.mjs';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...designAdherence,
  globalIgnores([
    // Defaults of eslint-config-next, restated because listing any ignore replaces them.
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Build and report output.
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    // context/ is documentation and upstream design reference, not source. ui_kits/
    // in particular is third-party JSX we read for layout and never ship.
    'context/**',
  ]),
]);

export default eslintConfig;
