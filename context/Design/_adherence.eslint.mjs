/**
 * VideoCircle design-system adherence rules.
 *
 * Replaces the upstream `_adherence.oxlintrc.json`, which could not run here:
 * the project lints with ESLint rather than oxlint, its `no-restricted-imports`
 * targeted `ui_kits/**` paths that do not exist under `src/`, and its font rule
 * permitted only IoskeleyMono — it would have flagged JetBrains Mono, the
 * typeface this project actually ships.
 *
 * WIRE IT UP in feature 02, from the project root:
 *
 *   // eslint.config.mjs
 *   import designAdherence from './context/Design/_adherence.eslint.mjs';
 *   export default [ ...nextConfig, ...designAdherence ];
 *
 * Each rule below enforces a stated non-negotiable from CLAUDE.md or
 * context/code-standards.md. If a rule and the docs ever disagree, the docs win
 * and this file is the bug.
 *
 * SCOPE: ESLint sees JavaScript and TypeScript only. It cannot lint
 * src/app/globals.css, so "no hex outside :root and @theme inline" is enforced
 * here for .ts/.tsx and by review for the stylesheet itself.
 */

/** Hex colours in any string: `#fff`, `#ff4b4b`, `bg-[#ff4b4b]`. */
const HEX = String.raw`#[0-9a-fA-F]{3,8}\b`;

/** `rgb()` / `rgba()` / `hsl()` / `oklch()` written by hand. */
const FN_COLOR = String.raw`\b(?:rgba?|hsla?|oklch|color-mix)\s*\(`;

/** Tailwind arbitrary values carrying a length or colour: `w-[327px]`, `text-[13.5px]`. */
const ARBITRARY = String.raw`-\[[^\]]*(?:\d(?:px|rem|em)|#[0-9a-fA-F]{3,8})[^\]]*\]`;

/** Emoji: pictographs, dingbats, regional indicators, and the VS16 selector. */
const EMOJI = String.raw`[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]`;

const literal = (pattern, flags = '') => `Literal[value=/${pattern}/${flags}]`;
const template = (pattern, flags = '') => `TemplateElement[value.raw=/${pattern}/${flags}]`;

/** Both plain strings and template chunks — `cn(\`bg-[#fff]\`)` must not slip through. */
const inAnyString = (pattern, flags = '') => [literal(pattern, flags), template(pattern, flags)];

const restricted = [
  ...inAnyString(HEX).map((selector) => ({
    selector,
    message:
      'Raw hex colour. Colours live only in the :root and @theme inline blocks of ' +
      'src/app/globals.css — use a token utility (bg-canvas, text-ink, signal).',
  })),
  ...inAnyString(FN_COLOR).map((selector) => ({
    selector,
    message:
      'Hand-written colour function. Use a brand token from globals.css rather than ' +
      'rgb()/hsl()/oklch() at the point of use.',
  })),
  ...inAnyString(ARBITRARY).map((selector) => ({
    selector,
    message:
      'Tailwind arbitrary value. Use the token scale; reserve arbitrary values for ' +
      'genuinely one-off geometry, with a comment explaining why.',
  })),
  ...inAnyString(String.raw`\bdark:`).map((selector) => ({
    selector,
    message:
      'This project is dark-only — the tokens are the theme. There is no light ' +
      'palette in the kit and no dark: variant anywhere.',
  })),
  ...inAnyString(String.raw`\bbackdrop-blur`).map((selector) => ({
    selector,
    message:
      'No glassmorphism. The brand uses flat semi-opaque fills — see --scrim-flat ' +
      'and --scrim-tile in colors_and_type.css.',
  })),
  ...inAnyString(EMOJI, 'u').map((selector) => ({
    selector,
    message: 'No emoji, ever. The brand is type and geometry.',
  })),
];

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...restricted],

      // Inline styles are barred except for values genuinely computed at runtime
      // (a grid column count, a tile aspect ratio). Those need a comment, which a
      // linter cannot verify — hence warn, not error.
      'react/forbid-dom-props': ['warn', {
        forbid: [{
          propName: 'style',
          message:
            'No inline style. Use token utilities; if the value is computed at ' +
            'runtime, keep the inline style and add a comment saying why.',
        }],
      }],
    },
  },
  {
    // globals.css is mirrored from the kit and is the one place literals belong.
    // Listed for the reader's benefit: ESLint does not lint CSS regardless.
    ignores: ['src/app/globals.css'],
  },
];
