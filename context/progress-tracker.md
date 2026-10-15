# Progress Tracker

> **Role:** The current build status: what is done, in progress, and next.
> Read at the start of every session and update after every completed feature.
> **Relates to:** matches the features in `build-plan.md` exactly; moves older decisions to `constraints.md`.

Any AI agent reading this should immediately know what is done, what is in
progress, and what is next.

## How this file is maintained

- Overwrite Current Status; never append to it. Keep three lines describing only the latest state. Previous statuses belong in `build-journal.md`.
- Edit the Progress checkboxes in place. Tick the completed feature without repeating or duplicating the checklist.
- Keep the 10 most recent Key Decisions, newest first. When adding an 11th, move the oldest bullet to its topic in `constraints.md`. Never delete it: an older decision may still apply.

---

## Current Status

**Phase:** Phase 7 — Ship, post-build maintenance
**Last completed:** Camera switching and rear-camera display correction were implemented and locally verified on 10 Oct 2026. The in-call camera switch appears when multiple cameras are available, including when joining with the camera off. If capture fails, the previous lens is restored; if capture stalls, it is stopped and the controls are made available again. The lobby and call mirror the local preview according to the active lens. Ten browser regression tests passed using virtual capture and a live two-participant LiveKit call, verifying correctly oriented remote rear-camera frames and no microphone restart. All 242 unit tests, type checking, lint, and the production build passed. Focused review has no remaining findings. The Supabase activity workflow was committed and pushed as `8.00.6`, and its first manually dispatched GitHub run succeeded.
**Next:** Camera changes are approved for the local `8.00.7` commit. Push and deploy when requested. After deployment, the camera still needs checking on real iPhone Safari and Android Chrome; see Follow-ups for the exact checklist. The build plan is complete. The webhook regression and deployed performance checks remain open as separate work.

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
- [x] Phase checkpoint — verify Phase 6 — Mobile and resilience is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 7 — Ship

- [x] 25 Render deployment
- [x] 26 End-to-end test suite
- [x] Phase checkpoint — verify Phase 7 — Ship is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

---

## Follow-ups

Work carried forward, including the record of how earlier follow-ups were resolved.
Clear open work when the feature that needs it is completed.

### Camera correction on real phones

Pending after deployment. In a two-participant call on real iPhone Safari and
Android Chrome:

1. Switch front → rear → front through MORE. Confirm the front self-view is mirrored and the rear self-view is not. Also check a lens selected in the lobby before joining.
2. Join with the camera off and select a lens before enabling capture.
3. During a call, turn the camera off, cycle lenses twice, then turn it on. It must stay off until enabled and then use the selected lens.
4. Point the rear camera at readable text. The other participant must receive it normally.
5. Confirm audio continues, the call stays connected, rapid taps do not queue switches, and the controls work in portrait and landscape.

The browser regressions use virtual lenses and cannot prove how phone capture
drivers behave. (Camera follow-up, 10 Oct 2026)

### Empty-room webhook regression

Pending verification with credentials. Run `tests/e2e/livekit-webhook.spec.ts`,
then temporarily restore the old `room_finished` handler and confirm that the new
"an emptied room leaves the link joinable" test fails. Local checks passed at
`8.00.5`, but that checkout had no credentials and the new e2e test had not run.
(8.00.5)

### Supabase clock error

Monitor this without adding a fix. `POST /api/meetings` returned 500 with
Supabase's `PGRST303 — JWT issued at future` once during the Phase 7 checkpoint's
first full-suite run against a production build. The second run was clean; the
combined server log contains exactly one occurrence.

The service-role key is a static JWT whose `iat` was fixed when the project was
created. Only Supabase's clock can make it appear future-dated. The local clock
was checked against a network source and was correct to the second.

This differs from the transport starvation below, where no response arrives.
`createMeeting` retries only thrown transport errors. Do not extend that retry to
this error: `PGRST303` has the same form as genuine JWT and permission faults,
which a retry could hide. If it recurs, check whether the clock skew coincides
with the free instance resuming from idle. (checkpoint)

### Raise-hand test failure (closed)

The failure at `reactions.spec.ts:83` was traced to the test's join check at
`7.26.6`, not to an intermittent product bug.

`page.getByText('Connected')` defaults to a case-insensitive substring match. It
matched the status strip's initial `Disconnected` text, so `joinAs` immediately
continued before the room connected. The test raised a hand 2.7s before the signal
connection was ready. LiveKit refused it with `cannot send signal request before connected`;
the request timed out about 5s later, and `reactions-provider.tsx` discarded the
rejection through a `void`. The hand was never recorded, so a latecomer correctly
saw no raised hand.

On a production build, this caused 7 failures in 40 runs at one worker and 24 in 40
at four workers. Every single-worker failure reached the product assertion. With
`exact: true`, that assertion failed 0 times in 40 runs. The earlier explanation
about a narrow timing margin was wrong: the write was attempted before it could
succeed. (F15, F26)

### Meeting creation timeouts under full-suite load

Intermittent `POST /api/meetings` 500s were initially diagnosed and closed as a
`next dev` issue. Later measurements narrowed that conclusion. The handler log requested since the Phase 5 checkpoint was
captured during a failing run. It showed `TypeError: fetch failed` /
`ConnectTimeoutError` on `:443` after 10s (`UND_ERR_CONNECT_TIMEOUT`).

The earlier theory that `getUser()` was rate-limited was wrong. The request never
reached auth, and Supabase answered 20 concurrent requests at about 0.19s each
while the suite failed. Undici could not establish a connection, consistent with
the event loop being too busy. `next dev` compiles routes on demand under the
four-worker load.

The same full suite against a production build had zero connection timeouts and
zero handler errors, compared with 23 under `next dev`. This initially closed
both this issue and the older `ECONNRESET` follow-up as dev-server effects.

Correction at `7.26.6`: zero errors in that full suite did not mean production was
immune. Forty repetitions of one two-participant call at four workers produced
2 `ConnectTimeoutError`s on a production build. That load is much denser than the
full suite, which mostly visits pages without rooms. Production reduces the
starvation substantially but does not eliminate it. `createMeeting`'s transport
retry prevents both sets of errors from failing the suite; it still serves a real
purpose. (F26)

### Microphone mute state after reconnection

The original concern was that a muted microphone could return unmuted after a
reconnect. F23 saw mute preserved and did not add restoration code. F24 saw one
failure followed by 17 passes.

Instrumenting `connection.spec.ts` (see `tests/e2e/support/reconnect.ts`) and running
it 40 more times explained the results. All 39 runs that produced evidence used
the resume / ICE-restart path after `context.setOffline()`: zero new
`RTCPeerConnection`s, zero new capture acquisitions, and zero unmutes. Only a full
restart runs `republishAllTracks`, where mute intent could plausibly be lost.
The roughly 57 accumulated passes therefore do not test that risk, and repeating
this test will not resolve it.

A complete read of livekit-client 2.21 found that every SDK-owned path deliberately
preserves mute:

- `republishAllTracks` calls `restartTrack()` only behind `!track.isMuted`.
- `handleTrackEnded` defaults to mute on failure.
- Publishing carries `muted: track.isMuted`.
- On rejoin, `LocalParticipant.updateInfo` updates the server to match the client's local value, repairing a mute signal lost while offline.

Do not add a fix that reapplies mute on `Reconnected`. It would write over a
correct SDK path during `republishAllTracks`, creating the race F23 was concerned
about.

The browser test cannot force a full restart. `context.setOffline` fails with a
`SignalReconnectError`, which `attemptReconnect` explicitly excludes from
escalating the next attempt to a full reconnect. It keeps resuming. Measurements
after 10s, 20s, 30s, and 45s offline all showed zero new peer connections. See
`constraints.md` → Testing. This question is settled by reading livekit-client;
that is the best available evidence, rather than a test gap to reopen.
(F23, F24, F26)

### Lobby microphone track leak (fixed)

Found and fixed while investigating mute after reconnect. The mount acquisition
effect in `use-media-preview.ts` checked only `cancelled`, which its own cleanup
sets. Pressing Join does not unmount the hook. Instead, `stopPreview()` marks the
preview as abandoned by incrementing `generation.current`.

The mount effect was the only acquisition path that did not check that counter;
`setCameraEnabled` and `setMicrophoneEnabled` already did. A request still pending
at Join could finish with `cancelled === false`, reach `hold()`, and never be
stopped. The device remained open for the entire call with `enabled: true`, even
though the control showed muted. No audio reached the room because that track
was never published, but the OS microphone indicator stayed lit. This violates
`constraints.md` → Media and devices.

On a production build, measurements found 2 live audio tracks in 6 of 6 runs
before the fix, and 1 in 6 of 6 after it. The effect now snapshots both counters
before its first await and releases anything superseded. This is almost certainly
the F08/F24 duplicate-track failure. If it recurs, that explanation was wrong.
(F07, F08, F24)

### Supabase connection resets in the test process

The test process's own Supabase reads can fail with `ECONNRESET`. Three
`livekit-webhook.spec.ts` tests failed during the F25 full-suite run with
`TypeError: fetch failed / read ECONNRESET` in the spec's `supabaseAdmin` reads.
All nine passed immediately afterwards in isolation. This was an outbound TLS
connection from Playwright being reset, distinct from a `/api/meetings` 500
returned by our route handler. The likely cause was the free Supabase project
throttling concurrent connections during the full suite.

Mitigated at `7.26.2` by retrying transport errors in the spec's read helper, as
`createMeeting` already does. This is not claimed as cured. At `7.26.6`, while the
connection check was still expiring, five `livekit-webhook` and four `history`
specs hit the 30s default test timeout. Slow Supabase reads plus a retry can take
longer than that. They passed in every run after the connection check was fixed,
so the triggering load is rarer, rather than gone.

If it returns, increase `test.setTimeout` on the Supabase-heavy specs instead of
adding another retry. (F25, F26)

### Missing reconnect banner in tests (closed)

The failure in `connection.spec.ts` was closed at `7.26.6` with the same cause as
the raise-hand failure. The earlier note
blamed the test timeout rather than the product, but identified the wrong reason.

Immediately before `setOffline(true)`, the test's
`expect(page.getByText('Connected'))` matched `Disconnected`. The room had never
connected, so there was nothing to disconnect from and no reconnect banner could
appear. Waiting 30s could not change that.

Using `connectedStatus()` produced 40 of 40 passing runs at four workers, the same
load under which the original single failure occurred. (F23, F26)

### Route loading skeletons (deliberately removed)

F24 built, measured, and removed these skeletons. `loading.tsx` sends the response
before the route's access or validity check runs. A dead meeting link changed
from 404 to 200. The signed-out `/history` redirect changed from a 307 to a
client-side navigation that first showed the page heading to someone without
access. Existing tests and direct measurements found these regressions; see
`constraints.md` → Error and loading surfaces.

Adding a skeleton safely would require moving the check above the streaming
boundary. That is a larger change than the skeleton warrants: most of the delay
it was meant to cover is Render waking up, which cannot be branded or shortened.
See `constraints.md` → Hosting. This part of the feature is intentionally left
unbuilt. (F24)

### History row limit

History's `limit(50)` counts participation rows, not distinct meetings. If someone
rejoins often enough to have 50+ rows, an earlier session of a meeting can fall
outside that window and shorten its displayed span.

This is bounded and rare. A `distinct on (meeting_id)` or a two-step id query would
fix it. Revisit only if history depth becomes important. (F21)

### Earlier parallel-load meeting failures (closed)

The earlier `POST /api/meetings` 500s were diagnosed and closed at the Phase 3
checkpoint. With four Playwright workers,
`next dev` reset connections with `read ECONNRESET` before any handler ran.
The handler logged nothing across four fully logged suite runs, and twelve
concurrent manual requests did not reproduce the error.

`createMeeting` now retries once, only on a thrown transport error. A non-201
response still fails immediately, so a genuine 500 remains visible. CI builds and
runs a production server, where this had never appeared in the recorded runs.
(checkpoint)

### F22 checks requiring devices or deployment

Five of six checks were closed across two owner sessions on 15 Aug 2026. Every
check needed hardware or a deployed URL; devtools emulation could not verify them.
Calls on the deployed instance spanning a Mac, an Android, and an iPhone covered:

- (2) the full guest-join flow on real iOS and Android devices;
- (3) audio starting after the Join gesture on iOS Safari;
- (6) a real desktop screen share received on a real phone;
- (4) real device labels in mobile pickers after permission;
- (1) safe-area insets on a notched phone.

Checks (1) and (3) are recorded as reported, rather than specifically tested. They
were inferred from the full session going well. In particular, (1) can fail as
slightly incorrect padding that a person may not notice; that is how it remained
unnoticed from F09.

Check (5), the deployed performance targets, remains open: Lighthouse with mobile
throttling and a ten-minute four-participant call. It blocks no feature. F25's
Verify section requires only a signed-in two-device call, and `code-standards.md`
→ Performance says to record an unmet target with its reason rather than lower
it. This needs four participants and a phone, so it remains work for the owner
rather than for a build-plan feature. (F22, F25)

### Home JavaScript bundle size (partly resolved)

The original estimate was about 341 kB gzipped against a 200 kB target. F22
measured 343 kB, then reduced it to 279 kB by loading the Supabase browser client
only after the sign-in click.

The result is still over target. The reason is recorded in `constraints.md`
→ Performance and bundles; the target was not lowered. React and react-dom account
for about 112 kB of the remainder. `zod` must stay because `env.ts` parses with it
at import. Further savings require moving sign-in entirely off the browser client.
Reopen only if that rewrite becomes worth doing for its own sake.

### Automated media-failure coverage (closed)

`media-failures.spec.ts` now covers denied, no-device, and in-use states using
stubs, because other approaches cannot reach them. The earlier plan for a second
Playwright project does not work.

Seven flag and permission combinations were measured.
`--use-fake-ui-for-media-stream` overrides Playwright's context permissions.
Removing it makes this Chromium reject all capture with `NotSupportedError`.
`stubMediaFailure` instead rejects with a real `DOMException` for each state.

The tests verify the error-to-state mapping, rather than exact wording. Swapping
`denied` and `no-device` in `classify-media-error.ts` was seen to make them fail.
See `constraints.md` → Testing. (F07, F08, F26)

### A stalled device on the first visit

Still open. The lobby timeout starts only when permission is known to be granted;
a pending permission prompt may simply mean the person is deciding. A device that
hangs on the first visit can therefore leave the lobby waiting. Reloading recovers
because permission has been granted by then.

A possible fix is to watch `PermissionStatus.onchange` and start the timer when
permission changes. Make that change only if this occurs in real use. (F07)

### Duplicate camera track observed at F24

`control-bar.spec.ts` → "the camera control releases the device, not just the
picture" failed once in a full-suite run with two live video tracks instead of
one, then passed on re-run. This matched the F08 duplicate-track failure, so the
purity fix made then, involving a `track.stop()` inside a `setState` updater, was
not the whole cause.

This time the failure output was kept outside `test-results/`, as two follow-ups
had already instructed. See the scratchpad copy noted in `build-journal.md` → F24.
A capture-acquisition race under parallel load is more likely than a test defect.

At `7.26.8`, 40 of 40 runs passed at four workers. This is consistent with the
`6.00.2` lobby-leak fix addressing the cause, as that commit predicted. But 40 clean
runs after a single observed failure support "did not reproduce", not "fixed".
Unlike the microphone reconnect test, this test does exercise the relevant path.
Reopen if the failure appears again. (F08, F24, F26)

### Microphone test coverage (closed)

Closed at `7.26.8`. The reason previously given for leaving microphone paths
manual was false: `getUserMedia({audio:true})` completed in 173ms rather than
hanging. That claim had justified the gap since F08.

`lobby-controls.spec.ts` mentioned cameras 35 times and microphones zero times,
even though `use-media-preview.ts` has separate state, generation counters, and
capture-acquisition calls for each device. Four tests now check that:

1. Turning the mic off releases the device instead of just muting it, matching the OS indicator requirement.
2. Turning it back on acquires exactly one track. The `6.00.2` leak involved an audio track, which no test had counted.
3. The picker names a real enumerated device.
4. Switching devices replaces capture in place.

Each test was seen to fail against a deliberate break: muting instead of stopping,
an empty device list, a leaking swap, and an ignored stored preference.
(F08, F26)

### Camera picker test that could pass without devices (fixed)

Fixed at `7.26.8`, after remaining ineffective since F08. `DevicePicker` shows
`No devices found` for an empty list. A test that only checked that an option had
a label therefore passed with no devices at all. Emptying the list confirmed this.

The test also could not distinguish a browser-provided label from the picker's
`Camera 1` fallback. That fallback is exactly what appears when devices are
enumerated before permission, the bug the test was supposed to catch.

Both versions now require an option with a real `deviceId` and a label that is not
the fallback. Both were seen to fail. This remains documented because other tests
can make the same mistake. (F08, F26)

### LiveKit Cloud webhook configuration (verified)

Configured at F25 and verified with a real browser on the deployed instance.
`participant_joined`, `participant_left`, and `room_finished` all arrived and wrote
the expected records. This confirmed F20's assumptions:

- `room.name` carries the room code and resolves to the correct meeting.
- `participant.name` carries the token's display name.
- `guest:<uuid>` links join and leave events, `user_id` is null, and generated `is_guest` is true.
- `joined_at` uses LiveKit's clock, not event delivery time.

Join delivery took about 10s; `room_finished` arrived about 45s after the room
emptied. Both leave paths were tested. A deliberate leave recorded 6s for a 6s
session. Killing a tab recorded 29s for an approximately 8s session because
LiveKit took about 22s to detect the lost connection. The reconciliation behavior
F20 was designed for worked correctly.

Leave is a two-step armed control. Clicking it once and closing the tab tests the
killed-tab path, not a deliberate leave. (F20, F25)

### A room-finished event with an old timestamp

The recorded concern is that `room_finished` would return 500 if LiveKit's clock
lagged Postgres's by more than the meeting's lifetime. `ended_at` comes from the
event, and `meetings_ended_after_creation` rejects timestamps before `created_at`.

This is unreachable in practice: `room_finished` follows the empty timeout,
minutes after creation. It also fails safely because the nightly sweep closes the
meeting at `expires_at`. F20 found it through a fixture that dated events before
the meeting existed. Add a `greatest()` clamp only if it occurs in practice.
(F20)

### A signed-in identity without a profile

A `user:<uuid>` identity with no matching `profiles` row would cause a 500 and a
retry because the foreign key rejects the insert. This cannot occur while the
`on_auth_user_created` trigger works. If that trigger fails, repeated visible
failures are the correct outcome, so no defensive workaround was added. (F20)

### Render URL in the sign-in configuration (verified)

Completed at F25. `NEXT_PUBLIC_SITE_URL` was confirmed as the correct origin in
the deployed client bundle. That alone could not verify Supabase's redirect
allow-list or the Google client's authorized URI.

Supabase copies `redirect_to` into the Google URL and validates it only during the
callback. Allowed and rejected origins therefore look identical until someone
completes sign-in.

Google sign-in on `https://videocircle-blw4.onrender.com` succeeded on 15 Aug 2026,
verifying both dashboards. The callback exchanged its code, which also exercised
`safeNext` and the origin comparison. (F04, F25)

### Email/password provider (disabled)

The provider was enabled and is now disabled. `/auth/v1/settings` originally
returned `external.email` as `true` with `disable_signup: false`. Anyone could
therefore create an account directly through the Auth API, bypassing every route
handler. It now returns `false`, while Google remains `true`. The
`auth_leaked_password_protection` advisor finding no longer applies. (F25)

### LiveKit credentials on Render (verified)

All three credentials are set and verified on the deployed instance, in addition
to the earlier local verification. `/api/token` creates a signed JWT for exactly
one room with the invariant's grants:
`roomJoin`/`canPublish`/`canSubscribe`/`canPublishData`/`canUpdateOwnMetadata`.
It grants none of `roomAdmin`/`roomCreate`/`roomList`, caps the TTL at 3600s, and
returns the `wss://` server URL. A real browser joined that room. (F09, F25)

### Solo calls can behave differently

Two unrelated observations involved a room with one participant: unreliable solo
screen sharing, discussed below, and participant-attribute changes that LiveKit
does not echo to the sender while they are alone. F15 addressed the latter by
keeping the local raised-hand state locally.

When something works with other participants but not alone, check for this kind
of difference. (F13, F15)

### Solo screen sharing (not reproduced)

Investigated at F24 and closed as unreproducible. All 32 solo publishes stayed up:
8 sequential, 24 under three-way parallel load, and 8 through the old
camera-sourced picker stub.

`livekit-client` had not changed since F07, so an SDK upgrade did not explain it.
The original observation may have depended on the environment or test harness,
or on a change in LiveKit Cloud. No regression test was added deliberately: if
the behavior is real but rare, it would create the intermittent failure F13 was
trying to avoid. `constraints.md` → The call records it as unproven, rather than
known-bad. (F13, F24)

### Desktop screen sharing received on a phone (verified)

Completed on the deployed instance on 15 Aug 2026. The owner reported that a
screen share started on a desktop was visible on a phone during a call spanning
a Mac, an Android, and an iPhone.

The suite already stubs the picker and verifies publishing, the browser support
check, and the remote tile. Receiving on a real phone needed hardware; a phone
cannot reach a local server over a secure context. This was the final screen-share
check that automated tests could not reach. (F12, F22, F25)

### Starting screen share while connecting (fixed)

Fixed at F24. The share control is disabled until the room reports `Connected`,
and explains why. Only starting is restricted. Stopping remains available in
every state, including a reconnect, when someone may want to stop broadcasting.

`edge-states.spec.ts` holds the room in Connecting with an unreachable server.
This makes the assertion deterministic instead of racing the one-to-three-second
connection window. (F12, F24)

### Wordmark misalignment during font loading (removed)

The dot over the wordmark's i sat about 3.5px off during the `next/font` swap
window. At `7.00.6`, the brand changed to a red square between the words instead
of dots over both i's. Nothing is now positioned against JetBrains Mono's stem
centre or tittle height, so the fallback font has no matching glyph geometry
to get wrong.

F02 had accepted the offset instead of introducing a flash of invisible text;
that would still have been the right choice if the old mark had stayed. This was
a brand change that removed the condition for the bug, rather than an alignment
repair. The same commit removed the U+0131 DOTLESS I workaround and the original
reason for the aria-label. See the two wordmark bullets in `constraints.md`.
(F02)

### New chat messages while scrolled up (fixed)

Fixed at F24. A *New messages* control appears only when a message arrives after
the reader has scrolled away from the bottom. Scrolling back through a finished
conversation shows no control. A separate assertion verifies that case so the
control cannot announce messages that did not arrive. (F19, F24)

### Chat composer above the phone keyboard

Reported working on a real iPhone, but not confirmed as solved. F22 set
`interactiveWidget: 'resizes-content'`, which shrinks Android Chrome's layout
viewport to keep the composer above the keyboard. The sheet also gets its bottom
safe-area inset.

iOS Safari ignores that setting. The plan expected to implement a `visualViewport`
solution, so this check was budgeted as implementation work. The owner noticed no
problem while using the deployed app, but did not specifically check this
behavior. Playwright has no software keyboard, so automated tests cannot settle it.

Keep the iOS behavior unconfirmed. If the composer is seen behind the keyboard,
`visualViewport` is the known solution; it does not require a fresh investigation.
(F19, F22, F25)

### Shared join helper (completed)

`joinAs` moved to `tests/e2e/support/join.ts`. The original note said it was copied
identically across eight specs. It was actually in 12 specs with 7 variants.

Those variants reduced to an optional `hash` and
`until: 'connected' | 'mounted'`. `connected` is the default because it is strictly
stronger. The five specs that waited only for the control bar use `mounted`.
No spec changed behavior, confirmed by a 126/126 full-suite run immediately after
the extraction. (F17, F26)

### Tokens page production markup (closed)

Checked and closed at F22. `/tokens` has its own route and chunk, so its markup
does not contribute to Home's first-load JavaScript, the only tight bundle budget.
A few kB on a route that returns 404 in production does not justify a change.

## Key Decisions

- Camera direction comes from active capture metadata, never from a lens label.
  Labels vary by language, and rear lenses may have unclear names. A shared reader
  that handles capture restarts keeps the lobby and call consistent. Rear self-views
  show the scene normally; front and unspecified desktop self-views stay mirrored.
  LiveKit changes capture inside the existing room, preserving audio and the
  connection. Selecting a lens while the camera is off must not enable it.
  (Camera follow-up, 10 Oct 2026)

- Supabase activity checks are separate from keeping Render awake. The approved
  external workflow makes read-only Data API queries as `anon`; existing RLS hides
  every row. It never calls the web service. The publishable key needs no new
  policy, schema, privileged credential, or app code.

  A fully paused Supabase project must be resumed in the dashboard. The earlier
  claim that a request wakes it confused Supabase with Render. Setup and scheduler
  limitations are in `docs/DEPLOYMENT.md` → Supabase activity check.
  (Supabase activity follow-up, 10 Oct 2026)

- An empty LiveKit room does not end a meeting. The room starts on the first join
  and finishes shortly after the last person leaves. The meeting link may belong
  to someone who has not opened it yet, so it needs a different lifetime.

  F20 treated `room_finished` as the end of the meeting. The invite therefore
  stopped working as soon as the room first emptied, a common situation because
  the person sending the link usually arrives first. Now `room_finished` closes
  only the session's open participation rows. Only the sweep sets `ended_at`.
  History is unchanged because it did not read `ended_at` while participation rows
  were closed. (8.00.5)

- Responsive checks must measure vertical visibility as well as width. The sweep
  checked only `scrollWidth > clientWidth` and hit areas against 44px. Home passed
  at all eight widths even though `START A MEETING` was entirely below the visible
  area in phone landscape: `viewport ratio 0` at 740x360.

  The hero rework did not cause it. The previous hero put the button another 21px
  lower at that viewport, so the existing checks had never covered the failure.
  The fix uses `@media (height <= 30rem)`. This does not violate the rule against a
  fourth breakpoint in `code-standards.md`, which applies to width and deciding
  what sits beside what. The layout remains the same column, tightened for the
  available height.

  `responsive.spec.ts` now requires the primary action to be fully in view at
  `ratio: 1` at every width. The assertion was seen to fail before the CSS was
  added. (7.00.7)

- Keep dependency clock errors visible. The checkpoint's first full-suite run
  failed one spec because `POST /api/meetings` returned 500 with Supabase's
  `PGRST303 — JWT issued at future`. The service-role key is a static JWT whose
  `iat` was set when the project was created. Local code cannot move it into the
  future; Supabase's clock must be behind it. A free instance resuming is a
  plausible explanation. The local clock matched a network source to the second.

  This differs from the recorded transport starvation (`ConnectTimeoutError` /
  `ECONNRESET`), where no response arrives. `createMeeting` retries thrown transport
  errors only, never a non-201 response, so a genuine 500 remains visible. Extending
  the retry to `PGRST303` would hide real JWT and permission faults too. F26 made
  the same tradeoff when it declined to increase an unmeasured timeout. This is
  recorded as a Follow-up to monitor, without a defensive workaround. (checkpoint)

- A feature can be marked complete from an owner report, provided the record
  clearly distinguishes that from a targeted check. F25 closed after an owner
  session on the deployed instance reported four carried checks working.

  Two of those, safe-area insets and the chat composer above the iOS keyboard,
  can fail as slightly wrong padding that ordinary use may not reveal. They were
  reported from using the app, rather than specifically looking for those issues.
  The plan had expected the iOS composer to need a `visualViewport` solution, so
  "it worked" is weaker evidence for that check.

  They remain recorded as reported rather than directly checked.
  `constraints.md` → Mobile and viewport keeps the iOS behavior unconfirmed.
  Recording all four as equally verified would hide whether the check had a real
  chance to detect a failure. (F22, F25)

- A test's preconditions need the same proof as its assertions. Two long-standing
  intermittent failures came from a connection check that could pass before the
  room connected. `page.getByText('Connected')` makes a case-insensitive substring
  match and therefore matched `Disconnected`. Every connection wait continued
  immediately, including `joinAs`, whose `until: 'connected'` was documented as
  stronger than `mounted` but was actually weaker.

  The symptoms looked like narrow timing margins in the product.
  `reactions.spec.ts` raised a hand 2.7s before signalling was ready, when
  livekit-client refuses the write. It failed 7 times in 40 at one worker and
  24 in 40 at four. `connection.spec.ts` took a room offline before it had connected,
  so no reconnect banner could appear. Neither was a race, timeout margin, or
  LiveKit defect.

  Using `exact: true` through one shared locator produced 0 failures in 40 on the
  raise-hand assertion and 40 of 40 passes on the banner. Preconditions need to
  be seen to fail too. An assertion that is never reached gives no visible warning;
  an incorrect assertion at least produces a failure. (F26)

- Do not use route-level `loading.tsx` skeletons on routes that check access or validity.
  F24 built and removed them after measuring regressions on both routes. Next sends
  the loading shell immediately, including the HTTP status. A later `notFound()`
  can then only replace the UI, and `redirect()` becomes client-side navigation.

  A dead meeting link changed from 404 to 200. Signed-out `/history` changed from
  a 307 to a 200 that showed the page heading to someone without access, and would
  leave a visitor without JS on a skeleton forever. Two existing tests caught the
  first regression. None caught the second: the auth e2e passed because the
  client-side redirect eventually happens.

  A skeleton is safe only when the route's server work is purely fetching data,
  not deciding whether the visitor may see the page. (F24)

- A `switch` needs a `never` guard to prove every case is handled. F23's disconnect
  mapping covered thirteen `DisconnectReason` members because the `sed` read
  stopped there. The enum has seventeen members. `typecheck` still passed because
  `noImplicitReturns` is off; four unhandled members would return `undefined` and
  show a blank panel after a dropped call. The unit test caught this on its first
  run.

  Published `ConnectionQuality` docs had a similar omission: they listed four
  values and left out `Lost`, a state central to connection recovery. Installed
  types are authoritative; a docs page is only a summary. Read the complete type
  rather than relying on a partial window. (F23)

- Responsive layouts can fail between the tested extremes. Ten specs passed at
  the 360px minimum while `/history` overflowed by 181px at 768 and 209px in phone
  landscape. `truncate` does nothing on an inline box. The cell was a flex item
  below `sm:` and `block` above it, so the wider layout appeared before there was
  space for it.

  Reading also found two bugs the sweep could not detect, including a missing
  `viewport` export. Without it, every `env(safe-area-inset-*)` had resolved to zero
  since F09. A desktop browser reports that as correct with or without the export.
  (F22)
