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


## Phase 1 — Identity and entry *(compacted 2026-08-12)*

- **Verification found two bugs that writing the code did not.** `src/lib/supabase/proxy.ts` was dropping the `headers` argument to `setAll`, discarding the no-store directives that stop a CDN serving one user's session token to another — invisible to every gate. And one shared secret schema meant `/api/meetings`, which never calls LiveKit, could not build while the LiveKit keys were blank. Both were found by running things, not reading them. (F04, F06)
- **`navigator.clipboard.writeText` can hang rather than reject** — observed on a trusted click, secure context, permission granted. The handler awaited forever and the copy button showed neither success nor failure, the one outcome such a control must never produce. Now raced against a timeout that falls through to manual copy; both branches verified by stubbing the API. (F06)
- **Three docs described things the code no longer did, and were corrected as the code changed rather than at this checkpoint.** `architecture.md`'s creation flow had the browser generating room codes; its `apiOk`/`apiError` and Zod-body invariants covered handlers that legitimately do neither; F05's entry claimed it wired both hero controls, contradicting F06's own list. Correcting these per feature is what kept this checkpoint to a verification pass. (F04–F06)
- **Ownership moved between features twice, deliberately.** `src/lib/room-code.ts` came forward from F06 to F05 rather than shipping half a canonical module twice; the LiveKit env module went from F06 to F09, to its first real consumer, rather than shipping unused. (F05, F06)
- **The design system absorbed three shadcn primitives, each needing the same corrections**: no `dark:` variants, no shadows, brand radii, `font-normal`, and 44px hit areas in place of the generated 36px or ~30px. `dropdown-menu` also shed nine unused sub-components and its red `destructive` variant, and `input` lost `md:text-sm` — below 16px iOS Safari zooms the viewport on focus, which on a mobile-first product is the worse defect. (F04–F06)
- **Automation artifacts cost real time across all three features.** The first synthetic click after each navigation is absorbed activating the window, which produced a convincing false negative — an apparently dead COPY button that had simply never received the click. Attaching a listener and asserting `isTrusted` distinguishes a missed click from a broken handler in one step. (F04–F06)
- **Prettier drift leaked into three consecutive features** because formatting was not enforced. Closed at this checkpoint: `prettier --check` now runs inside `npm run lint`, `globals.css` is ignored as a mirror of the kit, and the gate was proven to fail before being trusted. (checkpoint)
- **`middleware.ts` became `proxy.ts`** per Next 16's rename — a pure rename, deferred out of F04 as out of scope and cleared here. (checkpoint)


## Phase 2 — Lobby

### 2026-08-13 — 07 Media permissions and self-preview

**Decisions**

- **Two acquisition shapes, chosen by permission state.** A flat timeout on `getUserMedia` is wrong, because the promise does not settle until the permission prompt is answered — so the timer fires on someone who simply took a while to find Allow, turning the most ordinary path in the product into a rendered failure. Permission state decides instead: already granted means no prompt is coming, so each device is asked for separately, in parallel, each timed; undecided means one combined untimed request, one prompt, answered at the person's own pace. Falls back to the untimed path wherever `permissions.query` rejects, which is Firefox and older Safari for these names — the fallback that cannot produce a false failure.
- **The page verifies the code before the lobby mounts.** Shape, then existence through `findMeetingByCode`, `notFound()` on either. A dead link now fails before anyone is asked for a camera rather than after. Joinability stayed with F09 on purpose: a meeting can close while someone sits in the lobby, so that check has to happen at join, and the two are not duplicates.
- **`findMeetingByCode` uses `supabaseAdmin`, and lives in `src/lib`.** RLS on `meetings` admits only an authenticated participant, so the anon client would make every valid code look unknown to the very guest opening its link. Putting it behind a lib function keeps the service-role client out of `src/app`, where the boundary in `architecture.md` does not allow it.
- **No Join control shipped.** The entry asked for "a path to join anyway", but Join belongs to F08 and joining to F09. Shipping a disabled button for two features reads as broken; the guarantee kept instead is that no failure state dead-ends the page.
- **`idle` dropped, `timeout` added.** Nothing can produce `idle` when the hook requests on mount — and ESLint's `react-hooks/set-state-in-effect` rejects the synchronous `setState` that moving out of it required. `timeout` earned its place empirically, below.

**Gotchas**

- **`getUserMedia` can hang instead of rejecting, and it happens on real hardware.** On this machine `{video: true}` opens normally while `{audio: true}` never settles at all — so the combined request never settles either, and the lobby sat on "Waiting for camera and microphone" forever. Found because the E2E suite failed, not because anything was reviewed. This is the same failure the clipboard hit in F06, in a different API: a call that neither succeeds nor fails is worse than one that fails.
- **`MediaDeviceFailure.getFailure` throws on a primitive.** It tests `'name' in error`, and `in` raises a TypeError on a string or null. `throw 'string'` is legal JavaScript, so the classifier could itself throw and strand the lobby. Caught by the unit test on its first run, from the case that existed only for completeness.
- **`next/dynamic` with `ssr: false` is rejected in a Server Component.** The plan called for it to code-split the room tree; Next errors on it. Not needed anyway — the route is the split point, verified by serving the production build and confirming Home requests no chunk carrying the SDK.
- **Playwright's default headless build has no working audio capture here,** and the fake-device flags auto-grant permission, so the denied, no-device, and in-use states are unreachable from the suite as configured.

**Verified**

- `npm run lint` (0 errors, 3 pre-existing warnings), `npm run typecheck`, `npm run build`, `npm run test` (84 passing), `npx playwright test` (all specs).
- 5 new E2E specs: a real code renders a live preview with frames arriving (`readyState >= 2`, non-zero `videoWidth`); unknown and malformed codes both 404 with no video element; exactly one live camera track, which is what catches an orphaned acquisition; no horizontal overflow at 360px.
- 8 unit assertions over the classifier, covering both spellings of each DOMException, an unrecognised one, and non-object throws.
- Bundle claim checked by serving the production build: Home requests no chunk containing SDK symbols; its only `livekit` match is the `NEXT_PUBLIC_LIVEKIT_URL` value. Home's first load measures ~341 kB gzipped against a 200 kB target — pre-existing, recorded as a follow-up for F22.
- **Not verified:** the denied, no-device, and in-use states in a real browser. Recorded as a follow-up.

### 2026-08-13 — 08 Lobby controls

**Decisions**

- **Off releases the device; it never mutes.** A preview reading OFF while the camera light stays lit is the thing that destroys trust in a lobby, so the toggle calls `track.stop()` and drops the reference. It also keeps the SDK's muted-track trap unreachable: `setDeviceId` sets `pendingDeviceChange` and returns early on a muted track, so a device picker would appear to do nothing until the track was unmuted. The cost — re-acquisition can be slow or fail — is already covered by F07's timeout and failure classification.
- **Switching uses `track.setDeviceId()` while on, and only records the choice while off.** The SDK restarts capture in place rather than republishing, which is why the preview does not flicker and the page never reloads.
- **Preferences are honoured before any device is touched.** Someone who left with the camera off must not have it opened again on the way back in, so the stored set is read first and a device nobody asked for is never acquired. Validated with Zod on read, because `localStorage` is user-editable like any other boundary.
- **A stale device id is harmless by construction.** The stored id is passed as a bare `deviceId`, which is an *ideal* constraint rather than `{exact}`, so an unplugged webcam falls back to the system default instead of failing the request. `resolveDeviceId` exists only so the picker does not show a selection the browser is not honouring.
- **No Join control, and no speaker picker.** Join belongs to F09 with the token that makes it work; the speaker picker belongs where remote audio exists, since in the lobby it would change nothing observable and silently do nothing on Firefox and iOS. Both are the same call made for F07: every control that ships does something when pressed.
- **Two extractions rather than two copies.** The lobby is the third surface needing the overline and the second needing clipboard handling with its hang timeout, so `SectionOverline` moved to `ui/` and `useCopyToClipboard` came out of `share-panel.tsx`.

**Gotchas**

- **Reworking the hook reintroduced a track leak the F07 suite caught immediately.** F07 used a `cancelled` flag local to each effect run; the rework replaced it with a shared `mounted` ref. Under React's development double-mount the first run's cleanup sets that ref false and the second run sets it true again, so the first request sees "still mounted" when it resolves and holds its track alongside the second's — two live cameras, one owned by nothing. The lesson is that per-run state must not be hoisted to a ref shared across runs.
- **`Room.getLocalDevices` raises a permission prompt by default.** Its second argument defaults to requesting permission, which would have produced a second prompt from an enumeration. Passing `false` explicitly is required, and was found by reading the signature rather than by the code failing.
- **ESLint's `react-hooks/set-state-in-effect` rejected two shapes.** The copy button's mount-time `window.location.hash` read became a read at click time, which is better anyway — no state, and correct if the hash changes. The device enumeration needed its `setState` moved inside a nested async IIFE rather than a traced `useCallback`.
- **A locator matched two elements** because the preview placeholder and the toggle both read "Camera off". Scoped to the paragraph, or the assertion would have passed on the button while the preview frame said nothing.
- **One unexplained E2E failure, recorded rather than dismissed.** "Turning the camera back on re-acquires exactly one track" failed once under four-worker load and did not reproduce in ten subsequent runs; the artifact was overwritten by the passing runs, so what it asserted is unknown. Reviewing that path for a cause turned up a real defect regardless — `release()`, which stops a track, was being called *inside* a `setState` updater. React double-invokes updaters in development and they must be pure, so the stop was firing twice against whatever snapshot each invocation saw. Moved outside the updater. That is a plausible cause but an unproven one, and the flake should be treated as open until it either recurs with an artifact or stays gone.

**Verified**

- `npm run lint` (0 errors, 3 pre-existing warnings), `npm run typecheck`, `npm run build`, `npm run test` (95 passing), `npm run test:e2e` (20 passing).
- 7 new E2E specs: camera off drops live tracks to **zero** rather than muting; on again returns to exactly one and never two; the picker lists a labelled device; switching keeps the same document instance; preferences survive a reload; the name caps at `MAX_DISPLAY_NAME_LENGTH`; every control clears 44px at 360px with no overflow.
- 11 new unit assertions over `preferences.ts` — malformed JSON, wrong types, missing fields, storage that throws on read, storage that throws on write, and a device id that no longer exists.
- **Not verified:** every microphone path, because audio capture hangs on this machine. The camera equivalents exercise the same acquisition code. Recorded as a follow-up.

### 2026-08-13 — 09 Join handoff

**Decisions**

- **F09 connects for real rather than stopping at the token.** A JWT that decodes correctly but is refused by the SFU is exactly the bug a token-only feature hides, and it would have been the third feature running whose primary action did nothing when pressed. The connected state is deliberately minimal — status, headcount, Leave — and feature 10 replaces it with the grid without touching the token path.
- **Leave ships now.** Connecting with no way out is a trap: the only escape would be closing the tab, which also strands the meeting's `room_finished` bookkeeping behind a timeout.
- **Preview tracks are released before connecting, never after.** A live preview track holds the camera the room is about to ask for, and on some devices that blocks the room acquiring it at all. `stopPreview` also bumps both acquisition generations, so a request still in flight is stopped on arrival instead of being adopted into a lobby that has already handed off.
- **The joinability decision and the TTL cap are pure modules.** `server-only` throws under Node — verified, not assumed — so anything importing it cannot be unit-tested at all, and `token.ts` additionally cannot be imported without the LiveKit secrets present. Splitting the two decisions out means every branch of "can this be joined" and "how long may this token live" is tested directly rather than through a live database.
- **`ended` is reported before `expired`.** A meeting that finished and then sat past its expiry is both; "this meeting has ended" is what actually happened, and the reverse order would tell someone their link expired when the call simply finished without them.
- **Failures split by what the person can do next.** Unknown, ended and expired offer a way to start a new meeting, because a retry cannot help; everything else offers a retry. The copy is written once, in the route, and the client branches on the code — so the two cannot drift into describing the same failure differently.

**Gotchas**

- **`<LiveKitRoom>`'s `options` object must be memoised.** It re-creates its `Room` whenever that object's identity changes, so building it inline — which is the natural way to carry the lobby's device ids — reconnects the call on every render. The symptom would look like a network fault, not a code one.
- **`server-only` throws when imported under Node**, which is what forced the pure-module split above. Checked directly rather than discovered through a failing test.
- **Two library-docs snippets read LiveKit secrets from `src/lib/env.ts`,** the public module that by design cannot hold them — following either would have shipped a signing key to every visitor or, more likely, thrown at import. The same section still showed the merged `env.server.ts` that feature 06 undid. Both corrected here; this is the drift the checkpoint reconciliation exists to catch, found early only because the feature happened to read that section.
- **Next injects its own `role="alert"` route announcer,** so an unscoped `getByRole('alert')` matches two elements. The test was scoped to `main`; unscoped it would have been ambiguous rather than wrong, but the same locator elsewhere could pass against the announcer while the real notice said nothing.

**Verified**

- `npm run lint` (0 errors, 3 pre-existing warnings), `npm run typecheck`, `npm run build`, `npm run test` (104 passing), `npm run test:e2e` (31 passing).
- The two security criteria directly: a well-formed code that was never created returns 404 with nothing token-shaped anywhere in the body, and a decoded grant names exactly one room with `roomAdmin`, `roomCreate` and `roomList` all absent. Token expiry asserted against the one-hour cap rather than the meeting's 24-hour window.
- 9 new unit assertions over `meetingJoinability` and `tokenTtlSeconds`, including the exact-expiry boundary and the both-ended-and-expired case.
- 11 new E2E: real connection to LiveKit Cloud, Leave returning Home, the preview released before connecting, ended-versus-transient failure handling, and Join disabled until a name is entered.
- The audio-acquisition hang on this machine did **not** block connecting: the room connects and the connected state renders regardless.
