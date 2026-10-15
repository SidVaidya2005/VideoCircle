# VideoCircle

VideoCircle is a video calling product that runs in a browser. Anyone can start a
meeting and share a link. Guests can join without an account; Google sign-in is
only needed for call history. Calls include screen sharing and end-to-end encrypted
chat. The chat key is carried in the link's fragment, the part after `#`.

## Project context lives in `context/`

The `context/` folder is the source of truth for this project. Read it before
writing any code, and keep it current as you work.

Read these files in full, in this order, to understand the project:

1. `context/project-overview.md`: what the product is, who it is for, and what is in and out of scope.
2. `context/architecture.md`: the stack, folder structure, system boundaries, data model, and invariants (rules that must always hold).
3. `context/code-standards.md`: the rules every change must follow.
4. `context/progress-tracker.md`: what is done, in progress, and next.
5. `context/constraints.md`: earlier decisions that still apply.

Use these as references. Read only the relevant section, never the whole file:

6. `context/library-docs.md`: the library you are about to use.
7. `context/build-plan.md`: the feature you are building and its phase heading.

Do not read `context/build-journal.md` at session start. It grows throughout the
project. Open it only to reconstruct the history of a specific feature.

`context/Design/` contains the VideoCircle design system and is the source of truth
for its appearance. It is adapted from the MIT-licensed Anime.js kit; see its
README's Provenance section. Read `context/Design/README.md` in full before
designing any surface. Use the examples in `context/Design/preview/*.html` as the
starting point for implementation.

`context/Design/ui_kits/` contains upstream references for layout ideas only. Never
copy those files into `src/`. Nothing under `src/` imports from the design folder:
assets are copied into `public/brand/`, and tokens are mirrored into
`src/app/globals.css`.

## Standing rules

### Before making a change

- Read `context/` first. Check assumptions against `project-overview.md` and `architecture.md`.
- Always obey the invariants in `architecture.md` and follow `code-standards.md` on every change.
- Build only what the current feature in `build-plan.md` requires.
- Before a decision that might conflict with earlier work, read `context/constraints.md`. It is grouped by topic and keeps only decisions that still apply, so it stays short and quick to read.
- For library APIs, use this authority order: Context7 (`resolve-library-id` → `query-docs`), then skills listed in this file, then `context/library-docs.md`, then official docs via web search. Never write an API shape from training-data memory. If none of these sources answers the question, ask.

### Commits

Keep each commit focused, easy to review, and in a working state whenever possible.
Never create a commit without explicit user approval. Never add coauthors unless
the user explicitly requests them.

Every commit subject starts with `<phase>.<feature>.<n>`, followed by a plain
lowercase imperative summary, such as `2.05.1 wire lobby mic toggle`, then
`2.05.2`, `2.05.3`.

- Take `<phase>` and `<feature>` from the current phase and feature in `build-plan.md`. Keep the feature's two-digit format.
- Start `<n>` at `1` for each feature and count only that feature's commits. Feature 06 starts at `2.06.1`; it does not continue feature 05's counter. Do not zero-pad `<n>`.
- To find the next `<n>`, list the feature's commits with `git log --oneline --grep "^<phase>.<feature>\."` and add one. If there are none, use `1`.
- Use feature `00` for phase checkpoints, chores, and fixes outside a numbered feature: `<phase>.00.<n>`, such as `2.00.1 phase 2 checkpoint`. Before Phase 1 begins, use `0.00.<n>`, such as `0.00.1 init repo + context docs`. Each `<phase>.00` has its own counter starting at `1`.

### After completing a feature

1. Tick its checkbox in `progress-tracker.md`.
2. Overwrite Current Status with the latest state. Never append previous statuses.
3. Add the single most important decision to the top of "Key Decisions". Keep the 10 most recent decisions, newest first. When adding an 11th, move the oldest to its topic in `context/constraints.md`.
4. Append a dated entry to `context/build-journal.md` with decisions, problems encountered, and verification results. Its reading rule still applies: open it only for a specific feature's history, never at session start.

### At each phase checkpoint

Before moving to the next phase:

1. Run the relevant verification commands and inspect the phase diff.
2. Check for obvious bugs and regressions, and confirm code consistency.
3. Compare the diff with `architecture.md`. Correct anything that is now inaccurate, including the folder tree, data model, route lists, boundaries, and invariants. Stale architecture can lead an agent to write incorrect code; keeping it accurate matters more than keeping it short.
4. Update `progress-tracker.md` and record any follow-up work.
5. Compact `build-journal.md`: move that phase's decisions that still apply into `constraints.md` under their topics, reduce per-feature entries to a few summary bullets, and remove `Verified:` lines. Never remove a constraint that still applies. `git` history keeps the removed detail.

Compact the journal only at phase checkpoints, not continuously. Checking the
architecture at each checkpoint is the main protection against the self-contained
context becoming inaccurate over time.

### Keeping the documentation useful

`context/` must explain the product, its implementation, the reasons behind its
design, and its rules to someone who cannot access `src/`. Length alone is not a
problem. The invariants, data model, and standard implementation patterns in
`architecture.md` and `code-standards.md` need their explanations. Never remove one
because "the code makes it obvious"; the reader may not have the code.

Remove repeated explanations, but keep every distinct detail. When adding content,
tighten or replace an existing passage rather than adding a near-duplicate. Details
needed by only one feature belong in that feature's `build-plan.md` entry.

A principle may appear in several files. A specific path, filename, tool name, or
literal value must be stated in exactly one place and referenced from elsewhere.
Repeated specifics can fall out of sync without anyone noticing; repeating a
principle does not cause that problem. State each rule once and name its home.

## Project-specific cautions

- Each secret has exactly one home: `SUPABASE_SERVICE_ROLE_KEY` in `src/lib/supabase/admin.ts`, and `LIVEKIT_API_SECRET` in `src/lib/livekit/token.ts`. Both files start with `import 'server-only'`.
- The chat key must never reach the server, a request, a log, or the database. Read it only from `window.location.hash`. The sole exception is storing it in `sessionStorage` during the OAuth round trip, which stays in the browser. Restore the fragment before anything reads it. See `library-docs.md` → Google sign-in.
- Verify features involving two participants with two participants: use two browser contexts, or a phone and a laptop. A solo call does not verify those features.
- Build every layout mobile-first. It must work at 360px on real iOS Safari and Android Chrome; mobile support is required from the start.
- Follow all six design rules: warm near-black `#252423`, never true black; one typeface everywhere; signal red `#ff4b4b` used sparingly, with white fill for engaged controls; no emoji or generated illustrations; the kit's own easing curves; and wide-tracked SCREAMING CAPS for overlines and control labels.
- Use dark mode only. The kit has no light palette, so there is no theme toggle and no `dark:` variant anywhere.
- Keep literal colours, radii, type sizes, and easings only in the `:root` and `@theme inline` blocks of `src/app/globals.css`. A hex anywhere else in `src/` is a bug.
- Use CSS transitions with the brand easings inside the call. `animejs` is for Home, the lobby, and sign-in. Inside `<LiveKitRoom>`, JS-driven animation competes with WebRTC encoding for the main thread and is forbidden.

## Commands

- `npm run dev`: start the Next.js dev server on `localhost:3000`.
- `npm run build`: create a production build.
- `npm run start`: serve the production build; this is what Render runs.
- `npm run lint`: run ESLint, Prettier `--check`, then `context/Design/_verify.mjs` to check for design and context drift.
- `npm run format`: run Prettier `--write`. Use this instead of formatting a file by hand. `src/app/globals.css` is deliberately ignored because it mirrors the kit.
- `npm run typecheck`: run `tsc --noEmit` for faster feedback than a full build.
- `npm run test`: run Vitest unit tests.
- `npm run test:e2e`: run Playwright end-to-end tests. Run `npx playwright install chromium` once first.
- `npx shadcn@latest add <component>`: add a UI primitive to `src/components/ui/`.
- `npx supabase migration new <name>`: create a SQL migration.
- `npx supabase db push`: apply migrations to the Supabase project.

## Tooling available in this project

- Context7 MCP: use `resolve-library-id`, then `query-docs`, for current docs on Next.js, LiveKit, Supabase, Tailwind, Zod, and the rest of the stack. Consult it before writing any API call from memory.
- Supabase MCP may be available: `list_tables`, `execute_sql`, `generate_typescript_types`, `get_advisors`, `get_logs`. Fetch these deferred tools by name with `ToolSearch` and confirm they resolve before relying on them. They require a Supabase project, created in feature 03. The `supabase` CLI can do everything they do, so the MCP server is optional. Always put schema changes in `supabase/migrations/`; see `library-docs.md` for why `apply_migration` is wrong during iteration. Check for RLS findings after every migration.
- The `supabase:supabase` skill covers Supabase auth, RLS, and SSR patterns. Load it before any task involving Supabase Auth or row-level security.
- Playwright MCP / `claude-in-chrome`: use a real browser to verify call flows. Most of this product can only be tested that way.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
