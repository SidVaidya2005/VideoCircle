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

**Phase:** Phase 6 — Mobile and resilience
**Last completed:** 24 Error and edge states — 230 unit (up 3), 124 e2e (up 10), lint, typecheck all green. Two of the feature's own bullets were already built at F07, and a third was built, measured, and deliberately removed: `loading.tsx` flushes the response before a route's gate runs, turning a dead meeting link from 404 into 200 and the signed-out `/history` redirect into a client-side navigation that first rendered the page heading to someone not allowed to see it. The three inherited follow-ups all closed — the share-handshake gate and chat's jump-to-latest fixed and pinned, and the empty-room share unpublish shown not to reproduce across 32 trials. **The full-suite run also caught a muted mic coming back unmuted after a reconnect, which corrects what F23 recorded** — now an open follow-up with the evidence
**Next:** the Phase 6 checkpoint — run the gates, walk the phase diff against `architecture.md`, compact `build-journal.md`, and decide the open mic-restoration follow-up. Then Phase 7, where six device- or deploy-dependent F22 checks block F25 alongside the LiveKit webhook configuration that leaves F20 unproven

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
- [x] 06 Create meeting and share link
- [x] Phase checkpoint — verify Phase 1 — Identity and entry is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 2 — Lobby

- [x] 07 Media permissions and self-preview
- [x] 08 Lobby controls
- [x] 09 Join handoff
- [x] Phase checkpoint — verify Phase 2 — Lobby is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 3 — The call

- [x] 10 Room connection and video grid
- [x] 11 In-call control bar
- [x] 12 Screen sharing
- [x] 13 Speaker and spotlight view
- [x] 14 Participant list panel
- [x] 15 Reactions and raise hand
- [x] 16 Copy invite link in call
- [x] Phase checkpoint — verify Phase 3 — The call is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 4 — Encrypted chat

- [x] 17 Chat key handling
- [x] 18 Message encryption
- [x] 19 Chat panel
- [x] Phase checkpoint — verify Phase 4 — Encrypted chat is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 5 — Call history

- [x] 20 Participation recording
- [x] 21 Call history page
- [x] Phase checkpoint — verify Phase 5 — Call history is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 6 — Mobile and resilience

- [x] 22 Mobile pass
- [x] 23 Connection quality and recovery
- [x] 24 Error and edge states
- [ ] Phase checkpoint — verify Phase 6 — Mobile and resilience is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 7 — Ship

- [ ] 25 Render deployment
- [ ] 26 End-to-end test suite
- [ ] Phase checkpoint — verify Phase 7 — Ship is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

---

## Follow-ups

Open work carried forward. Cleared as the feature that needs each arrives.

- **`POST /api/meetings` returned a non-201 once in three full-suite runs at the Phase 5 checkpoint, and this is NOT the closed issue below.** That one is a thrown `ECONNRESET` before any handler runs; this failed at `expect(response.status()).toBe(201)`, so a response did arrive. Not reproduced in two further full runs or in a focused re-run, and the artifact was lost to the re-run — the same mistake the F08 flake follow-up already warned about, so **capture `test-results/` before re-running next time.** Untested hypothesis worth checking first: Phase 5 added a lot of auth traffic to the suite (`history.spec.ts` creates and deletes real users), and `/api/meetings` calls `supabase.auth.getUser()` on every request, so a rate-limited auth call would surface as the handler's own 500. (checkpoint)
- **A muted microphone can come back unmuted after a reconnect, and nothing currently restores it.** F23 measured this, saw mute hold, and declined to write restoration code on that evidence. F24 caught it failing once during a full-suite run — `aria-pressed="false"` after an offline/online cycle — then passing 17 consecutive times, including 12 under four-way parallel load. So it is rare and load-dependent, and it is also **silent and privacy-adjacent**: you speak into a room you believe cannot hear you. The fix is small — capture mic/camera intent and reapply on `Reconnected` — and F23's stated reason for not writing it (a race with the SDK's own restore) is still the thing to be careful of. `connection.spec.ts:124` is the test that caught it and will catch it again. **Decide whether to fix now or defer to F26 with the other suite work.** (F23, F24)
- **F24's loading skeletons were built, measured, and removed — the bullet is deliberately unbuilt.** `loading.tsx` flushes the response before the route's own gate runs, so it turned a dead meeting link from 404 into 200 and the signed-out `/history` redirect from a 307 into a client-side navigation that first rendered the page heading to someone not allowed to see it. Both regressions were caught by existing tests and by direct measurement; see `constraints.md` → Error and loading surfaces. Having a skeleton on either route means moving the gate above the streaming boundary, which is a larger change than the skeleton earns — the cold-start gap it was meant to cover is mostly Render's own wake, which `constraints.md` → Hosting says cannot be branded or shortened anyway. (F24)
- **History's `limit(50)` counts participation rows, not meetings.** With rejoins, a user with heavy history could have a meeting's earlier session fall outside the window, shortening that entry's span. Bounded and rare — it needs 50+ rows — and the fix is a `distinct on (meeting_id)` or a two-step id query. Revisit only if history depth ever matters. (F21)
- **~~`POST /api/meetings` 500s under parallel test load~~ — diagnosed at the Phase 3 checkpoint and closed.** It is `next dev` resetting connections when four Playwright workers hit it at once, surfacing as `read ECONNRESET` *before* any handler runs: across four fully logged suite runs the handler logged nothing, and twelve concurrent requests by hand never reproduced it. `createMeeting` now retries once on a thrown transport error only — a non-201 still fails immediately, so a genuine 500 stays as loud as it was. CI builds and runs a production server, where this has never appeared. (checkpoint)
- **F22's six device- and deploy-dependent checks all block F25.** Every one needs hardware or a deployed URL, and a mobile pass that claimed them from devtools emulation would be claiming the emulator. In order of what would be most embarrassing to get wrong: (1) safe-area insets actually rendering on a notched phone — `viewport-fit=cover` and the `.call-surface` / `.sheet-surface` insets are written but are a no-op on every desktop browser, so nothing has confirmed them; (2) the full guest-join flow on a real iOS device and a real Android device; (3) audio starting after the Join gesture on iOS Safari; (4) device pickers showing real labels on mobile after permission; (5) the deployed-instance performance targets — Lighthouse on mobile throttling and a ten-minute four-participant call; (6) a real desktop screen share received on a real phone. **Blocks F25.** (F22)
- **~~Home's first-load JS is ~341 kB gzipped against a 200 kB target~~ — measured and partly closed at F22.** Confirmed at 343 kB, then cut to **279 kB** by deferring the Supabase browser client behind the sign-in click. Still over target, and the reason is recorded in `constraints.md` → Performance and bundles rather than the target being lowered: React and react-dom are ~112 kB of the remainder, `zod` cannot leave because `env.ts` parses with it at import, and the rest needs sign-in moved off the browser client entirely. Reopen only if that rewrite becomes worth doing for its own sake.
- **The denied, no-device, and in-use states have no automated coverage.** `--use-fake-ui-for-media-stream` auto-grants and the fake device is always present, so none of the three is reachable from the suite as configured. Reaching them needs a second Playwright project launched without the fake-UI flag. **F26 owns this**; until then they are verified by hand.
- **A device that hangs on a first visit still leaves the lobby waiting.** The timeout only runs once permission is known granted, because a pending prompt is a person thinking, not a fault. Reloading recovers, since permission is granted by then. Fixable by watching `PermissionStatus.onchange` and starting the timer when the state flips — worth doing only if it is seen in the wild. (F07)
- **The F08 camera-track flake recurred at F24, and this time the artifact was kept.** `control-bar.spec.ts` → "the camera control releases the device, not just the picture" failed once in a full-suite run with **two** live video tracks where one was expected, then passed on re-run. That is the same duplicate-track shape as the original F08 flake, so the purity fix made then (a `track.stop()` inside a `setState` updater) was not the whole cause. The artifact is preserved outside `test-results/` this time, per the standing instruction two follow-ups have now given: see the scratchpad copy noted in `build-journal.md` → F24. Most likely a genuine race in acquisition under parallel load rather than a test defect — **F26 owns it** with the other suite work. (F08, F24)
- **The microphone paths have no automated coverage.** `getUserMedia({audio:true})` hangs on this machine, so the mic toggle, mic picker, and mic labels are manual checks. The camera equivalents cover the shared code, since both kinds run the same acquisition path. **F26 owns closing this**, alongside the denied-state gap above. (F08)
- **Configure the LiveKit Cloud webhook URL at F25, and only then is F20 proven against real traffic.** LiveKit cannot reach `localhost`, so F20 was verified with signed payloads the suite sends itself — real signatures, real protobuf-JSON, no test-only path through the route, but our own idea of what LiveKit sends. What stays unverified until the dashboard points at the deployed origin: that `room.name` really carries the room code, that `participant.name` is really the token's display name, and the actual delivery/retry cadence. The build plan's two-account join/leave and killed-tab runs belong there too. **Blocks F25.**
- **`room_finished` would 500 if LiveKit's clock ran more than a meeting's lifetime behind Postgres's.** `ended_at` comes from the event, and `meetings_ended_after_creation` rejects one older than `created_at`. Unreachable in practice — `room_finished` fires after the empty timeout, minutes past creation — and it degrades safely, since the nightly sweep closes the meeting at `expires_at` anyway. Found at F20 by a test fixture that back-dated events before the meeting existed. Worth a `greatest()` clamp only if it is ever seen. (F20)
- **A `user:<uuid>` identity whose profile row is missing would 500 and retry.** The FK to `profiles` would reject the insert. Unreachable while the `on_auth_user_created` trigger works — and if it does not, a loud repeated failure is the right outcome, so this is recorded rather than defended against. (F20)
- **Add the Render URL to Supabase's Redirect URLs at F25.** The localhost callback is configured and the Google round trip works; the deployed origin needs the same entry, plus `NEXT_PUBLIC_SITE_URL` pointed at it. **Blocks F25.**
- **Check whether the email/password provider is enabled on the Supabase project, and disable it if so.** `architecture.md` says Google OAuth is *the only* sign-in method, but nothing in the code enforces that — an enabled email provider is a live account-creation surface reachable straight from the Auth API, outside every route handler here. The security advisor's one finding (`auth_leaked_password_protection`) is about password auth and is moot either way once email is off.
- **LiveKit credentials are live locally and proven end to end** — F09 mints tokens against them and joins real rooms. Render still needs all three set in its dashboard at F25. **Blocks F25.**
- **A room with one participant behaves differently from a room with two, in two unrelated places.** Screen sharing into an empty room is unreliable (below), and LiveKit does not echo a participant-attribute change back to the participant who set it while they are alone — found at F15, worked around by holding your own raised hand in local state. Two findings with the same shape is worth treating as a pattern the next time something works with an audience and not without one. (F13, F15)
- **~~Screen sharing into an empty room is unreliable~~ — investigated at F24 and closed as unreproducible.** 32 solo publishes: 8 sequential, 24 under three-way parallel load, and 8 through the old camera-sourced picker stub. All 32 stayed up. `livekit-client` has not moved since F07, so it is not an SDK bump; the original observation was environment- or harness-dependent, or LiveKit Cloud changed underneath. No regression test was added, deliberately — if the behaviour is real but rare, that test becomes the flake F13 was avoiding. Recorded in `constraints.md` → The call as unproven rather than known-bad. (F13, F24)
- **A real desktop share has never been received on a real phone.** The suite stubs the picker and proves the publish path, the capability gate, and the remote tile — but the build plan's own verify line asks for a phone as receiver, and that stays manual. **Moved to F25** with F22's other device-dependent checks, since no phone can reach a local server over a secure context. (F12, F22)
- **~~Pressing the share control during the connect handshake silently does nothing~~ — fixed at F24.** The control is disabled until the room reports `Connected`, and says why rather than being merely dim. Only *starting* is gated; stopping stays available in every state, including a mid-call reconnect, which is exactly when someone wants their screen to stop being broadcast. `edge-states.spec.ts` holds the room in Connecting by pointing the client at an unreachable server, so the assertion is deterministic rather than racing a one-to-three-second window. (F12, F24)
- **The wordmark's tittle sits ~3.5px off during the `next/font` swap window**, because the generated fallback matches advance and ascent but not glyph shapes. First paint only, on a cold load. Accepted at F02 rather than trading it for a flash of invisible text; revisit only if it looks wrong on the deployed instance.
- **~~With chat open and scrolled up, nothing signals a new message~~ — fixed at F24.** A *New messages* control appears when, and only when, something has arrived since the reader scrolled away from the floor; scrolling back through a finished conversation shows nothing, which is asserted separately so the control cannot become a notification about nothing. (F19, F24)
- **The composer under a phone's on-screen keyboard is half-addressed and wholly unverified.** F22 set `interactiveWidget: 'resizes-content'`, which shrinks the layout viewport on Android Chrome so the composer stays above the keyboard, and gave the sheet its bottom safe-area inset. **iOS Safari ignores that field** and may still need a `visualViewport` treatment. Playwright has no soft keyboard, so neither half is tested. **F25 owns it**, with a device in hand. (F19, F22)
- **`joinAs` is copy-pasted into eight e2e specs.** Every call spec declares its own four-line version because they drifted apart before there was a support module; they are now identical. Lifting one into `tests/e2e/support/` is a small, safe cleanup that touches every call spec at once, so it wants its own commit rather than a feature's. **F26 owns it** with the other suite work. (F17)
- **~~`/tokens` still ships its markup in the production bundle~~ — checked at F22 and closed.** It is its own route with its own chunk, so it contributes nothing to Home's first-load JS, which is the only budget that was ever tight. A few kB on a route that 404s in production is not worth a change.

## Key Decisions

- **The most valuable thing F24 built was removed before it shipped.** Route-level `loading.tsx` is the conventional answer to a slow server render, and on both routes here it was actively harmful: Next flushes the loading shell immediately, which sends the HTTP status, so `notFound()` afterwards can only swap the UI and `redirect()` degrades to a client-side navigation. A dead meeting link went from 404 to 200; signed-out `/history` went from a 307 to a 200 that rendered the page's own heading to someone not allowed to see it, and would have stranded a visitor without JS on a skeleton forever. Two existing tests caught the first, nothing caught the second — the auth e2e passed, because the client-side redirect does eventually happen. **A skeleton is only safe on a route whose server work is pure fetching, never one that gates.** (F24)
- **An exhaustive-looking `switch` proves nothing without a `never` guard, and a partial read of a type file is how you get one.** F23's disconnect mapping handled thirteen `DisconnectReason` members because thirteen was as far as the `sed` window reached; the enum has seventeen, and `typecheck` passed clean — `noImplicitReturns` is off, so the four missing members simply returned `undefined`, which would have rendered a blank panel to someone whose call had just dropped. The unit test caught it on its first run. The same undercount was sitting in the published docs for `ConnectionQuality`, which list four values and omit `Lost` — the state a recovery feature exists for. Installed types are the authority; a docs page is a summary. (F23)
- **A responsive rule that holds at both extremes can fail in the middle, and 360px-only testing cannot see it.** Ten specs measured the mobile floor and passed; `/history` was overflowing by 181px at 768 and 209px in phone landscape the whole time, because `truncate` has no effect on an inline box and the cell is a flex item below `sm:` and `block` above it. The layout had switched to its wide form before it had the room that form assumes. The other half of the same lesson: reading found two bugs the sweep never could — a `viewport` export that was missing, so every `env(safe-area-inset-*)` in the project had been resolving to zero since F09, and which a desktop browser reports as correct either way. (F22)
- **`suppressHydrationWarning` suppresses the warning by keeping the server's output, which means it hides timezone bugs rather than fixing them.** A server-rendered `Intl` call formats in the server's zone — UTC on Render — so history showed every reader the wrong time. The e2e caught it from a UTC+14 browser, and caught the first fix too: the escape hatch stopped React re-rendering at all. The working shape is a hydration flag through `useSyncExternalStore`, the same primitive `use-media-query` uses for the same reason. Any value only the reader's environment knows needs a real client re-render, not a silenced warning. (F21)
- **Sign-in can be tested without the identity provider.** F21's plan assumed a signed-in page was untestable, since Playwright cannot drive Google's consent screen and the password path would mean enabling a provider we want closed. `auth.admin.generateLink` + `verifyOtp` mints a genuine session with no mail sent, and writing it into the browser in `@supabase/ssr`'s cookie shape signs the context in for real — `getUser()` still revalidates, RLS still sees the real `auth.uid()`. Reach for this before conceding coverage on anything behind auth. (F21)
- **The webhook records LiveKit's clock, not ours, and the tests are built so a `now()` handler fails rather than merely being wrong.** Every event time asserted in `livekit-webhook.spec.ts` is deliberately in the past, because a handler using `now()` passes every "the row exists" check while recording a duration that never happened — and F21 renders exactly that duration. Idempotency needed no new schema either: the partial unique index from F03 already says a participant has at most one open row, so a redelivered join collides instead of doubling. (F20)
- **Unread is counted by index, and the seen mark is stamped in handlers rather than an effect.** An index has no tie-break problem where a message sharing a millisecond with a timestamp could be counted either way — and stamping on both open and close keeps `setState` out of an effect body, which is an error here. It also meant `closePanel` had to exist beside `togglePanel`: the sheet dismisses itself, and that path would otherwise never mark anything seen. (F19)
- **The end-to-end encryption claim is measured at the data channel, because no HTTP request ever carries it.** `page.on('request')` cannot see SCTP over WebRTC, so a request-level assertion would have passed without ever looking at the bytes — the most dangerous kind of green test. `chat.spec.ts` patches `RTCDataChannel.prototype.send`, asserts no outgoing payload contains the plaintext or the key, and asserts the recording is non-empty so it cannot pass vacuously. (F18)
- **A peer's clock is not evidence.** The envelope carries `sentAt` and the schema validates it, but the transcript is ordered and timestamped by local arrival: sorting by a sender-supplied value lets one misconfigured client reorder everyone's transcript and a hostile one pin itself to the top. Decryptions are chained through a tail promise for the same reason — async resolution order is not arrival order. (F18)
- **A value the browser can read synchronously does not belong in an effect.** `useChatKey` was written the way `code-standards.md` drew it — read the hash in an effect, `setState` — and `react-hooks/set-state-in-effect` failed the build over it, correctly: a link with no key would have cost a second render pass before paint. The fragment now comes through `useSyncExternalStore`, the same shape `use-media-query` uses for the same reason, and only the genuinely async import touches state. The doc's canonical snippet was wrong and has been corrected. (F17)
