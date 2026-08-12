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
