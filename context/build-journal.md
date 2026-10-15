# Build Journal

> **Role:** The dated history of the build, with one entry per completed feature.
> Append after every completed feature; compact at every phase checkpoint.
> Do not read this file at session start. Open it only for a specific feature's history. Rules that still apply live in `constraints.md`.

## How this file is maintained

This file grows throughout the project and is not part of the session reading
order. It records history. Anything that still constrains a decision belongs in
`constraints.md`, which is consulted during ordinary work. This keeps the time
needed to understand current rules from growing with the length of the journal.

- Append a dated entry under the current phase after every completed feature. Record decisions, problems encountered, and verification results.
- Compact only at phase checkpoints. When a phase closes:
  1. Move anything that still constrains future work to its topic in `constraints.md`.
  2. Reduce the phase's per-feature entries to a few summary bullets.
  3. Remove every `Verified:` line. Once the next feature passes, those lines have served their purpose.
- Keep full per-feature detail only for the current phase. Earlier phases stay compacted, newest first.

Compaction can be recovered: this file is committed, and `git` history retains
every removed detail.

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

- Tests showed that two tools needed older versions than planned. `architecture.md` named TypeScript 7; `typescript-eslint` rejects it at runtime, causing all of `eslint-config-next` to fail. The project therefore runs TS 6. ESLint was pinned to 9 for a separate reason: `eslint-plugin-react` calls the pre-10 rule context API. Three workarounds were tested and rejected before that decision. (F01)

- Environment variables were split into public and secret modules. The single Zod schema described in the docs would have thrown when the browser first imported the Supabase client. That is because Next replaces non-public `process.env` reads with `undefined` client-side. `env.ts` holds `NEXT_PUBLIC_*`, `env.server.ts` holds secrets behind `server-only`. (F01)

- Each quality check was observed failing before being trusted: a deliberate `any` fails lint, a drifted token fails `_verify.mjs` by name, a Client Component importing `env.server.ts` fails the build, and moving the Tailwind import below `:root` fails the cascade check. (F01–F02)

- The token check compares all three copies. The kit, the copy in `library-docs.md`, and `globals.css` must all agree. Previously, the stylesheet used by the app was the only unchecked copy. The third copy also allowed recovery: an uncommitted `globals.css` was destroyed twice by `git checkout --` and restored from it both times. (F02)

- Five kit token families share names with Tailwind's theme namespaces (`radius`, `text`, `leading`, `tracking`, `ease`). Tailwind emits a self-referential declaration for each; they resolve only because `:root` appears after the import in the cascade. Both naming strategies were compiled and compared before committing to this one. (F02)

- The wordmark changed to PascalCase with both i's dotted, at the owner's direction. This exposed an alignment bug: the square was centred on the glyph's advance box rather than on the letter, 3.08px off at hero size. Measured font metrics were used to correct all three independent copies carrying the error. (F02)

- Home's visual layout was built early, using `ui_kits/site/` as a reference, with its controls inactive until F05/F06 connect them. This follows the Core Principle of building the visible surface first. `build-plan.md` states that status explicitly so the plan does not claim the feature is finished. (F02)

- Database access was verified with queries impersonating real users. Advisors returned zero security findings, but queries as seeded users under `set local role authenticated` were needed to prove the co-participant policy does not recurse and that one user cannot see another's meetings. Those queries also found a redundant policy, a wrong `EXECUTE` revoke, and an example room code the schema rejects. (F03)

- Failed verification led to two corrective migrations. Revoking `EXECUTE` on the RLS helper breaks every read; the two participation policies were nested rather than complementary. Each correction has its own migration, so replaying from scratch produces the live database state. (F03)

- Running the documented behavior exposed two errors: an example room code the alphabet forbids, and a self-contradicting expiry sweep. Review alone would not have found either issue. (F03)

## Phase 1 — Identity and entry *(compacted 2026-08-12)*

- Verification found two additional bugs. `src/lib/supabase/proxy.ts` was dropping the `headers` argument to `setAll`, discarding the no-store directives that prevent a CDN from serving one user's session token to another. Every quality check missed this. A shared secret schema also meant `/api/meetings`, which never calls LiveKit, could not build while the LiveKit keys were blank. Both were found through execution rather than reading. (F04, F06)

- `navigator.clipboard.writeText` can remain pending instead of rejecting. This happened on a trusted click in a secure context with permission granted. The handler awaited forever and the copy button showed neither success nor failure, an outcome the control must never leave unresolved. The call now races a timeout, with manual copy as the fallback. Stubbing the API verified both branches. (F06)

- Three outdated documentation passages were corrected during their features, before the checkpoint. `architecture.md`'s creation flow had the browser generating room codes; its `apiOk`/`apiError` and Zod-body invariants covered handlers that legitimately do neither; F05's entry claimed it wired both hero controls, contradicting F06's own list. Correcting each passage during its feature left only verification for this checkpoint. (F04–F06)

- Two pieces of work were deliberately moved between features. `src/lib/room-code.ts` came forward from F06 to F05 so the canonical module could be added in full; the LiveKit env module went from F06 to F09, when code first needed it, instead of adding it unused. (F05, F06)

- Three shadcn primitives were added, each with the same design corrections: no `dark:` variants, no shadows, brand radii, `font-normal`, and 44px hit areas in place of the generated 36px or ~30px. `dropdown-menu` also had nine unused sub-components and its red `destructive` variant removed, and `input` had `md:text-sm` removed. Below 16px, iOS Safari zooms the viewport on focus, a worse problem for a product designed for mobile. (F04–F06)

- Browser automation behavior slowed all three features. The first synthetic click after each navigation activates the window without reaching the control. This produced a misleading failure: an apparently dead COPY button that had simply never received the click. Attaching a listener and asserting `isTrusted` distinguishes a missed click from a broken handler in one step. (F04–F06)

- Formatting inconsistencies appeared in three consecutive features because formatting was not enforced. This was addressed at the checkpoint: `prettier --check` now runs inside `npm run lint`, `globals.css` is ignored as a mirror of the kit, and the check was observed failing before being trusted. (checkpoint)

- `middleware.ts` was renamed to `proxy.ts` per Next 16's rename. This was a pure rename, deferred from F04 because it was out of scope and completed here. (checkpoint)

## Phase 2 — Lobby *(compacted 2026-08-13)*

- The hardest lobby issue was handling requests that never finish. `getUserMedia` can hang rather than reject, and the first fix was wrong. An unconditional timeout also fires when someone simply takes time to press Allow, showing a failure during an ordinary interaction. The shipped design uses permission state. When permission is granted, no prompt is coming, so each device is requested separately with its own timeout.

  When permission is undecided, one combined request runs without a timeout. The clipboard API had the same pending-request problem in F06. (F07)

- Tests found three track leaks. State for separate effect runs was kept in a shared ref, so React's double-mount allowed both the first and second requests to adopt their tracks. Another leak came from a `track.stop()` inside a `setState` updater. React double-invokes updaters, which must be pure. The third leak came from an abandoned acquisition whose track arrived after its owner was gone. All three now have explicit guards. (F07, F08)

- Turning a device off releases it rather than muting it, which also avoids the SDK's muted-track problem: `setDeviceId` defers silently on a muted track, so a picker would appear to do nothing. The main test requires *zero* live tracks; a muted track still counts as one. (F08)

- Three scope decisions followed one rule: every shipped control must do something when pressed. Join was deferred out of F07 and F08 to F09, where the token needed to join is added; the speaker picker moved to where remote audio exists. A disabled primary action would look broken throughout those two features. (F07–F09)

- Two API defaults needed explicit overrides. `Room.getLocalDevices` requests permission unless passed `false`, which would have raised a second prompt from an enumeration. `<LiveKitRoom>` re-creates its `Room` when its options object changes identity, so carrying the lobby's device ids inline would have reconnected the call every render. Both issues were found by reading signatures and documentation before they caused failures. (F08, F09)

- `server-only` throws under Node, so testable logic needed separate modules. The joinability decision and the TTL cap are pure modules so every branch can be tested without a database or the LiveKit secrets; the route handler performs the surrounding input/output work. (F09)

- Two outdated context passages would have caused bugs, both found while reading the relevant feature documentation, before this checkpoint: `library-docs.md` had LiveKit secrets being read from the public env module, and still showed the combined `env.server.ts` that F06 had split. (F09)

- One intermittent E2E failure remains unexplained. It failed once under parallel load and has not reproduced in more than ten runs; the failure output was overwritten before it could be read. A real purity defect found in the same path was fixed and is a plausible but unproven cause. (F08)

## Phase 3 — The call *(compacted 2026-08-13)*

- The prebuilt LiveKit layouts did not meet the requirements, so the call uses custom UI. `GridLayout` cannot lay out content without an unapproved stylesheet dependency, and `ParticipantTile` includes four UI elements that conflict with the design system. The grid, tile, filmstrip, control bar, panels, and dialogs are built from unstyled primitives. `library-docs.md` showed the prebuilt path and was corrected. (F10)

- The same memoization defect appeared twice and established a rule for mutable state. LiveKit mutates publication objects in place, so a comparator reading `isMuted` compares the new value against itself: a camera turned off mid-call left a dead `<video>` on every other screen. F10 shipped it; F11's tests caught it; F13 introduced the same kind of bug by adding props omitted from the comparator.

  Read mutable state through hooks rather than memoized props. (F10, F11, F13)

- Three incorrect build-plan requirements were corrected. Raise-hand's transport (an unreliable data channel for durable state), its marker (red, conflicting with the muted-mic dot on the same tile), and F13's focus order (which made the grid unreachable as a resting state if speech could focus). Each correction is recorded in `build-plan.md` beside the bullet it replaces. (F13, F15)

- Two findings point to LiveKit behavior in single-participant rooms. A screen share published into an empty room is unpublished again within about a second, roughly half the time — testing with `dynacast` off made it worse, so that likely cause was ruled out. The mechanism remains unknown. Attributes also do not echo back to a lone participant. Both are recorded as follow-ups.

  A workaround was added for the second. (F13, F15)

- Diagnosis repeatedly took longer than implementation, usually because of the test setup. A test clicking Share mid-handshake; a debug script whose own `getDisplayMedia` call disturbed the publish; `ended` readings that were really the SDK's clone-and-stop; a Python edit that silently changed nothing because Prettier had reflowed the target line. Check the test setup before attributing a failure to the product. (F12, F13, F15)

- Each accessibility feature in the call needed both pointer access and an alternative for other input methods. Pinning is a double-click *and* a per-tile menu; reactions are a popover *and* flat menu items below `sm:`; a count lives in an `aria-label` because it overrides the badge inside the button. (F13, F14, F15)

- Four shadcn primitives were added: tooltip, sheet, popover, and dialog, all with the same styling changes: no shadow, brand radii, `dark:` stripped, dead `tw-animate-css` classes replaced with the kit's own keyframes, 44px dismiss targets, and unused sub-components removed. The edits are documented in each file so a later `shadcn add` cannot silently revert them. (F11, F14, F15, F16)

- A browser test was added to verify the chat-key privacy rule. Since F06, invariants and review had supported the claim that the chat key never reaches a server. F16 records every request made while the invite dialog is open and copying and checks that none contains the fragment. (F16)

- **Phase gates at close:** `lint`, `typecheck`, `build` clean; 173 unit tests and 71 e2e specs pass. The suite grew from 36 e2e at the start of the phase to 71.

## Phase 4 — Encrypted chat *(compacted 2026-08-14)*

- Chat privacy was measured directly on the data channel. It had been defended by invariants and review since F06, and by a request-level assertion at F16. That assertion could not verify chat: the data channel is SCTP over WebRTC and makes no HTTP request, so a request listener would have passed without inspecting a single chat byte.

  `chat.spec.ts` patches `RTCDataChannel.prototype.send`, asserts no outgoing payload holds the plaintext or the key, and asserts the recording is non-empty. A leak check that observed no send could give a misleading pass. (F18)

- Both decrypted messages and sender timestamps still needed to be treated as untrusted input. A decrypted payload proves the sender held the link key, not that they sent something well formed — so `ChatPlaintextSchema` validates on the way in, exactly as `decodeReaction` does for reactions. The sender's `sentAt` raises the same trust issue.

  It is validated, then deliberately left unused, because ordering by a peer-supplied value lets one wrong clock reorder everyone's transcript. (F18)

- `react-hooks/set-state-in-effect` affected three design decisions this phase. It rejected `useChatKey` as shown in `code-standards.md`, which moved the fragment read to `useSyncExternalStore`; it kept the mark used to count unread messages in handlers rather than an effect; and the doc's canonical snippet was corrected rather than the rule suppressed. A synchronous `setState` in an effect is an error here, not a warning. (F17, F19)

- Each feature in this phase included enough UI to verify its behavior. F17's verify line needs the key-missing state visible, F18's needs something able to send. Each added the smallest UI needed for its verification. F19 extended that UI rather than replacing it. (F17, F18, F19)

- Component lifetimes determined where state and timers belonged. `CallPanel` unmounts its children when closed, which determined three choices: the key is imported in `CallStage`, the transcript lives there too, and the relative-time interval lives in the panel so it stops when the panel unmounts. (F17, F18, F19)

- Reviewing the checkpoint diff found a bug that feature tests had missed. Switching straight from chat to the participants panel closes chat without touching the chat control, so the seen mark was not updated and previously read messages appeared unread again. The bug was fixed, and the regression test was observed failing without the fix before being trusted. (checkpoint)

- Three defects came from library and platform APIs rather than application logic: `Uint8Array` now defaults to `ArrayBufferLike`, which neither `crypto.subtle` nor `publishData` accepts; `.call` on the four-times-overloaded `RTCDataChannel.send` resolves to the last overload; and `locator.type()` is deprecated. None was a reasoning error, and all three cost real time. (F18, F19)

- More bugs were found in tests than in the product. A 39-character key that `invite.spec.ts` can carry through a URL but `importChatKey` rejects; `getByRole('listitem')` matching video tiles as well as chat entries; an assertion naming the guest where the message is attributed to the host. Check the test setup before attributing a failure to the product, as Phase 3 also showed. (F17, F18)

- **Phase gates at close:** `lint`, `typecheck`, `build` clean; 189 unit tests and 87 e2e specs pass. The suite grew from 71 e2e at the start of the phase to 87.

## Phase 5 — Call history *(compacted 2026-08-14)*

- Both features exposed related bugs beyond their immediate scope.

  F20 exposed a Phase 0 defect. The nightly sweep closed open rows with `left_at = expires_at`, violating the row's CHECK for anyone who joined after expiry. Both sweep statements share one plpgsql call, so one late joiner in one meeting would silently abort the sweep for *every* meeting. The failure would remain unnoticed until someone read the cron logs.

  F21 encountered the same issue in application code and clamped the duration to zero for the same reason. The defect was reproduced against the live schema before the fix and checked again afterwards. (F20, F21)

- The existing schema provided the basis for both webhook idempotency and history duration. The webhook needed no separate event ledger for deduplication: F03's partial unique index already allows only one open row per participant per meeting. History needed no new column. It only needed to treat an open row on a live meeting as a distinct state rather than a numeric duration. Check the existing constraints before adding a table. (F20, F21)

- Several decisions depended on which clock produced a timestamp. Timestamps are LiveKit's throughout the webhook, so a delivery that succeeds on its third retry still records when the event happened. Clamping is needed exactly where two clocks meet and nowhere else, which is why `closeMeeting` deliberately has no clamp while the sweep does. (F20)

- `suppressHydrationWarning` leaves the incorrect timezone text in place. A server-rendered `Intl` call formats in the server's zone; the escape hatch then suppresses the warning by keeping that text. The e2e caught both the original bug and the bad fix, from a UTC+14 browser. The working solution uses a hydration flag through `useSyncExternalStore`. (F21)

- An assumed testing limitation was checked and disproved. F21's plan recorded that a signed-in page could not be tested, since Playwright cannot drive Google's consent screen. `generateLink` + `verifyOtp` disproved that limitation in minutes. The deferred manual check became eight browser tests, including the build plan's main isolation requirement. (F21)

- For the third consecutive phase, more bugs were found in tests than in the product. A tamper-detection test that "tampered" by writing back the value it already had; a fixture back-dating events to before the meeting existed; a one-shot read racing hydration. Check the test setup before attributing a failure to the product. (F20, F21)

- **Tooling:** `tsconfig.json`'s `target` moved ES2017 → ES2020, since the SDK reports event times as `bigint`. The Supabase CLI is not logged in on this machine, so migrations were applied via MCP under the same name as the file — matching what F03 evidently did, as the remote versions already differ from local filenames while the names agree.

- **Phase gates at close:** `lint`, `typecheck`, `build` clean; 216 unit tests and 104 e2e specs pass. The suite grew from 87 e2e at the start of the phase to 104.

## Phase 6 — Mobile and resilience *(compacted 2026-08-14)*

- Three measurements contradicted assumptions in the plan. The width sweep found `/history` overflowing at 768 and in phone landscape while passing at 360 and at 1024+, invisible to ten specs that only ever measured the floor. Landscape needed no layout change, so none was made. The empty-room screen-share unpublish, open since F13 as known-bad, did not reproduce across 32 trials. Measure the behavior before implementing a fix. (F22, F23, F24)

- Reading the code found three issues that measurements missed. The missing `viewport` export had left every `env(safe-area-inset-*)` in the project resolving to zero since F09 — valid CSS that could not take effect. A desktop browser reports it as correct with or without the export. `onDisconnected` pushed Home for every disconnect, so a dropped call was indistinguishable from a pressed Leave.

  `CallStatus` checked sharing before reconnecting, hiding a reconnect behind a state the person already knew about. None of these three issues was listed in the build plan. (F22, F23)

- Tests showed that two standard approaches did not work here. `loading.tsx` flushes the response before a route's gate runs, turning a dead link's 404 into a 200 and a signed-out redirect into a client-side navigation that first rendered a page heading to someone not allowed to see it. The usual App Router choice, `reset()`, also does not recover a failed fetch. Next 16 expects `retry()`. (F24)

- Passing observations did not prove that mute was always preserved. F23 measured mute preservation across a reconnect, saw it hold, and declined to write restoration code on that evidence; F24's full-suite run caught the mic coming back unmuted. The test that supported the claim later disproved it. This is why the test was worth writing even when the behavior appeared settled. (F23, F24)

- The complete installed types exposed cases missing from the docs and a partial file read. `DisconnectReason` has seventeen members; a truncated read of the type file showed thirteen, `noImplicitReturns` is off, and `typecheck` passed a switch that returned `undefined` for four of them. Context7's published docs undercount `ConnectionQuality` the same way, omitting `Lost`. A `never` guard in the `default` branch enforces handling every case. (F23)

- For the fourth consecutive phase, more bugs were found in the test setup than in the product. Examples included an unscoped `getByRole('alert')` matching Next's route announcer despite a constraint already recording it, `route.abort()` sending Chrome to an error page that raced a later navigation, and a share fixture using a *refused* address where a *hanging* one was needed.

  Check the test setup before attributing a failure to the product. (F22, F23, F24)

- **Phase gates at close:** `lint`, `typecheck`, `build` clean from a cleared cache; 230 unit tests and 124 e2e specs pass. The suite grew from 104 e2e at the start of the phase to 124.

## Phase 7 — Ship *(compacted 2026-08-15)*

*This phase was compacted while feature 25 was still open. It closed later the
same day; see the entry below the bullets. F25 and `7.26.1`–`7.26.5` were not
journalled as they happened and have deliberately not been reconstructed.
A backfilled entry would appear to be a record without the evidence of one.
Decisions that still apply have been moved to `constraints.md`; `git log` holds
the rest.*

- Two long-standing intermittent failures had the same cause in the test suite. `page.getByText('Connected')` is a case-insensitive *substring* match and the status strip's first state is `Disconnected`, so every wait for a connected room returned instantly — 10 sites across 5 specs, `joinAs`, and an explicit `{ exact: false }` on the one test whose whole claim is that pressing Join connects.

  `reactions.spec.ts` therefore raised a hand 2.7s before the signal was up, where livekit-client refuses the write outright and it is lost; `connection.spec.ts` went offline against a room that had never connected, so no banner could appear. For months, both had been attributed to narrow timing margins in the product. That explanation was wrong. (F26)

- A precondition that always passes can hide failures without the warning an incorrect assertion would give. Three checks that could pass without testing their intended conditions were found this phase: the proxy-cookie e2e passed with the exclusion removed, the connected-room gate never waited, and the camera picker test passed with its device list emptied — `DevicePicker` renders `No devices found`, which is non-empty *text*.

  The standing "seen to fail" rule now covers waits and rendered empty states as well as assertions. (F25, F26)

- Adapting a device test for another device can expose weaknesses in the original assertion. The microphone coverage was written by mirroring the camera's, and that is what exposed the camera picker test as vacuous after eighteen features of passing tests. (F26)

- Testing disproved two of F26's verification requirements, and the plan was corrected. They required a second Playwright project and a LiveKit full-restart test; seven flag combinations show the first cannot reach the media failure states, and `attemptReconnect` excludes the only error `setOffline` produces from promoting a full reconnect, so the second cannot be written from Playwright at all.

  Correcting the plan allowed completion to be recorded against requirements the code was actually intended to meet. (F26)

- The phase found one product bug: a rejected write was being ignored. `toggleHand` fired its attribute write into a `void`, so a failed write left only the sender seeing their hand raised. The sender's hand uses local state; everyone else reads the synced attribute. Nothing reconciled the two.

  It now awaits the write and reverts the control, with a generation guard so a slow rejection cannot overwrite a newer press. (F26)

- `next dev` affected test reliability, and CI retries could conceal failures. With four workers, dev leaves too little processing time for its outbound connections: 23 handler errors compared with zero on a production build. Also, `CI=true` sets `retries: 2`, so "all passed" can conceal a first-attempt failure. Both limitations are now stated in the README's pre-deploy checklist, where someone following the instructions needs them. (F26)

- The first full-suite run with the corrected connection check failed 23 of 131 tests. Ten failures were genuine connection-check timeouts: Playwright defaults to 4 workers on 8 cores and the call specs open two contexts each, so the suite asks one laptop for eight concurrent WebRTC sessions.

  The 20s budget had never been exercised by a real wait; it is now one documented `CONNECT_TIMEOUT_MS`, explicitly about the suite's parallelism and not about the product. (F26)

- **Phase gates at close:** `lint`, `typecheck` and `build` clean; **233 unit tests and 135 e2e specs pass** against a production build with `retries: 0`. The suite grew from 124 e2e at the start of the phase to 135. Retries were deliberately disabled: `CI=true` would have set `retries: 2`, and this phase had shown how a passing retry can conceal the initial failure.

  The phase was left open at this point, feature 25's box still unticked, because its Verify wants a *signed-in* two-device call on the deployed URL and the call that had been done was joined as a guest.

### Feature 25 — Render deployment *(closed 2026-08-15)*

Closed after device verification. No file under `src/` changed,
so the gates recorded above still stand.

- The sign-in requirement was verified by a successful Google sign-in on `https://videocircle-blw4.onrender.com`. Supabase echoes `redirect_to` into the Google URL and validates it only at callback time, so the Supabase redirect allow-list and the Google client's authorized URI could not be distinguished from incorrect settings until a complete sign-in round trip. One successful sign-in verified both dashboards and exercised the callback's origin comparison.

- Four of F22's five deferred checks were reported working, with different levels of evidence. Sign-in and mobile device-picker labels are things a person sees.

  Safe-area insets on a notched phone and the chat composer over the iOS keyboard were reported from an end-to-end session rather than specifically inspected — and both fail as slightly wrong padding rather than as a fault, which is precisely how the inset bug survived unnoticed from F09 to F22. They are recorded as reported, not verified, and `constraints.md` keeps the iOS `visualViewport` question open rather than declaring it unnecessary.

  Completion is recorded with that difference in evidence made explicit.

- One check remains open and blocks no feature: Lighthouse on mobile throttling, and a ten-minute four-participant call. F25's Verify names neither, and `code-standards.md` → Performance already prescribes recording an unmet target with its reason rather than lowering it. It remains a follow-up because it requires four people rather than a code change.

- The resulting project state: every feature in `build-plan.md` is built and ticked, and the product has been used end to end, signed in, by a real person on real hardware against the deployed instance.

### Phase 7 checkpoint — re-run *(2026-08-15)*

This was the light re-run promised in the tracker. `7.00.1` had already updated
`architecture.md`, compacted this file, and moved F25's hosting decisions into
the constraints.

- **Gates, production build, `retries: 0`:** `lint`, `typecheck` and `build` clean; **233 unit tests and 135 e2e specs pass.** The diff since `7.00.1` was context docs only, so no architecture update was needed. This was checked against the build's own route list, which matches `architecture.md`'s route table exactly.

- The first suite run failed 1 of 135 tests and exposed a dependency clock error. `POST /api/meetings` answered 500 carrying `PGRST303 — JWT issued at future` from Supabase. This differs from the transport starvation in the route's earlier follow-up, where no response arrives. Here Supabase responded and rejected a service-role key whose `iat` was fixed at project creation. Nothing local can change that value, so the skew is on Supabase's clock.

  The local clock was checked against a network source and was correct to the second. A free instance resuming from idle is the plausible cause.

- The retry was deliberately kept limited to transport errors. `createMeeting` retries a thrown transport error and never a non-201, which keeps genuine 500 errors visible; `PGRST303` is shaped exactly like a real JWT or permission fault, so catching it would hide those. Recorded as a Follow-up to watch. This is the same trade F26 made when it refused to raise a timeout it had not measured.

- The second run passed, and the server log across both runs holds exactly one occurrence — that single occurrence is the evidence for calling it transient, rather than the passing re-run alone.

### `7.00.7` — the hero on a short window *(2026-08-17)*

Responsive checks confirmed that the reworked Home hero works on a phone.
Those checks also exposed an older issue.

- Home passed the audit while its primary action was off-screen because the checks covered only horizontal layout. `expectSweepClean` makes two checks: `scrollWidth > clientWidth`, and every interactive box against 44px — and both are *horizontal*. At 740x360 Home passed both while `START A MEETING` sat entirely below the fold: `toBeInViewport` reported **`viewport ratio 0`**, so the button was entirely out of view.

  Nothing overflowed, because the page scrolls; a primary action off the bottom is outside the scope of a horizontal layout check.

- Comparison with the earlier hero showed that the issue predated the rework. The apparent explanation was the new full-viewport hero and 10vw wordmark pushing the CTA down. That explanation was wrong. `src` and `public` were reverted to `e1fc057` and measured at the same viewports: the *old* hero put the button at **404px** against the new one's **383px**.

  Home has been like this for as long as the sweep has been green. Without that comparison, an existing gap would have been misreported as a redesign regression.

- The fix uses a height query, which is allowed by the width-breakpoint rule in `code-standards.md`. That rule governs *width*, where a fourth tier means the layout is fighting the content over what sits beside what. This change does not alter which elements sit beside each other: `@media (height <= 30rem)` tightens the hero's block padding, its text column's gap, and returns `.wordmark-hero` to the ramp's h1 step. The layout remains a single column.

  `sm:`/`md:`/`lg:` cannot express "the window is short" at all, so none of those breakpoints could express the required condition. The threshold clears every portrait phone in `VIEWPORTS` (shortest is 780px) and catches every landscape one.

- The layout uses the named `.hero-stack` class instead of a descendant selector. The gap being tightened belongs to a utility-classed column, and reaching it as `.hero-viewport > div > div` would break the moment the markup is re-nested. A named class requires one className and does not depend on that nesting.

- The test was written and observed failing before the CSS change. The assertion went into `responsive.spec.ts` before any CSS existed and failed at `ratio 0` — showing that it can catch the issue, as the standard established in F26 requires. `ratio: 1` is deliberate: the default any-intersection would pass a button one pixel above the fold.

- Measurements checked which viewports the fix affected. After the fix, 360/390/768/1024 report byte-identical button positions to before; only 740x360 changes, where the button is now 38px inside the visible area.

**Verified:** `lint` clean, `typecheck` clean, **242 unit tests** and **136 e2e specs** pass (dev server, `retries: 0`). `npm run build` not re-run — the change is one CSS media block and one className.

### `8.00.5` — an emptied room no longer kills the link *(2026-09-24)*

Found in a whole-project review, not a bug report: the suite never joined a
meeting after its room had emptied, so it could not detect this case.

- The webhook incorrectly treated a LiveKit room finishing as the end of a meeting. `room_finished` set `meetings.ended_at`, and `/api/token` refuses any meeting with `ended_at` set. But a LiveKit room finishes after its departure timeout, as soon as the last person leaves. A host who checked the link, or waited and then left, therefore ended the meeting before the guest opened it. The guest received `410 This meeting has ended`.

- The fix limits the webhook to closing participation rows. A grace period ending the meeting N minutes after the room empties would only delay the same failure. The link already has a lifetime, `expires_at`, which is the lifetime the product promises. `room_finished` now calls `closeOpenParticipations`, the reconciliation half of the old `closeMeeting`, and `ended_at` is written only by the nightly sweep. No schema change or migration was needed.

- History was checked for regressions and needed no change. `resolveDuration` only reads `ended_at` for a row that is still open, and `room_finished` still closes every open row. The intended visible difference is that `/history` now offers Rejoin for a meeting until its link expires, since `/api/token` would now accept it.

- Behavior deliberately left unchanged: `meetingJoinability` still checks `ended` before `expired`. `ended_at` is now only ever set to `expires_at` by the sweep, so a swept link reads "has ended" where an unswept expired one reads "has expired". Both are true, and changing the order would mean changing a pinned unit test for wording alone. The sweep function's database comment still calls it a backstop for a dropped `room_finished`.

  That is still true for participation rows, and correcting it would take a migration and a `db push`, which is not justified for a comment alone.

- Documentation updated to match: `architecture.md` (webhook flow, Lifecycle, `ended_at` column note, a new Data-access invariant), `project-overview.md` → Meetings, `constraints.md` → Hosting and Participation and history.

**Verified:** `lint` clean (4 pre-existing warnings, unchanged), `typecheck` clean, **242 unit tests** pass. **E2E not run**: no `.env.local` in this checkout. The new spec `an emptied room leaves the link joinable` is unproven until it runs.

## 2026-10-10 — Supabase activity follow-up (activation pending)

- Added an external daily database check, with a manual trigger, using the public publishable key under existing RLS. All requests bypass Render, read at most one id, and must return an empty array. The workflow needs no checkout or repository token permissions. No schema, policy or application code changed.

- Restricted the previous no-pinger constraint to Render and recorded the approved direct-to-Supabase exception. Corrected the claim that an app request resumes a paused Supabase project: dashboard resumption is required. Setup and GitHub schedule limitations are in `docs/DEPLOYMENT.md`.

- Verified the exact workflow step against the live project: all three reads returned HTTP success and no rows. Missing/invalid/privileged keys, a Render URL, and simulated unexpected visible data all failed, without printing response bodies.

- Verified: `actionlint`, `npm run lint` (four pre-existing inline-style warnings), `npm run typecheck`, and `npm run test` (242 passing). The call e2e suite was not run because this change touches no call/application code; the existing webhook regression check remains a separate follow-up.

- Both public repository variables were saved and verified in GitHub settings. Pending: explicit commit/push approval and a successful manually dispatched GitHub run. No scheduled run has been claimed yet.

## 2026-10-10 — Camera switching and rear-camera mirroring follow-up

- The lobby offered a device picker, but the call only toggled camera on/off. Added a capability-based switch action to the existing responsive control group: MORE on phones, inline on wider screens. LiveKit changes the lens in place, retains an off camera's intent, and preserves the microphone and connection. A synchronous lock rejects repeated taps; failures render beside the controls and can be retried. Successful choices use existing device preferences.

- Both local video surfaces applied an unconditional horizontal flip. They now share a reader of actual source-track facing metadata, subscribed to restart and unmute because LiveKit replaces the underlying capture track inside a stable wrapper. Front/unspecified desktop self-view mirrors; rear views, remote tiles and shares do not. Lens labels are never parsed.

- Regression tests use canvas front/rear capture with opaque labels and Web Audio capture, retaining the actual app, LiveKit switching, SFU and remote decoding. The rear-display test was seen failing with the old unconditional flip; the in-call test reached a connected two-participant call and failed on the missing switch action before implementation.

  Ten camera tests passed, including remote decoded-frame direction, camera-off selection, joining off, repeated off-camera cycling, failed-switch recovery/retry, busy controls, late-capture disposal and a single-camera browser.

- Focused review found that failed SDK acquisition had already stopped the prior source and changed track constraints; recovery now switches back to the prior actual lens. Enumeration needs no live publication when joining camera-off. Muted cycling reads the room's pending device because the stopped source still describes the last captured lens. Each edge case was reproduced by a regression before correction.

  To uphold the acquisition invariant, switching and recovery are bounded; a stall stops/unpublishes the camera, the SDK stops capture arriving late, and no recovery starts after disconnect. Focused review of the final code has no remaining findings.

- This checkout has no local service credentials. For verification only, an untracked temporary bridge stubs meeting lookups and forwards public meeting/token requests to the deployed app; it does not retrieve or introduce privileged keys. Camera e2e results do not validate database/auth handlers or real phone drivers. Real iPhone Safari and Android Chrome verification remains in the tracker, rather than being claimed from Chromium emulation.

- Closed the previous activation-pending note: Supabase activity was committed/pushed as `8.00.6` (`07844ba`), and [the first GitHub run](https://github.com/SidVaidya2005/VideoCircle/actions/runs/38032456317) succeeded on all three database reads.

- Verified: 10 camera browser tests, 242 unit tests, type checking, lint (four pre-existing inline-style warnings; all eight design/context checks passed), and production build with local verification environment placeholders. User approved the local `8.00.7` commit; deployment and real phone checks remain pending.
