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

### Feature 05 — Home page  *(2026-08-12)*

- Decision: **F05 and F06 overlapped in the plan, and the overlap was resolved in F06's favour.** F05's note claimed it wired "the two hero controls", but `START A MEETING` needs `generateRoomCode`, a Web Crypto chat key, and `POST /api/meetings` — all three in F06's own Logic list. Wiring it here would have left F06 as a share-link panel. `build-plan.md` was corrected rather than left with two entries disagreeing.
- Decision: **`src/lib/room-code.ts` moved from F06's list to F05's**, whole, with the shape/alphabet/collision tests F06's verify asked for. `architecture.md` defines it as one canonical block; splitting it across two features meant editing the file and re-reading the 32-character alphabet reasoning twice. `generateRoomCode` is unused for exactly one feature. F06's verify line was trimmed to match.
- Decision: **the form replaced `JOIN AS GUEST` inline rather than sitting behind it.** A control whose only job is to reveal a form is a click toward something that could already be on screen. It also avoided adding and restyling a dialog primitive.
- Decision: **parsing is permissive about origin, strict about the code.** Any path segment matching `ROOM_CODE_PATTERN` wins, so a link pasted from the deployed site while running locally, carrying tracking parameters, or reshaped by a redirector still works. Scanning every segment rather than assuming a trailing `/room/<code>` is what survives a locale prefix and a trailing slash.
- Gotcha, and the most important thing in this feature: **normalising the code nearly corrupted the chat key.** Lowercasing the pasted string is right for the code — the alphabet is lowercase-only and an email client may capitalise it — but the `#k=` fragment is base64url and case-sensitive. Lowercasing the whole input would have decoded to the wrong bytes, and the failure is silent: the call still connects and only chat is unreadable. `parseRoomCodeInput` splits the fragment off *first* and never touches it again. Now an invariant in `architecture.md` → Encryption, and covered by a test that pastes an all-uppercase URL with a mixed-case key.
- Gotcha: **shadcn's input ships `md:text-sm`, which is an iOS zoom bug on a mobile-first product.** Below 16px Safari zooms the viewport on focus. The responsive step was dropped so the field is 16px everywhere; a slightly large field on a laptop is the cheaper defect. `aria-invalid` also lost its red border — `signal` is the Leave control and your own muted state, and an invalid code is neither, so the border goes to a stronger neutral and the message carries the meaning.
- Gotcha: **prettier reformatted `hero.tsx`'s paragraph again**, the same drift reverted during F04. Formatting is not enforced by `npm run lint`, so every prettier run on a touched file drags unrelated changes in. Reverted again; a `format:check` script would end this.
- Gotcha: **the click-swallowed-by-window-focus artifact from F04 recurred and cost real time.** The first synthetic click after each navigation is absorbed activating the window, so a typed value silently went nowhere and an apparently-broken JOIN button was really an empty submit. Verified the button path by dispatching `click()` on the element instead. Worth remembering before F07–F16 drive the call surface this way.
- Verified: `npm run typecheck`, `npm run lint` (0 errors, `_verify.mjs` 8/8), `npm run test` (56 passed, 38 of them new), `npm run build`. In a browser: a bare code with surrounding whitespace navigates trimmed; `HTTPS://VIDEOCIRCLE.EXAMPLE/ROOM/ABC-DEFG-HJK?utm_source=x#k=aBcD_-19` lands on `/room/abc-defg-hjk#k=aBcD_-19` — code lowercased, query dropped, **fragment byte-identical** — and the 404 there is expected until Phase 2. A code containing the forbidden `i` shows the inline message and fires **zero** network requests; an empty submit does the same; the first keystroke clears it. Both Enter and the JOIN button submit. At 360px there is no horizontal overflow, the field and button stack at 328×44 each, and the field computes to 16px.

### Feature 06 — Create meeting and share link  *(2026-08-12)*

- Decision: **the server is the only room-code generator.** The client POSTs an empty body and uses the code it is handed. The collision path already regenerated server-side, so a client navigating to the code *it* sent would have landed in a room it does not own — a bug visible only on a collision, which at 50 bits means never in testing and eventually in production. `architecture.md`'s creation flow was rewritten to match.
- Decision: **the share panel replaces the hero's action area rather than pushing straight to the room.** It is the only place this feature's UI could live — `/room/[code]` does not exist until Phase 2 — and it matches the product, where the link, not the room, is what the creator came for.
- Decision: **copy confirms on the button, not through a toast.** shadcn's toast is `sonner`, absent from the approved dependency list; a browser-bundle dependency for one confirmation that belongs on the control itself was not worth the amendment.
- Decision: **`expires_at` is never in the insert payload.** The 24-hour window is declared once as the column default and read from there by `/api/token` and the sweep. Confirmed empirically: the created row reports exactly 24.00 hours between `created_at` and `expires_at`.
- Gotcha, and the one with teeth: **one secret schema coupled every consumer to every credential.** `env.server.ts` parsed all three secrets at module load, so `/api/meetings` — which never touches LiveKit — failed `next build` outright because `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` were blank. The tracker had recorded those as "placeholders"; they were empty. Secrets are now parsed **per service**, keeping F01's fail-at-boot intent while narrowing who hears it. The production version of this bug is a LiveKit key rotation taking meeting creation down with it. LiveKit's own module arrives in F09.
- Gotcha: **`navigator.clipboard.writeText` can hang rather than reject.** Observed on a *trusted* click, in a secure context, with `clipboard-write` already granted: the promise simply never settled, so the handler awaited forever and the button showed neither success nor failure — the one outcome a copy control must never produce. Now raced against a 1.5s timeout that falls through to the manual-copy path. Both branches verified by stubbing the API: a never-settling write shows the fallback and selects the link; a working one flips the button to COPIED, writes exactly the panel's link, and announces it.
- Gotcha: **TS 6 narrowed `Uint8Array` to `Uint8Array<ArrayBufferLike>`**, which is not assignable to Web Crypto's `BufferSource`. `fromBase64Url` pins its return to `Uint8Array<ArrayBuffer>`; a bare `Uint8Array` could be backed by a `SharedArrayBuffer`, which `crypto.subtle` refuses.
- Gotcha: **the click-swallowed-by-window-focus artifact cost real time for the third feature running.** It produced a convincing false negative here — an apparently dead COPY button that had simply never received the click. Attaching a listener and asserting `isTrusted` is the cheapest way to tell a missed click from a broken handler; worth doing first, next time.
- Verified: `npm run typecheck`, `npm run lint` (0 errors, `_verify.mjs` 8/8), `npm run test` (76 passed, 20 of them new crypto cases), `npm run build` with `/api/meetings` registered. In Postgres: the created code matches the URL, `ended_at` null, TTL exactly 24.00 hours, and `created_by` resolves both ways — null for a guest, and the signed-in user's id (joining back to the right `profiles.display_name`) when a session exists, which is what proves `getUser()` inside the route handler works rather than merely compiling. Over the wire: the POST body is `(no body)` and the response is `{"code":"…"}` — no key material in either — and the dev-server log contains **zero** occurrences of `k=`. `JOIN NOW` arrives at `/room/<code>#k=<43-char key>` byte-identical to the panel's link, 404 expected until Phase 2. At 360px the panel renders with no horizontal overflow and all 11 targets clear the 44px floor.
