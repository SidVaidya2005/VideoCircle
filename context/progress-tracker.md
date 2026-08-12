# Progress Tracker

> **Role:** Live build status — what's done, in progress, and next.
> **Read at the start of every session**; **update after every completed feature.**
> **Relates to:** mirrors `build-plan.md` exactly; evicts old decisions to `constraints.md`.

Any AI agent reading this should immediately know what is done, what is in
progress, and what is next.

## How this file is maintained

- **Current Status is overwritten, never appended.** It holds three lines describing only the latest state. Do not keep previous statuses here — the record of what happened lives in `build-journal.md`.
- **Progress checkboxes are edited in place** — tick the box for the completed feature. Never restate, duplicate, or re-list the checklist.
- **Key Decisions holds the 10 most recent decisions, newest first.** When adding an 11th, file the oldest bullet under its topic in `constraints.md`, so this section never exceeds 10. Eviction is a move, never a delete — an old decision can still bind.

---

## Current Status

**Phase:** Phase 0 — Foundation
**Last completed:** 03 Supabase project and schema — RLS verified against a live database, zero security advisories
**Next:** Phase checkpoint — verify Phase 0 is stable, then compact `build-journal.md`

---

## Progress

### Phase 0 — Foundation

- [x] 01 Project scaffold and tooling
- [x] 02 Design tokens and UI primitives
- [x] 03 Supabase project and schema
- [ ] Phase checkpoint — verify Phase 0 — Foundation is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 1 — Identity and entry

- [ ] 04 Google sign-in and session
- [ ] 05 Home page
- [ ] 06 Create meeting and share link
- [ ] Phase checkpoint — verify Phase 1 — Identity and entry is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 2 — Lobby

- [ ] 07 Media permissions and self-preview
- [ ] 08 Lobby controls
- [ ] 09 Join handoff
- [ ] Phase checkpoint — verify Phase 2 — Lobby is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 3 — The call

- [ ] 10 Room connection and video grid
- [ ] 11 In-call control bar
- [ ] 12 Screen sharing
- [ ] 13 Speaker and spotlight view
- [ ] 14 Participant list panel
- [ ] 15 Reactions and raise hand
- [ ] 16 Copy invite link in call
- [ ] Phase checkpoint — verify Phase 3 — The call is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 4 — Encrypted chat

- [ ] 17 Chat key handling
- [ ] 18 Message encryption
- [ ] 19 Chat panel
- [ ] Phase checkpoint — verify Phase 4 — Encrypted chat is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 5 — Call history

- [ ] 20 Participation recording
- [ ] 21 Call history page
- [ ] Phase checkpoint — verify Phase 5 — Call history is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 6 — Mobile and resilience

- [ ] 22 Mobile pass
- [ ] 23 Connection quality and recovery
- [ ] 24 Error and edge states
- [ ] Phase checkpoint — verify Phase 6 — Mobile and resilience is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 7 — Ship

- [ ] 25 Render deployment
- [ ] 26 End-to-end test suite
- [ ] Phase checkpoint — verify Phase 7 — Ship is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

---

## Key Decisions

- **RLS helpers live in `private` and keep `EXECUTE` for `authenticated`** — the schema is what hides them; revoking the grant breaks every policy read. (F03)
- **The expiry sweep has a 2-hour grace period**, resolving a contradiction in `architecture.md` between "closes open rows" and "skips meetings with open rows". (F03)
- **One participation policy, not two** — "read own" was a strict subset of "read co-participants", and Postgres evaluates every permissive policy per row. (F03)
- **`_verify.mjs` now compares three copies of the token mirror** — kit, `library-docs.md`, and `globals.css`. The copy that ships was previously the one nothing checked. (F02)
- **The shell is a `(shell)` route group**, so `/room/[code]` cannot inherit a footer into the call by forgetting to opt out. (F02)
- **~70 tokens mirrored into `:root`, `@theme inline` is pure `var()`** — the radii, type scale, tracking and easings were previously unguarded literals. The 16-hue chromatic palette stays out until a feature earns a stop. (F02)
- **shadcn primitives arrive per feature, not up front** — only `button` exists, restyled to the kit. (F02)
- **TypeScript 6, not 7** — `typescript-eslint` hard-refuses TS 7 and takes all of `eslint-config-next` down with it. Three workarounds tested and rejected. Full reasoning in `constraints.md` → Tooling. (F01)
- **Environment splits into `env.ts` (public) and `env.server.ts` (secrets)** — a single schema throws in the browser, because Next replaces non-public `process.env` reads with `undefined`. (F01)
- **`_verify.mjs` runs inside `npm run lint` from feature 01**, not 02 — it already passed, so context-drift guarding starts immediately. (F01)
