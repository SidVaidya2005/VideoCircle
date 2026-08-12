<!-- TEMPLATE (setup-context) — created EMPTY; do NOT fill at initialization. The
     agent appends an entry after each completed feature and compacts at phase
     checkpoints, deleting this banner before the first entry. KEEP the
     > **Role:** blockquote AND the "How this file is maintained" section — both
     are permanent documentation, not scaffolding. -->

# Build Journal

> **Role:** The dated record of how the build got here — one entry per completed feature.
> **Append after every completed feature**; **compact at every phase checkpoint.**
> **Do not read this file at session start.** Open it only to reconstruct one specific feature's history; the rules that still bind live in `constraints.md`.

## How this file is maintained

This file grows for the life of the project and is **not** part of the session
read order. Nothing here is required to make a decision — anything that still
constrains future work gets promoted to `constraints.md`, which is the file
consulted during ordinary work. That separation is what keeps the cost of
knowing "what binds" from growing with the length of the build.

- **Append a dated entry after every completed feature**, under the current phase: decisions made, gotchas hit, verification results.
- **Compact at every phase checkpoint, never continuously.** When a phase closes:
  1. **Promote** anything from that phase that still binds into `constraints.md`, filed under its topic.
  2. **Collapse** the phase's per-feature entries into a handful of summary bullets.
  3. **Drop every `Verified:` line** — it has done its job once the next feature passes.
- Only the current phase keeps full per-feature detail. Earlier phases stay compacted, newest first.

Compaction is recoverable: this file is committed, so `git` history holds every
detail ever removed. Compact confidently.

<!-- Newest phase first. Entry format — repeat per completed feature:

## Phase {{N}} — {{PHASE_NAME}}

### Feature {{NN}} — {{FEATURE_NAME}}  *(YYYY-MM-DD)*
- Decision: …
- Gotcha: …
- Verified: …

At that phase's checkpoint, the whole phase collapses to:

## Phase {{N}} — {{PHASE_NAME}} *(compacted)*
- {{SUMMARY_BULLET}} (F{{NN}}–F{{NN}})

-->

## Phase 0 — Foundation

### Feature 02 — Design tokens and UI primitives  *(2026-08-12)*

- Decision: **~70 tokens mirrored into `:root`, `@theme inline` reduced to pure `var()` mapping.** Previously the radii, type scale, tracking and easings lived as literals inside `@theme inline`, where nothing compared them to the kit. The 16-hue chromatic palette (96 values) stays out — `Design/README.md` calls it "available, rarely correct" — as do upstream's `--br` / `--padding` / `--input-border-radius` aliases, which duplicate tokens we keep.
- Decision: **`_verify.mjs` check #1 is now three-way** — kit, `library-docs.md`, and `globals.css` must all agree, and it also asserts no copy silently omits a token the other carries. The stylesheet that actually renders was the one copy nothing checked. A second check asserts the Tailwind import stays above `:root`.
- Decision: **the shell is a `(shell)` route group.** Home moved to `src/app/(shell)/page.tsx`; `/room/[code]` will sit outside it. The footer specimen says "never inside the call", and a route group makes that structural rather than remembered.
- Decision: **only `button` was installed from shadcn**, against `build-plan.md`'s list of eight. Nothing in this feature mounts a dialog, sheet, dropdown, tooltip, input, avatar or toast, and `code-standards.md` says add only what a feature needs. `build-plan.md` amended.
- Gotcha: **five kit token families collide with Tailwind 4's theme namespaces** (`--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--ease-*`). Tailwind emits a self-referential `--radius-lg: var(--radius-lg)`, which resolves only because our `:root` cascades after it. Measured by compiling both a self-named and a prefixed variant before committing to the approach; self-named works and keeps the kit's original names, so the ordering is now asserted rather than assumed.
- Gotcha: **the wordmark's `top: 0.30em` from `preview/logo.html` collides with the glyph in JetBrains Mono.** Measured the shipped face via canvas `TextMetrics` — dotless `ı` ink tops at 0.550em, the dotted `i` tittle at 0.786em, font ascent 1.020em — giving `top: 0.234em`. Promoted to `constraints.md`, since any specimen value tied to glyph metrics needs the same treatment.
- Gotcha: **the wordmark had no usable accessible name.** `inline-flex` makes the inner span a flex item, so the computed name became "videoc ı rcle" and U+0131 was announced as its own character. Fixed with `role="img"` + `aria-label="videocircle"`; found because an e2e locator could not match the heading.
- Gotcha: **the generated button violated six rules at once** — `dark:` variants, `shadow-xs`, `rounded-md`, `font-medium` (only 400/700 are loaded), `ring-[3px]`, and 36px hit areas. All corrected; `xs` and `icon-xs` removed, since 24px can never clear the 44px floor. Recorded here so a later `shadcn add` does not silently revert it.
- Gotcha: **`shadcn add` installed `radix-ui` but not `class-variance-authority`**, which the generated file imports — the build failed until it was added. Current shadcn also imports from the single `radix-ui` package rather than the `@radix-ui/*` scope; `code-standards.md`'s approved list updated.
- Gotcha: `test.use({ reducedMotion: 'reduce' })` did not reach the context under this config — `matchMedia` still reported false. Switched to `page.emulateMedia()`, and the test now asserts the emulation took before asserting its effect.
- Gotcha: I ran `git checkout -- src/app/globals.css` to undo a deliberate break and destroyed the uncommitted feature work in that file. Recovered in full from the verbatim copy in `library-docs.md` — an unplanned benefit of the three-way mirror. Use a scratch copy, not `git checkout`, to revert an adversarial edit to an uncommitted file.
- Verified: `typecheck`, `lint`, `test`, `build`, `test:e2e` (8 passing) all exit 0. In the browser: `body` computes to `rgb(37, 36, 35)`, `bg-signal` to `rgb(255, 75, 75)`, `rounded-sm` to 6.4px, `ease-out-quint` to its cubic-bezier — the last proving the colliding-namespace tokens resolve. JetBrains Mono serves from `/_next/static/media/*.woff2` with zero requests to Google. `/tokens` returns 200 in dev and 404 in production.
- Verified adversarially: a hex, an `rgba()`, an arbitrary value, a `dark:` variant, a `backdrop-blur` and an emoji each fail `npm run lint`; a drifted token in `globals.css` fails it by name; moving the Tailwind import below `:root` fails the cascade-order check.

### Feature 01 — Project scaffold and tooling  *(2026-08-12)*

- Decision: **TypeScript 6.0.3, not 7.** `typescript-eslint` carries a runtime guard that throws on TS 7 and aborts ESLint from inside `eslint-config-next`'s entry point, so the entire config dies rather than just the typed rules. Three alternatives were tested in a scratch project before deciding: npm `overrides` (silences the peer warning, not the guard); the official `@typescript/typescript6` side-by-side shim (ESLint works, but `next build` then reports "you do not have the required package(s) installed"); and a nested TS 6 under `typescript-eslint` via overrides (npm will not nest a peer dependency). Promoted to `constraints.md` → Tooling.
- Decision: **ESLint 9, not 10.** Independent of TypeScript — `eslint-plugin-react` inside `eslint-config-next` calls the pre-10 rule context API and throws `contextOrFilename.getFilename is not a function`.
- Decision: **`env` split into `env.ts` (public) and `env.server.ts` (secrets).** The single schema documented in `library-docs.md` would have thrown on the first browser import of `src/lib/supabase/client.ts`, since Next replaces non-public `process.env` reads with `undefined` client-side. `architecture.md`, `code-standards.md`, and `library-docs.md` were corrected.
- Decision: **`globals.css` ships almost empty.** The token mirror lands whole in F02; a half-copied mirror is the drift the mirror rule exists to prevent. Placeholder Home is deliberately unstyled until then.
- Decision: **`_verify.mjs` wired into `lint` at F01**, matching the script's own header rather than `build-plan.md`'s F02 note. `build-plan.md` corrected.
- Gotcha: **`create-next-app` refuses a directory containing `CLAUDE.md`, `context/`, or `README.md`** — its conflict allowlist covers only `.git`, `.gitignore`, `LICENSE`, `.vscode`, `docs` and similar. Scaffolded into a scratch directory and copied the configs across.
- Gotcha: **`z.url()` accepts `localhost:3000`**, parsing it as a URL whose scheme is `localhost`. Caught by a unit test that was expected to pass and failed. Both public URL fields now carry a `protocol` option; the same weakness was in `library-docs.md` and has been fixed there.
- Gotcha: **Turbopack inferred a project root above the repository** because of a stray `package-lock.json` in the home directory. Pinned `turbopack.root` in `next.config.ts`.
- Gotcha: `vitest.config.ts` triggered a Vite config-loader warning about ESM in a CJS-loaded file; renamed to `.mts`, which `tsconfig.json` already includes.
- Gotcha: `next dev` appends a `nextjs-agent-rules` block to `CLAUDE.md` and re-adds it if removed. Left in place; it is meant to be committed.
- Verified: from `rm -rf node_modules package-lock.json && npm install` — `typecheck`, `lint`, `test` (8 passing), `build`, and `test:e2e` (2 passing) all exit 0. `npm run start` serves Home at HTTP 200. `build` succeeds with **no `.env.local`**, because nothing yet imports `env`.
- Verified adversarially, since a gate that passes on clean code proves nothing: `_verify.mjs` fails on a deliberately drifted token; ESLint errors on a deliberate `any`; `next build` fails with a `server-only` error when a Client Component imports `env.server.ts`. The `@/*` alias resolves under `tsc`, Vitest, and Turbopack.

**Follow-on within feature 02 — wordmark and Home surface *(2026-08-12)***

- Decision: **the wordmark is PascalCase with a red square on BOTH i's**, at the owner's direction. `Design/README.md`, `preview/logo.html`, `wordmark.svg` (kit + `public/brand/`), and `wordmark.tsx` all updated together; the spec now records why two reds do not breach "used sparingly" — the mark carries no state, so it cannot compete with Leave for meaning.
- Gotcha: **the tittle was centred on the advance box, not the letter.** `left: 50%` puts it at 0.300em, but JetBrains Mono centres the `i` stem at 0.245em and its own tittle at 0.250em — a 3.08px error at 56px, invisible at 16px and obvious at hero size. Fixed to `left: 0.25em`; measured by rasterising the glyph and scanning painted pixels, then re-measured against the rendered stem (0.28px residual). The same box-centred error existed independently in the SVG and in `preview/logo.html`; both corrected.
- Gotcha: **during the font-swap window the dot is ~3.5px off.** `next/font` generates a metric-adjusted fallback that matches advance and ascent but not glyph shapes — its stem sits at 0.188em against an 0.374em advance. Transient, first paint only. Accepted rather than switching to `display: 'block'`, which would trade a sub-second cosmetic artefact for a flash of invisible text on an already-cold Render instance.
- Decision: **Home's visual surface built now, behaviour deferred to F05/F06**, following `ui_kits/site/` for layout: hero with overline and dual CTA, a mock call preview, a three-step strip, and a six-card feature grid. The two hero controls are styled but inert — `/api/meetings` and Supabase do not exist yet. `build-plan.md`'s F05 entry records this.
- Decision: **looping motion on Home, in CSS not `animejs`.** The kit's own site components animate with `@keyframes` plus staggered `animation-delay` (`Hero.jsx:68`), so there is no reason to spend bundle on a JS engine. Verified that `prefers-reduced-motion` collapses every loop: iteration count drops from `infinite` to `1` and duration to `0.01ms`.
- Decision: **the call preview is one `role="img"` with a written description**, and its controls are `span`s, not buttons — it is a picture of a UI, so nothing in it belongs in the tab order or has to clear a 44px target. It also deliberately omits `.grid-backdrop`, since a mock that breaks the no-grid-over-video rule teaches the wrong pattern to whoever builds the real grid.
- Decision: section containers widened to `max-w-5xl`, header and footer with them, while prose stays capped at `max-w-2xl`. The line-length rule is about text; a three-column grid at `max-w-3xl` was cramped.
- Gotcha: I ran `git checkout --` on an uncommitted file for the second time this feature. Recovered again from `library-docs.md`. Stop doing this: back up to the scratchpad before any adversarial edit.
- Verified: `typecheck`, `lint`, `test`, `build`, `test:e2e` (8 passing) all exit 0. At 360px the page has no horizontal overflow and every control clears 44px. The speaking ring, level bars, and live dot all run; reduced motion stops them.
