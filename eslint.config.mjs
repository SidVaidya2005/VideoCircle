import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// The design-system adherence fragment (context/Design/_adherence.eslint.mjs) is
// wired in during feature 02, alongside the tokens it enforces.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
