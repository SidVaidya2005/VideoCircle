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


## Phase 0 — Foundation *(compacted 2026-08-12)*

- **The stack pinned itself lower than planned, twice, and both times measurement decided it.** `architecture.md` named TypeScript 7; `typescript-eslint` refuses it at runtime and takes all of `eslint-config-next` down with it, so the project runs TS 6. ESLint pinned to 9 for an unrelated reason — `eslint-plugin-react` calls the pre-10 rule context API. Three workarounds were tested and rejected before deciding. (F01)
- **Environment split into public and secret modules.** The single Zod schema the docs described would have thrown on the first browser import of the Supabase client, because Next replaces non-public `process.env` reads with `undefined` client-side. `env.ts` holds `NEXT_PUBLIC_*`, `env.server.ts` holds secrets behind `server-only`. (F01)
- **Quality gates are adversarial by construction.** Every gate was proven able to fail before being trusted: a deliberate `any` fails lint, a drifted token fails `_verify.mjs` by name, a Client Component importing `env.server.ts` fails the build, and moving the Tailwind import below `:root` fails the cascade check. (F01–F02)
- **The token mirror is guarded in three places.** The kit, the copy in `library-docs.md`, and `globals.css` must all agree — the stylesheet that actually renders was previously the one copy nothing checked. That third copy also proved to be recoverable source: an uncommitted `globals.css` was destroyed twice by `git checkout --` and restored from it both times. (F02)
- **Five kit token families collide with Tailwind's theme namespaces** (`radius`, `text`, `leading`, `tracking`, `ease`). Tailwind emits a self-referential declaration for each; they resolve only because `:root` cascades after the import. Both naming strategies were compiled and compared before committing to this one. (F02)
- **The wordmark went to PascalCase with both i's dotted**, at the owner's direction, and a real alignment bug surfaced doing it: the square was centred on the glyph's advance box rather than on the letter, 3.08px off at hero size. Corrected from measured font metrics, in three independent copies that each carried the same error. (F02)
- **Home's visual surface landed early**, following `ui_kits/site/` for layout, with its controls inert until F05/F06 wire them — the Core Principle's build-the-surface-first, made explicit in `build-plan.md` so the plan does not claim finished work. (F02)
- **The database was verified by impersonation, not by inspection.** Advisors returned zero security findings, but only seeded users queried under `set local role authenticated` proved the co-participant policy does not recurse and that one user cannot see another's meetings. That exercise also found a redundant policy, a wrong `EXECUTE` revoke, and an example room code the schema rejects. (F03)
- **Two migrations exist only because verification failed.** Revoking `EXECUTE` on the RLS helper breaks every read; the two participation policies were nested rather than complementary. Both corrections are their own migrations so a replay from scratch ends where the live database is. (F03)
- **Documentation was wrong in ways only execution caught**: an example room code the alphabet forbids, and a self-contradicting expiry sweep. Neither would have been found by review. (F03)


## Phase 1 — Identity and entry

### Feature 04 — Google sign-in and session  *(2026-08-12)*

- Decision: **the session is read server-side in `(shell)/layout.tsx`**, not on the client. Home and Call History become dynamic in exchange for a header that is correct on first paint. The alternative flickers signed-out → signed-in on every load, and does so worst on the cold free-tier start this project already apologises for. The header itself stayed auth-ignorant — it takes a rendered node as `actions`, exactly as its F02 prop comment promised.
- Decision: **the display name comes from `profiles`, never `user_metadata`.** Two reasons, and the second is the one that binds: it keeps a single derivation of a name (the `auth.users` trigger's `coalesce`), and Supabase's `raw_user_meta_data` is *user-editable* and surfaces in `auth.jwt()`, so it must never be trusted. Written up as an invariant in `architecture.md` → Data access.
- Decision: **a typographic initial instead of the Google avatar.** The brand is type and geometry, and it avoids a `next.config.ts` `remotePatterns` entry, a per-render call from the visitor's browser to googleusercontent.com, and a dead-URL fallback path. `profiles.avatar_url` is still stored.
- Decision: **`/auth/signout` is POST-only, answered with 303.** A GET signout is fetched by `next/link` prefetch, by speculative loading, and by any third-party `<img>` — all of which would end a session with no user action. 303 rather than the default 307, because 307 preserves the method and would re-issue the request as `POST /`.
- Decision: **both auth redirects resolve against `NEXT_PUBLIC_SITE_URL`, not `request.url`.** Render terminates TLS at a proxy, so the request's own origin is not reliably the public one; `X-Forwarded-Host`, which Supabase's own sample reaches for, is caller-controlled and no better. One canonical origin also means exactly one URL to allow-list in the dashboard.
- Decision: **the chat-key `sessionStorage` stash shipped now**, ahead of any URL that carries a `#k=` fragment, because its failure mode is silent — the call still works and only chat is quietly unreadable. `restoreChatKeyFragment` has no caller until F17; that is deliberate and noted in its doc comment.
- Gotcha: **`src/lib/supabase/middleware.ts` was dropping the `headers` argument to `setAll`.** `@supabase/ssr` 0.12.4 types it as `(cookies, headers)` and passes `Cache-Control: private, no-cache, no-store…` whenever auth cookies are set — the directives that stop a CDN or proxy caching one user's session token and serving it to another. `library-docs.md` prescribed both arguments; the shipped F03 helper took one. Silent until catastrophic, and invisible to every gate.
- Gotcha: **three of shadcn's generated dropdown animation classes did nothing.** `animate-in`, `fade-in-0`, and `zoom-in-95` come from `tw-animate-css`, which this project does not import. Replaced with `--animate-menu-in` in `globals.css`, which the existing `prefers-reduced-motion` block already collapses.
- Gotcha: **`shadcn add dropdown-menu` pulls in `lucide-react`**, which is approved in `code-standards.md` but not installed. All three icon imports belonged to sub-components nothing here uses, so nine of them were removed outright rather than adding a dependency this feature does not need. The `destructive` item variant went too — red is the Leave control and your own muted state, and a red menu variant is an invitation to break that. Full list in the file's header comment.
- Gotcha: **`npx prettier --write` reformatted six files F04 never touched**, including lowercasing two hex values inside the `globals.css` token mirror. Formatting is not enforced by `npm run lint`, so the tree carries drift. All six were reverted and the hex casing restored; the mirror is a copy of the kit and prettier is not entitled to edit it.
- Gotcha: **Next 16 deprecated the `middleware` file convention in favour of `proxy`.** Confirmed from `node_modules/next/dist/docs/` to be a pure rename with unchanged behaviour. Left alone as out of scope and recorded as a follow-up, since it touches three context docs.
- Verified: `npm run typecheck`, `npm run lint` (0 errors; `_verify.mjs` 8/8), `npm run test` (18 passed, 10 of them new `safeNext` cases including `//evil.com` and `/\evil.com`), `npm run build` — all green, with `/` correctly reported as dynamic. Against a dev server: `GET /auth/signout` → 405, `POST` → 303 to `/`; `?code=bogus` → `/?error=auth`; `?error=access_denied` → `/` with no banner. In a 360px same-origin iframe: no horizontal overflow, and all 8 interactive targets clear the 44px floor.
- Verified with the OAuth provider live, against a real Google account: sign-in completes and returns to Home signed in; the session survives a reload **and a full tab close and reopen**, confirming the cookie is persistent rather than session-scoped; the dropdown carries the name, `CALL HISTORY`, and `SIGN OUT`, both items measuring exactly 44px; sign-out returns to Home signed out and a reload does not bring it back. At 360px the signed-in header has no horizontal overflow and all 8 targets clear the floor.
- Verified in Postgres: `profiles.display_name` is the real Google name — not `Someone` and not an email local-part — and `avatar_url` is populated. Google's `raw_user_meta_data` carries **all four** keys the trigger's `coalesce` chain considers (`full_name`, `name`, `avatar_url`, `picture`), so the F03 fallback ladder is confirmed correct rather than merely untriggered. This is the check F03 explicitly deferred to F04.
- Gotcha: **the first synthetic click on the trigger after a page load never opened the menu; the second always did.** Chased rather than retried — keyboard activation (`Enter` on the focused trigger) opens it every time, and `document.hasFocus()` was false before the first click. It is the click that focuses the window being swallowed, an automation artifact, not a product defect. Worth remembering when F07–F16 drive the call surface the same way.
- Still open: the middleware `headers` fix could not be *exercised*, only proven against the library's types — `setAll` runs when Supabase refreshes an access token, and the default expiry is an hour. The security advisor's single finding (`auth_leaked_password_protection`) concerns password auth, which this project does not use; see `progress-tracker.md` → Follow-ups for the related question of whether the email provider is enabled at all.
