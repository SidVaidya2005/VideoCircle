# VideoCircle

A browser-based video calling product where anyone can start a meeting and share a
link to join instantly as a guest, signing in with Google only if they want their
call history — with screen sharing and an in-meeting chat that is end-to-end
encrypted using a key carried in the link's fragment.

## Project context lives in `context/`

The `context/` folder is the source of truth for this project. **Read it before
writing any code**, and keep it current as you work. Read in this order:

1. **`context/project-overview.md`** — what the product is, who it's for, what's in and out of scope.
2. **`context/architecture.md`** — stack, folder structure, system boundaries, data model, and the **invariants you must never violate**.
3. **`context/code-standards.md`** — the rules every change must follow.
4. **`context/library-docs.md`** — project-specific usage patterns for each library (read the relevant section before using one).
5. **`context/build-plan.md`** — the ordered phases and features to build.
6. **`context/progress-tracker.md`** — what's done, in progress, and next.

**`context/Design/`** is the Anime.js brand kit this project is built on — the visual
source of truth. Read `context/Design/README.md` in full before designing any
surface, and lift from `context/Design/preview/*.html` and `context/Design/ui_kits/`
rather than interpreting the rules from scratch. Nothing under `src/` imports from
it: assets are copied into `public/brand/`, tokens are mirrored into
`src/app/globals.css`.

## Standing rules

- **Read `context/` first.** Never assume — verify against `project-overview.md` and `architecture.md`.
- **Obey the invariants** in `architecture.md`. They are non-negotiable.
- **Follow `code-standards.md`** on every change.
- **For libraries**, follow the authority order: **Context7** (`resolve-library-id` → `query-docs`) → skills (per this file) → `context/library-docs.md` → general knowledge. If Context7 has no match, use web search for official docs — never rely on training-data memory for API shapes.
- **Stay in scope.** Build only what the current feature in `build-plan.md` requires.
- **Update `progress-tracker.md`** after every completed feature — check the box, set current status, and add the single most important decision to "Key Decisions" (cap ~10 bullets).
- **Archive detail in `build-journal.md`** — after each feature, append a dated entry with full decisions, gotchas, and verification results. Prune `progress-tracker.md` "Key Decisions" into here when it exceeds ~10 bullets. Consult it when revisiting a completed feature, investigating a regression, or making a decision that might conflict with past work.

## Project-specific cautions

- **Secrets have exactly one home each.** `SUPABASE_SERVICE_ROLE_KEY` lives only in `src/lib/supabase/admin.ts`; `LIVEKIT_API_SECRET` lives only in `src/lib/livekit/token.ts`. Both files start with `import 'server-only'`.
- **The chat key must never reach the server.** It is read from `window.location.hash` and nowhere else, and never appears in a request, a log, or the database.
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
