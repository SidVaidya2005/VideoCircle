# VideoCircle

A browser-based video calling product where anyone can start a meeting and share a
link that a guest can open and join without an account, signing in with Google only if they want their
call history — with screen sharing and an in-meeting chat that is end-to-end
encrypted using a key carried in the link's fragment.

## Project context lives in `context/`

The `context/` folder is the source of truth for this project. **Read it before
writing any code**, and keep it current as you work.

**Read in full, in this order** — these orient you and are cheap:

1. **`context/project-overview.md`** — what the product is, who it's for, what's in and out of scope.
2. **`context/architecture.md`** — stack, folder structure, system boundaries, data model, and the **invariants you must never violate**.
3. **`context/code-standards.md`** — the rules every change must follow.
4. **`context/progress-tracker.md`** — what's done, in progress, and next.
5. **`context/constraints.md`** — what still binds from earlier decisions.

**Read by section, never end to end** — these are lookup tables, and reading
them whole costs more than the task needs:

6. **`context/library-docs.md`** — open only the section for the library you are about to use.
7. **`context/build-plan.md`** — open only the feature you are building, plus its phase heading.

**Do not read at session start:** `context/build-journal.md`. It grows for the
life of the project; open it only to reconstruct one specific feature's history.

**`context/Design/`** is the VideoCircle design system — the visual source of truth,
adapted from the MIT-licensed Anime.js kit (see its README's Provenance section).
Read `context/Design/README.md` in full before designing any surface, and lift from
`context/Design/preview/*.html`, which are the liftable specimens.
`context/Design/ui_kits/` is upstream reference only — read it for layout, never
copy it into `src/`. Nothing under `src/` imports from the folder: assets are
copied into `public/brand/`, tokens are mirrored into `src/app/globals.css`.

## Standing rules

- **Read `context/` first.** Never assume — verify against `project-overview.md` and `architecture.md`.
- **Obey the invariants** in `architecture.md`. They are non-negotiable.
- **Follow `code-standards.md`** on every change.
- **For libraries**, follow the authority order: **Context7** (`resolve-library-id` → `query-docs`) → skills (per this file) → `context/library-docs.md` → official docs via web search. Never write an API shape from training-data memory — if none of those answers it, ask.
- **Stay in scope.** Build only what the current feature in `build-plan.md` requires.
- **Use logical commits.** Keep each commit focused, easy to review, and in a working state whenever possible.
- **Number every commit subject `<phase>.<feature>.<n>`**, followed by a plain lowercase imperative summary — `2.05.1 wire lobby mic toggle`, then `2.05.2`, `2.05.3`. `<phase>` and `<feature>` are the current phase and feature numbers from `build-plan.md`, feature written with the same two digits `build-plan.md` uses. **`<n>` starts at `1` for every feature and counts only within that feature** — the first commit of feature 06 is `2.06.1`, never a continuation of feature 05's numbering. To find the next `<n>`, list that feature's commits (`git log --oneline --grep "^<phase>.<feature>\."`) and add one; if there are none, it is `1`. Do not zero-pad `<n>`.
- **Reserve feature `00` for work that isn't a numbered feature.** Phase checkpoints, chores, and fixes outside a feature use `<phase>.00.<n>` (`2.00.1 phase 2 checkpoint`); anything before Phase 1 begins uses `0.00.<n>` (`0.00.1 init repo + context docs`). Each `<phase>.00` bucket has its own counter starting at `1`, exactly like a feature.
- **Ask before committing.** Never create a commit without explicit user approval, and never add coauthors unless the user explicitly requests them.
- **Checkpoint every phase.** Before moving to the next phase, run the relevant verification commands, inspect the phase diff, check for obvious bugs/regressions, confirm code consistency, update `progress-tracker.md`, compact `build-journal.md` (see below), and record any follow-up work.
- **Reconcile `architecture.md` at every checkpoint.** Walk the phase diff against it and correct anything that is now untrue — the folder tree, the data model, route lists, boundaries, invariants. A stale architecture doc is worse than a long one: length costs tokens, staleness costs correctness, and an agent that trusts a wrong invariant will write wrong code. This is the main way a self-sufficient `context/` decays.
- **Update `progress-tracker.md`** after every completed feature — tick the box, **overwrite** Current Status (never append to it; it holds only the latest state), and add the single most important decision to the top of "Key Decisions". That section holds the 10 most recent decisions, newest first — when adding an 11th, file the oldest under its topic in `context/constraints.md`.
- **Read `context/constraints.md`** before any decision that might conflict with past work. It is grouped by topic and holds only what still binds, so it stays short and cheap to read.
- **`context/` must stand on its own.** Someone with no access to `src/` should be able to read `context/` and understand what this product is, how it is built, why it is built that way, and what the rules are. **Length is not a defect** — `architecture.md` and `code-standards.md` are long because invariants, the data model, and the canonical patterns earn their space. Never delete an explanation because "the code makes it obvious": the reader may not have the code.
- **Cut redundancy, never coverage.** The thing to remove from a reference doc is a *restatement* of something that already has a home elsewhere, not the only account of how something works. When adding, prefer tightening or replacing an existing passage over appending a near-duplicate. Detail needed by exactly one feature belongs in that feature's `build-plan.md` entry.
- **State a rule once, and name its home.** A principle may be repeated across files, but a *specific* — a path, a filename, a tool name, a literal value — is written in exactly one place and referenced from everywhere else. Duplicated specifics drift silently; duplicated principles do not.
- **Append to `context/build-journal.md`** after each completed feature — a dated entry with the decisions made, gotchas hit, and verification results. **Never read this file at session start**; it grows for the life of the project. Open it only to reconstruct one specific feature's history.
- **Compact `build-journal.md` at phase checkpoints**, never continuously: promote that phase's still-binding decisions into `constraints.md` under their topic, collapse its per-feature entries into a few summary bullets, and drop the `Verified:` lines. Never remove a constraint that still binds. `git` history holds anything removed, so compact confidently.

## Project-specific cautions

- **Secrets have exactly one home each.** `SUPABASE_SERVICE_ROLE_KEY` lives only in `src/lib/supabase/admin.ts`; `LIVEKIT_API_SECRET` lives only in `src/lib/livekit/token.ts`. Both files start with `import 'server-only'`.
- **The chat key must never reach the server.** It is read from `window.location.hash` and nowhere else, and never appears in a request, a log, or the database. The one permitted detour is `sessionStorage` across the OAuth round trip, which never leaves the browser — the fragment is restored before anything reads it. See `library-docs.md` → Google sign-in.
- **Two-participant features need two participants to verify.** Use two browser contexts, or a phone and a laptop. A call that works alone has not been tested.
- **Mobile is a requirement, not a polish pass.** Every layout is built mobile-first and must work at 360px on real iOS Safari and Android Chrome.
- **The design system is non-negotiable in six specific ways.** Warm near-black `#252423`, never true black. One typeface, everywhere. Red `#ff4b4b` is the signal, used sparingly — the engaged state of a control is a white fill, not red. **No emoji, no generated illustrations.** Motion uses the kit's own easing curves. Wide-tracked SCREAMING CAPS for overlines and control labels.
- **Dark only.** The kit ships no light palette, so there is no theme toggle and no `dark:` variant anywhere.
- **Literal values live in one file.** Colours, radii, type sizes, and easings appear only in the `:root` and `@theme inline` blocks of `src/app/globals.css`. A hex anywhere else in `src/` is a bug.
- **No JS-driven animation inside the call.** `animejs` is for Home, the lobby, and sign-in; inside `<LiveKitRoom>` it competes with WebRTC encoding for the main thread. Use CSS transitions with the brand easings there.

## Commands

**These do not work yet.** The repo currently holds only `CLAUDE.md`, `README.md`,
`LICENSE`, and `context/`; feature 01 creates `package.json` and the configs that
make them real.

- `npm run dev` — start the Next.js dev server on `localhost:3000`
- `npm run build` — production build
- `npm run start` — serve the production build (what Render runs)
- `npm run lint` — ESLint
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright end-to-end tests
- `npx shadcn@latest add <component>` — add a UI primitive into `src/components/ui/`
- `npx supabase migration new <name>` — create a new SQL migration
- `npx supabase db push` — apply migrations to the Supabase project

## Tooling available in this project

- **Context7 MCP** — `resolve-library-id` then `query-docs` for current docs on Next.js, LiveKit, Supabase, Tailwind, Zod, and everything else in the stack. Use it before writing any API call from memory.
- **Supabase MCP** *(may not be present)* — `list_tables`, `execute_sql`, `generate_typescript_types`, `get_advisors`, `get_logs`. The tools are deferred: fetch them by name with `ToolSearch` and confirm they resolve before relying on them, and note they need a Supabase project to exist first (feature 03). The `supabase` CLI does everything they do, so treat the server as a convenience, never a requirement. Schema changes are always files in `supabase/migrations/` — see `library-docs.md` for why `apply_migration` is the wrong tool mid-iteration. Check for RLS findings after every migration.
- **`supabase:supabase` skill** — Supabase auth, RLS, and SSR patterns. Load it before any task touching Supabase Auth or row-level security.
- **Playwright MCP / `claude-in-chrome`** — driving a real browser to verify call flows, which is the only way to test most of this product.
