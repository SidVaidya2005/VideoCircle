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

**Phase:** Phase 1 — Identity and entry
**Last completed:** 04 Google sign-in and session — verified end to end against a real Google account: sign in, session surviving reload and a tab close, sign out, and `profiles.display_name` holding a real name
**Last completed:** 05 Home page — join-by-code verified in a browser: a bare code and a pasted uppercase link both navigate, the `#k=` fragment arrives byte-identical, and a malformed code fires no request at all
**Next:** 06 Create meeting and share link — `START A MEETING`, the chat key, and `POST /api/meetings`

---

## Progress

### Phase 0 — Foundation

- [x] 01 Project scaffold and tooling
- [x] 02 Design tokens and UI primitives
- [x] 03 Supabase project and schema
- [x] Phase checkpoint — verify Phase 0 — Foundation is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 1 — Identity and entry

- [x] 04 Google sign-in and session
- [x] 05 Home page
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

## Follow-ups

Open work carried out of Phase 0. Cleared as the feature that needs each arrives.

- **`SUPABASE_SERVICE_ROLE_KEY` is blank in `.env.local`** — paste it from Project Settings → API Keys → service_role. Nothing imports it until F06, so the app builds and runs without it. **Blocks F06.**
- **Add the Render URL to Supabase's Redirect URLs at F25.** The localhost callback is configured and the Google round trip works; the deployed origin needs the same entry, plus `NEXT_PUBLIC_SITE_URL` pointed at it. **Blocks F25.**
- **Check whether the email/password provider is enabled on the Supabase project, and disable it if so.** `architecture.md` says Google OAuth is *the only* sign-in method, but nothing in the code enforces that — an enabled email provider is a live account-creation surface reachable straight from the Auth API, outside every route handler here. The security advisor's one finding (`auth_leaked_password_protection`) is about password auth and is moot either way once email is off.
- **LiveKit variables are placeholders** in `.env.local`. **Blocks F09.**
- **Next 16 deprecated the `middleware` file convention in favour of `proxy`**, and every build prints the notice. Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` it is a pure rename — `src/middleware.ts` → `src/proxy.ts`, `export function middleware` → `proxy`, all behaviour unchanged, codemod `npx @next/codemod@canary middleware-to-proxy .`. Left out of F04 as out of scope; it touches `architecture.md`, `code-standards.md` → Environment Variables, and `library-docs.md`, so it wants its own `1.00.x` chore commit.
- **The wordmark's tittle sits ~3.5px off during the `next/font` swap window**, because the generated fallback matches advance and ascent but not glyph shapes. First paint only, on a cold load. Accepted at F02 rather than trading it for a flash of invisible text; revisit only if it looks wrong on the deployed instance.
- **`/tokens` still ships its markup in the production bundle** even though it returns 404 there. A few kB of static swatches; revisit at F22 if the Home budget is tight.

## Key Decisions

- **A fragment is never case-normalised.** `parseRoomCodeInput` lowercases the room code but splits the fragment off first: the chat key is base64url and case-sensitive, so normalising the whole pasted string would silently decode to the wrong bytes. Now an invariant in `architecture.md` → Encryption. (F05)
- **The session is read server-side in the `(shell)` layout**, which makes Home and Call History dynamic. A client-side read would keep Home static at the cost of showing a signed-out header on every load before correcting — worst on exactly the cold free-tier load this project already fights. (F04)
- **RLS helpers live in `private` and keep `EXECUTE` for `authenticated`** — the schema is what hides them; revoking the grant breaks every policy read. (F03)
- **The expiry sweep has a 2-hour grace period**, resolving a contradiction in `architecture.md` between "closes open rows" and "skips meetings with open rows". (F03)
- **One participation policy, not two** — "read own" was a strict subset of "read co-participants", and Postgres evaluates every permissive policy per row. (F03)
- **`_verify.mjs` now compares three copies of the token mirror** — kit, `library-docs.md`, and `globals.css`. The copy that ships was previously the one nothing checked. (F02)
- **The shell is a `(shell)` route group**, so `/room/[code]` cannot inherit a footer into the call by forgetting to opt out. (F02)
- **~70 tokens mirrored into `:root`, `@theme inline` is pure `var()`** — the radii, type scale, tracking and easings were previously unguarded literals. The 16-hue chromatic palette stays out until a feature earns a stop. (F02)
- **shadcn primitives arrive per feature, not up front** — only `button` exists, restyled to the kit. (F02)
- **TypeScript 6, not 7** — `typescript-eslint` hard-refuses TS 7 and takes all of `eslint-config-next` down with it. Three workarounds tested and rejected. Full reasoning in `constraints.md` → Tooling. (F01)
