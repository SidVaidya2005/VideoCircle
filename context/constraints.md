# Standing Constraints

> **Role:** What still binds — the decisions and non-obvious facts that constrain future work, grouped by topic.
> **Read before any decision that might conflict with past work.**
> **Relates to:** receives decisions displaced from `progress-tracker.md` and decisions promoted out of `build-journal.md` at phase checkpoints.

## How this file is maintained

Keep this file **small**. It is read on demand during ordinary work, so every
line adds to the reading cost of each session that opens it. The history of the
build lives in `build-journal.md`; this file holds only what is still true.

- Group constraints by topic (auth, data, payments…), never by date. Add a `##` topic heading when needed.
- Keep only decisions that constrain future work and explanations of non-obvious choices. The narrative of what happened belongs in the journal.
- Planning-time constraints may be written directly, before any feature exists. Label them as planning constraints under their topic. After the build starts, use one of the two routes below.
- Move decisions here from two places; never copy them:
  - the oldest bullet in `progress-tracker.md` → Key Decisions when that section would exceed 10;
  - each phase's still-binding decisions in `build-journal.md`, at the phase checkpoint.
- Cite the feature each bullet came from, e.g. `(F02)`.
- Check for duplicates when writing. If a new constraint supersedes an existing one, replace that bullet in place rather than adding another on the same topic.
- Never remove a constraint because of its age. Remove it only when you can verify that a later decision reversed it or that the thing it describes no longer exists. `git` history holds anything removed.

<!-- Filed by topic, newest bullet first within each topic:

## {{TOPIC}}
- {{CONSTRAINT}} ({{FEATURE_REF}})

-->

## Hosting

*Promoted from `build-journal.md` at the Phase 7 checkpoint.*

- **Leave `healthCheckPath` unset in `render.yaml`. This decision is settled; it is not waiting for a measurement.** Render's docs say a free instance spins down after 15 minutes without "any inbound traffic", but do not say whether Render's own health checks count.

  A wrong assumption could affect unrelated services. The 750 free instance-hours are **per workspace**, this account runs several free services, and a month is ~730 hours. Keeping one service awake would consume the entire budget and suspend the others. Automatically restarting an unresponsive instance does not justify that risk. (F25)

- **`/healthz` checks liveness only and reads no dependency.** This deliberately goes against Render's advice. A free Supabase project pauses after ~7 days idle. A readiness check that contacted it would turn a paused database into a restart loop, and restarting would not fix the database.

  The route is also excluded from the proxy matcher, so the platform's health probe never reaches the auth service. `tests/unit/proxy-matcher.test.ts` enforces this exclusion: the e2e written for it still passed when the exclusion was removed. (F25)

- **Do not infer the deployed origin from the service name.** Render appends a random suffix when the requested subdomain is taken. This deployment requested `videocircle` and received `videocircle-blw4`: `videocircle.onrender.com` belongs to somebody else. This was verified; that service serves a Create React App bundle and returns HTML from `/healthz`.

  A **Blueprint sync matches services by `name`**. The `name` in `render.yaml` must match the dashboard's, or a sync creates a second free service that shares the workspace's hours. (F25)

- **Set every `NEXT_PUBLIC_*` before the *first* build.** The compiler inlines these values, and Zod parses them at import, so a missing value fails the build rather than an individual request. However, `NEXT_PUBLIC_SITE_URL` cannot be known until the service exists.

  Create the service, read its real origin from the dashboard, set the variables, and redeploy. A wrong origin can go unnoticed: the app builds and runs, while share links and the OAuth redirect point somewhere else. (F25)

*Adopted before the build started, during planning — not promoted from a completed
feature. The feature refs below point at where each one will be applied.*

- **Render's free tier is a deliberate choice, including its sleep behaviour.** A free web service sleeps after 15 minutes without inbound traffic. The next request takes roughly a minute to wake it. During that time, Render serves its own loading page before any of our code runs, so that page cannot be branded, shortened, or replaced. This limitation is accepted to keep the project free to run. (F25)

- **Design for someone opening a link while the service is asleep.** The meeting's creator has just used the app, so the service is warm for them. The delay affects someone opening a shared link after an idle spell, or opening the portfolio demo link cold. Surfaces that hand out links must explain this plainly; the README does so above the demo link. Never promise instant join in copy. (F06, F25)

- **A free Supabase project can pause after low database activity over seven days. Once paused, it must be resumed in the dashboard.** Ordinary app requests do not wake it; automatic waking is a behaviour of Render's sleeping web service. Auth and meeting reads/writes remain unavailable until resumption, and `pg_cron` does not run while the database is paused.

  After resumption, `/api/token` still rejects expired links by reading `expires_at` directly, even before the next expiry sweep updates `ended_at`. The daily activity workflow is best-effort prevention. It does not replace a paid plan's policy against inactivity pausing. Setup and scheduler limitations are in `docs/DEPLOYMENT.md` → Supabase activity check. (F03, Supabase activity follow-up, 10 Oct 2026)

- **Never keep Render awake with a pinger. A direct Supabase activity check is the approved exception.** One always-on free web service consumes about 730 of the 750 shared free instance hours per month.

  The external database check never contacts Render. It uses only the public publishable key under existing RLS and makes no writes. Do not expand it to visit the app, use privileged keys, or create dummy meetings. (F25, Supabase activity follow-up, 10 Oct 2026)

## Data and RLS

- **A `security definer` helper used inside an RLS policy must retain `EXECUTE` for `authenticated`.** Postgres evaluates the policy expression as the calling user. Revoking that permission makes every read fail with `42501: permission denied for function`; this was verified by encountering the error.

  The common advice to revoke permission applies to helpers called from application code, not from a policy. Isolation comes from the `private` schema, which PostgREST does not expose, rather than from the grant. (F03)

- **Put every `security definer` function in `private`**, with `set search_path = ''` and fully-qualified relations. A function in `public` can be called as RPC by any authenticated user. (F03)

- **Use one permissive policy per table per action, where possible.** Postgres evaluates every permissive policy against every candidate row, then ORs the results. The original "read own" policy on `meeting_participants` was a strict subset of the co-participant policy. The advisor flagged it as `multiple_permissive_policies`, and it was dropped. (F03)

- **The expiry sweep waits 2 hours past `expires_at`.** This allows enough time that no call is plausibly still draining, while keeping the sweep useful as a nightly backstop. It closes open participation rows, which it could not safely do without a grace period. (F03)

- **`meetings.code` has a CHECK constraint limiting it to the room-code alphabet.** The alphabet excludes `i`, `l`, `0` and `1`. The docs used `abc-defg-hij` as an example until F03, but it is *invalid* and the database rejects it. Use `abc-defg-hjk`. (F03)

## Auth and secrets

- **A valid-looking room code never grants authorization.** `/api/token` re-reads the meeting and refuses access unless `ended_at is null and now() < expires_at`. The page's render-time existence check is not enough: the endpoint can be called directly, and a meeting can expire while someone decides whether to join from the lobby. (F09)

- **Parse secrets per service, never in one shared schema.** Each env module parses at import so a misconfigured deployment fails at boot. A shared schema would therefore make every consumer fail when *another* service's credential was missing.

  This prevented `/api/meetings` from building while the LiveKit keys were blank. In production, the same coupling would take meeting creation down during a LiveKit key rotation. LiveKit's pair lives in `env.livekit.server.ts`, added with its first consumer. (F06, F09)

- **Read display names from `profiles`, never `user_metadata`.** Supabase's `raw_user_meta_data` can be edited by the user and appears in `auth.jwt()`, so it is unsafe for any authorization decision. Using it for a name would also create a second derivation alongside the `auth.users` trigger's, which could drift from the name shown in call history. (F04)

- **`/auth/signout` accepts POST only and responds with 303.** A GET signout can be fetched by `next/link` prefetch, speculative loading, or any third-party `<img>`. Each could end a session without user action. A 307 response would preserve the method and re-issue the request as `POST /`. (F04)

- **Resolve auth redirects against `NEXT_PUBLIC_SITE_URL`, never `request.url`.** Render terminates TLS at a proxy, so the request's origin is not reliably the public origin. `X-Forwarded-Host` is also caller-controlled. Using the configured origin leaves exactly one redirect URL to allow-list in the Supabase dashboard. (F04)

- **Compare the callback's `next` by origin, never by prefix.** Both `//evil.com` and `/\evil.com` start with `/`, yet both resolve off-origin: WHATWG URL treats `\` as `/` in special schemes. See `safeNext`. (F04)

- **Read the session server-side in `(shell)/layout.tsx`.** This makes the shell routes dynamic. The header itself has no auth knowledge; it receives a rendered node through its `actions` prop. (F04)

## Encryption

- **Never change a fragment's case.** The chat key is base64url and case-sensitive. Any code that lowercases a string must split off the fragment first. `parseRoomCodeInput` normalises the room code while leaving the fragment untouched. If the key's case changes, the call still connects but chat becomes unreadable, with no other sign of failure. (F05)

- **Generate the room code server-side only.** A collision causes the route handler to generate a replacement code. If the client navigated to the code *it* sent, it would enter a room it does not own. This bug appears only on collision; at 50 bits, that means never in testing and eventually in production. (F06)

- **Keys imported from a link are non-extractable.** Only a key generated in-browser is extractable, and only long enough to put it in the URL. (F06)

- **Treat decrypted payloads as untrusted input.** A valid GCM tag proves that the sender held the link key, as everyone in the room does. It does not prove the message is well formed. `ChatPlaintextSchema` validates incoming and outgoing messages; outgoing validation is where `MAX_CHAT_MESSAGE_LENGTH` is actually enforced. (F18)

- **Validate the sender's `sentAt`, then never use it.** Order and timestamp the transcript by local arrival. A peer-supplied timestamp would let a misconfigured clock reorder everyone's transcript, or a hostile sender pin their messages to the top.

  Incoming decryptions are chained through a tail promise for a related reason: async resolution order differs from arrival order. Without the chain, messages would be ordered by how long each decryption happened to take. (F18)

- **`page.on('request')` cannot inspect the chat data sent over the wire.** The data channel uses SCTP over WebRTC and makes no HTTP request. A request-level check can therefore pass without inspecting a single chat byte. `chat.spec.ts` patches `RTCDataChannel.prototype.send` instead and asserts that the recording is non-empty, so an empty recording cannot produce a passing test. (F18)

- **The privacy claim has a test as well as architectural rules.** Until F16, invariants and review were the evidence that the chat key never leaves the browser. `tests/e2e/invite.spec.ts` now records every request while the invite dialog is open and copying, and asserts that none carries the fragment. Showing the key in a dialog was exactly the change that could have broken this rule, so the test arrived with that feature. (F16)

- **A 32-byte key is 43 base64url characters; shorter test fixtures will not import.** `invite.spec.ts` can use a shorter stand-in because it only passes the fragment through a URL. Anything that actually calls `importChatKey` needs a real key. (F17, F18)

## The call

*Promoted from `build-journal.md` at the Phase 3 checkpoint. The rules themselves
are invariants in `architecture.md`; what follows is the reasoning and the
non-obvious library behaviour behind them.*

### Layouts and participant state

- **Do not use the prebuilt LiveKit layouts; switching to them would be costly.** `GridLayout` renders `lk-*` markup that has no layout without `@livekit/components-styles`, an unapproved dependency. `ParticipantTile` includes a name chip, mute icon, quality dot and focus button, each of which contradicts `Design/README.md` → Participant tiles. We build the grid, tile, filmstrip and control bar from the unstyled primitives. (F10)

- **A memo comparator must read only immutable facts.** LiveKit mutates publication objects in place. Comparing `isMuted` therefore compares the new value against itself and cannot detect the change. This left a dead `<video>` on everyone else's screen when a camera was turned off mid-call.

  Mute and speaking state come from hooks, which re-render regardless of the memo's decision. The same defect reappeared at F13 when `pinned` and `size` were added but left out of the comparison. (F11, F13)

- **Send temporary and persistent state over different transports.** Reactions use the unreliable data channel because losing one costs nothing. A raised hand uses a participant attribute: an unreliable packet can be lost, and a data-channel message never reaches someone who joins later. Both failures would be silent. This is why the grant includes `canUpdateOwnMetadata`. (F15)

- **Keep your own raised hand in local state; read everyone else's from their attribute.** LiveKit does not echo an attribute change back to its sender while they are alone in the room. Reading your own attribute left both the badge *and the button label* unchanged until somebody arrived. Mirroring this state is safe because only that toggle can change it, **but await the write and revert the control if it fails.**

  F15 called a failed write "rarer than the case it fixes" and discarded the result with `void`. F26 measured a failure. Because your hand comes from local state and everyone else's view comes from the attribute, a lost write leaves you as the only person who believes your hand is up. Nothing in the system can correct that state. Reverting the control is the only honest signal that the room did not receive the change. (F15, F26)

- **The empty-room screen-share unpublish could not be reproduced; the F13 note overstated it.** F24 ran 32 solo publishes: 8 sequential, 24 under three-way parallel load, and 8 more through the old camera-sourced picker stub. Every one stayed up. The client version has not changed since F07, so an SDK bump cannot explain the difference.

  The remaining explanations are an environment- or harness-dependent original observation, or a server-side change in LiveKit Cloud. **Treat the behaviour as unproven**, and do not avoid a solo-share test because of it. A permanent solo-share regression test was deliberately *not* added: if the behaviour is real but rare, the test becomes flaky, which was what F13 was trying to avoid. (F13, F24)

- **A participant attribute does not echo back to its sender while they are alone in the room.** This is the surviving half of the former two-part "rooms with one participant are different" note. It remains true; keeping your own raised hand in local state is still the workaround. (F15)

- **`livekit-client` clones the screen-share picker's track and stops the original.** Code holding the track returned by `getDisplayMedia` therefore sees it as `ended` even while the share is healthy. This has cost a debugging pass twice. (F12)

- **Never gate a video element on `isSubscribed`.** `adaptiveStream` uses the visibility of attached `<video>` elements to decide which tracks to subscribe to. A tile that waits for a subscription before rendering the element will never receive one. Gate on mute state alone. (F10)

- **Speech never changes the layout.** `resolveFocusKey` takes no speaker argument, so it cannot follow the speaker. Such a layout would flip several times a minute in an ordinary conversation. Grid is the resting state; only a share or a pin enters spotlight. (F13)

- **Keep no mirrored sharing state.** `useLocalParticipant` re-emits on `LocalTrackUnpublished`. When a share ends through Chrome's own stop bar, the control and banner therefore update without a listener of ours. Having no duplicate state prevents stale UI in this case. (F12)

- **A share requested before `Connected` has no connected room to publish into and is immediately unpublished.** The control bar appears as soon as the room tree mounts, well before the handshake finishes. (F12)

### Panels and accessibility

- **Make exactly one responsive decision in the call with JavaScript.** Everything else uses Tailwind variants, so nothing else in the call tree measures the viewport.

  A Radix dialog traps focus, locks scrolling and hides the page from assistive technology as soon as it opens. Its content is also portaled beyond any wrapper class. Choosing between a sheet and an inline panel must therefore be an actual rendering decision; `lg:hidden` cannot do it. (F14)

- **An `aria-label` on a button overrides its contents.** A screen reader cannot reach a badge inside that button, whatever the badge contains. Put counts in the label. (F14)

- **`CallPanel` unmounts its children when closed; use that to decide where state lives.** Anything that must keep working while a panel is closed belongs in `CallStage`, including the chat key and transcript. Anything that should stop belongs in the panel, which is why the relative-time interval lives there. A hook inside the panel silently stops receiving updates as soon as the panel closes. (F17, F18, F19)

- **A panel can close without its own control being touched.** Opening another panel closes it, and a sheet can dismiss itself. Both paths bypass the toggle handler. Per-panel bookkeeping must run on every such path; the existing example is the chat seen-mark. This was found at the Phase 4 checkpoint, not by the feature's own tests. (F19)

### Reconnection and quality

- **LiveKit *usually* preserves mic mute across a reconnect, but there is a known failure; see the open follow-up.** F23 measured mute preservation, saw it hold, and chose not to write restoration code. During a full-suite run, F24 then caught one failure: after an unchosen connection blip, the mic returned unmuted with `aria-pressed="false"`.

  It has since passed 17 consecutive runs, including 12 under heavy parallel load. The failure is infrequent and load-dependent, but silent: someone can speak into a room they believe cannot hear them. **F23's original wording is not settled evidence; its sample happened to miss the failure.** `connection.spec.ts` caught it. (F23, F24)

- **`onDisconnected` has an optional reason, and `UNKNOWN_REASON` is `0`.** A truthiness check misclassifies both a missing reason and an unknown reason as deliberate leave. These are the two commonest involuntary drops, so that check silently sends someone Home after a failed call. Always compare by name against `DisconnectReason.CLIENT_INITIATED`. See `isDeliberateLeave`. (F23)

- **`DisconnectReason` has seventeen members; the published docs undercount them.** A partial read of the type file can miss them too. F23's first version handled thirteen and missed `SIP_TRUNK_FAILURE`, `CONNECTION_TIMEOUT`, `MEDIA_FAILURE` and `AGENT_ERROR`; two of those are reachable here.

  The same problem affected `ConnectionQuality`: Context7's docs list four values but omit `Lost`, the value a recovery feature exists to handle. **Treat the installed types as the authority and docs pages as summaries.** (F23)

- **`ConnectionQuality.Unknown` is not a degraded state.** Every participant has this value before their first quality report. Treating it as bad would mark every tile on mount and clear it a second later, on every join. Show an indicator only for `Poor` and `Lost`. (F23)

- **The 44px minimum applies to both width and height.** The `+1` reaction chip measured 41px wide despite having full height; padding alone does not guarantee enough width for a short label. Also, the `scale(0.96)` in `animate-tile-in` makes everything inside a newly mounted tile measure fractionally small. Hit-area sweeps must poll rather than measure once. (F13, F15)

## Participation and history

*Promoted from `build-journal.md` at the Phase 5 checkpoint. The rules themselves
are invariants in `architecture.md`; what follows is the reasoning behind them.*

- **An empty room does not mean the meeting has ended. No webhook sets `meetings.ended_at`.** In F20, `room_finished` ended the meeting. That broke the most common invite sequence: the host joins, waits, leaves before the guest arrives, and the LiveKit room finishes. The guest then receives `410 This meeting has ended`.

  Now, `room_finished` only closes that room session's open participation rows. The link remains joinable until `expires_at`, and only the nightly sweep writes `ended_at`. History still works because it uses the participation rows that are closed. Do not restore "end on empty" behaviour. Ending a meeting early would require an explicit host action, which is out of scope. (8.00.5)

- **The partial unique index provides webhook idempotency; no ledger is needed.** `meeting_participants_open_row_idx` permits at most one *open* row per participant per meeting. A redelivered join therefore collides on `23505`, while a genuine rejoin after a clean leave succeeds.

  There is an accepted limitation: if a join is redelivered *after* its row has closed, it inserts a spurious open row. That requires a retry to outlive an entire participation, and the sweep closes the extra row. Do not add an event-id table without a reason this approach cannot cover. (F20)

- **Check which clock produced each timestamp before deciding whether to clamp it.** The sweep compares `meetings.expires_at` from Postgres with `joined_at` from LiveKit. Nothing guarantees the order of those two clocks. A token minted just before expiry can also produce a join *after* expiry.

  The sweep must use `greatest(joined_at, expires_at)` for `left_at`, or the row's CHECK aborts the whole sweep for every meeting. `closeMeeting` compares two LiveKit values, whose ordering is known, and deliberately has no clamp. Do not change these to "make them consistent". (F20)

- **`/api/token` checks expiry only when it MINTS a token.** The token can remain valid for up to an hour afterwards, so a participation row may legitimately begin after the meeting's `expires_at`. Any duration or end derived from `expires_at` must tolerate this. `buildHistoryEntries` clamps to zero for the same reason that the sweep clamps. (F20, F21)

- **History has one entry per meeting, not per participation row.** A rejoin, routinely caused by a dropped connection, writes a second row. Two history entries with the same code and guest list would look like a bug. The history span runs from the user's first join to their last leave, including the gap. (F21)

- **Only `/history` may use the session client instead of `supabaseAdmin`.** All other surfaces serve guests with no session, for whom RLS would hide the row being fetched. On history, the co-participant policy admits exactly the required rows. RLS therefore enforces the scope a second time beneath the explicit `.eq()`. (F21)

- **The webhook records LiveKit's clock, not ours. Tests must reject a handler that uses `now()`.** Every event time asserted in `livekit-webhook.spec.ts` is deliberately in the past. A handler using `now()` would otherwise pass all "the row exists" checks while recording a duration that never happened, which F21 would then display.

  Idempotency also needed no new schema. The partial unique index from F03 already permits at most one open row per participant, so a redelivered join collides rather than duplicating the row. (F20)

## Media and devices

*The rules themselves are invariants in `architecture.md` → Media. What follows is
only the reasoning and the non-obvious library behaviour behind them, which that
file does not carry.*

- **In the lobby, switching a device off releases it; it never mutes it.** A preview that says OFF while the camera light stays on breaks trust. Releasing the device also avoids an SDK trap: on a muted track, `setDeviceId` sets `pendingDeviceChange` and returns early. A device picker would then appear to do nothing until the track was unmuted. (F08)

- **`getUserMedia` is not guaranteed to settle.** It can hang indefinitely instead of rejecting. This was observed here: audio never returned while the camera on the same machine opened normally.

  Acquisition therefore has a timeout. That timeout must never run while a permission prompt may still be open: someone deciding whether to grant access is not a failure, and an unconditional timer would turn this ordinary product path into a rendered error. (F07)

- **Keep each effect run's state local; never move it into a shared ref.** React double-invokes effects in development. The first run's cleanup clears a shared flag, the second run sets it again, and the first request then adopts its track alongside the second request's. That leaves two live cameras, one with no owner. Use a `cancelled` local for each effect run. (F08)

- **Never put side effects inside a `setState` updater.** Updaters are double-invoked and must be pure. Calling `track.stop()` inside one runs it twice, against whichever snapshot each invocation sees. (F08)

- **Pass a remembered `deviceId` as a bare value, never as `{exact}`.** A bare value is an *ideal* constraint. If the device was unplugged, or its id changed when browser site permissions were reset, capture falls back to the system default instead of failing. (F08)

- **Device labels are empty until permission is granted.** Enumerate devices after acquisition, not on mount. Early enumeration fills the pickers with blank rows that never repopulate. (F08)

- **`<LiveKitRoom>` re-creates its `Room` whenever its `options` object changes identity.** Lobby device ids make this object dynamic, so memoise it. Otherwise the call reconnects on every render, which looks like a network fault rather than a code defect. (F09)

## Client state and hooks

- **Do not put a value the browser can read synchronously in an effect.** The original `useChatKey` followed `code-standards.md`: it read the hash in an effect and used `setState`. The `react-hooks/set-state-in-effect` rule correctly failed the build, since a link without a key would need a second render pass before paint.

  The fragment now comes through `useSyncExternalStore`, using the same pattern as `use-media-query` for the same reason. Only the genuinely async import changes state. The doc's incorrect canonical snippet has been corrected. (F17)

- **Count unread messages by index, and stamp the seen mark in handlers rather than an effect.** An index avoids a timestamp tie, where a message arriving in the same millisecond could be counted either way. Stamping on both open and close also keeps `setState` out of an effect body, which is an error here.

  This required `closePanel` alongside `togglePanel`: a sheet can dismiss itself, and without that handler the dismissal path would never mark messages as seen. (F19)

## Mobile and viewport

- **`env(safe-area-inset-*)` resolves to `0` unless `viewport-fit=cover` is set, and Next does not set it.** The `viewport` export in `app/layout.tsx` enables every safe-area rule in the project. Without it, the call's inset padding was valid CSS that could never take effect; this remained the case from F09 to F22.

  **The viewport setting and padding are one decision.** `cover` also puts content *under* cutouts, so `.call-surface` and `.sheet-surface` must compensate for all four insets. Setting the meta without the padding makes a notched phone worse than leaving it unset.

  An end-to-end session on a real notched iPhone at F25 reported correct rendering. That is weaker evidence than an inspection: no one saw anything wrong, but incorrect inset padding is not necessarily something a user would report. (F22, F25)

- **`interactiveWidget: 'resizes-content'` covers only Android's soft-keyboard fix. The iOS half remains unconfirmed.** It shrinks the layout viewport so the chat composer stays above the keyboard. iOS Safari ignores the field entirely; the expected remedy there is a `visualViewport` treatment.

  During F25, an owner using the app on a real iPhone reported no problem without that treatment. They were using the app rather than testing this behaviour, and Playwright has no soft keyboard, so no one has actually inspected it. Do not write `visualViewport` code speculatively or record the iOS half as solved. (F22, F25)

- **Leave `maximumScale` and `userScalable` unset.** Both disable pinch-zoom, which harms accessibility. The mobile target is real usability rather than an app-like shell. (F22)

- **`truncate` does nothing on an inline box.** `overflow: hidden` does not apply to inline boxes. A `truncate` span clips only when something gives it block behaviour, such as making it a flex item or using `display: block`.

  Call History's name list truncated below `sm:`, where the cell is flex, but silently failed above it, where the cell is `block`. The nowrap text became the grid column's min-content and widened `/history` by 181px. To keep truncation working, put the ellipsis on a block child and mark the part that must remain visible `shrink-0`. (F22)

## Error and loading surfaces

- **Do not put `loading.tsx` on a route that gates access or existence.** Next immediately flushes the loading shell, sending the HTTP status with it. A later `notFound()` can then only swap the UI, and `redirect()` becomes a client-side navigation.

  F24 measured both failures. Adding a loading file to `/room/[code]` changed a dead meeting link from **404 to 200**. Adding one to `/history` changed the signed-out **307 redirect to a 200**, showed the page's heading to someone without access, and left a visitor without JS on a skeleton forever. Both files were removed.

  A skeleton is safe only when the server work is pure data fetching. On a gating route, the gate would have to move above the streaming boundary, to the proxy for auth. That is a bigger change than a skeleton is worth. (F24)

- **Next includes the real error message, digest and stack in the development RSC payload, but not in production.** A test asserting that details do not leak must read *visible* text. `body.textContent()` also reads `<script>` contents, causing a development-only failure that does not exist in production. (F24)

- **Use `retry()`, not `reset()`, for recovery in this project's App Router `error.tsx`.** `retry()` fetches again and re-renders the boundary's children. `reset()` only clears the error state and re-renders what it already had, so it cannot recover a failed fetch. Next 16 documents `retry()` as the default, although older App Router habits suggest `reset()`. (F24)

- **Use a plain `<a>` in `global-error.tsx`, not `next/link`. Disable the lint rule on that line with a comment.** The failed root layout sits above the router. A soft navigation would render straight back into it, so a full document load is the only available recovery.

  This file must also import `globals.css` and load the typeface itself; Next applies neither automatically to it. (F24)

## Performance and bundles

- **Home's first-load JS is 279 kB gzipped, above the 200 kB target in `code-standards.md`.** This was measured by summing the gzipped chunks requested by Home from a production `next start`; Next 16 no longer prints a size table. The remaining weight is costly to reduce: React, react-dom and the scheduler account for ~112 kB, and `radix-ui` plus `zod` for ~63 kB.

  **Tidying a component cannot remove `zod` from Home.** `src/lib/env.ts` parses with it at import to deliberately fail at boot on misconfiguration. Removing the schema in `start-meeting.tsx` would therefore save nothing.

  Getting below 200 kB would require moving Google sign-in entirely off the browser client, rewriting the OAuth/PKCE and chat-key-stash path settled in F04 and F17. The measured result is recorded rather than the target lowered, as required by `code-standards.md` → Performance. (F22)

- **Keep the Supabase browser client dynamically imported inside `signInWithGoogle`.** A static import put the entire GoTrue client into Home's first-load bundle for every visitor, even though the page's primary action needs no account. At 64 kB gzipped, it was the largest chunk.

  The function is async and runs only after a click, so the dynamic import has no observable cost. `tests/e2e/sign-in.spec.ts` guards against silently reverting it. (F22)

- **Shipping `/tokens` markup in production does not affect Home.** It has its own route and chunk. The long-standing follow-up concerns a few kB on a dev-only page, outside Home's budget. (F22)

## Testing

### Connection and media coverage

- **`getByText('x')` matches case-insensitive *substrings*. This made the suite's connected-room check ineffective for its entire life.** `page.getByText('Connected')` also matches the status strip's `Disconnected`, so every wait for a connected room returned immediately. This affected 10 sites across 5 specs plus `joinAs`, whose `until: 'connected'` was described as "strictly stronger" than `mounted` but was actually weaker.

  That one defect caused two long-standing "flakes". In `reactions.spec.ts`, a hand was raised 2.7s before signalling was ready; livekit-client refused the write, and it was lost. In `connection.spec.ts`, `setOffline` ran before the room had connected, so there was nothing to disconnect and no banner could appear.

  **Wait for connection only through `connectedStatus()` in `support/join.ts`**, which passes `exact: true`. More generally, use `exact` whenever one state name is a substring of another. The UI may acquire more such pairs than `Disconnected`/`Connected`. (F26)

- **`server-only` throws when imported under Node, so modules importing it cannot be unit-tested.** Keep logic that warrants exhaustive tests in pure modules that do not import it, with an IO shell around them. Examples are the joinability decision, token TTL cap and error classification. (F09)

- **Media failure paths require a stubbed `getUserMedia`; a second Playwright project does not reach them.** This bullet previously said the opposite. F26 measured seven flag and permission combinations and disproved that advice:

  - `--use-fake-ui-for-media-stream` automatically grants access and **overrides Playwright's own context permissions**, so permission cannot be denied while it is enabled.
  - With it disabled, bundled headless Chromium refuses all capture with `NotSupportedError`. That classifies as `error`, not any of the required states.
  - Keeping it enabled while dropping `--use-fake-device-for-media-stream` still synthesizes a device, so the no-device state remains unreachable.
  - No real Chrome is installed as a fallback.

  `stubMediaFailure` therefore rejects with a real `DOMException` for each state. This proves the **wiring**: a rejection reaches the correct rendered copy. It never proves that the browser produces that rejection. (F07, F08, F26)

- **~~Audio capture hangs on this machine~~ is no longer true; mic paths can be tested.** This claim had justified keeping every microphone path manual. Under the suite's own flags, measured acquisition times are 173ms for audio, 249ms for video and 307ms for both. Do not use the old claim to skip mic coverage. (F08, F26)

- **A browser test cannot force a LiveKit *full restart*, so the suite cannot reach `republishAllTracks`.** `context.setOffline` fails with `SignalReconnectError`. The catch in `attemptReconnect` explicitly prevents that error from promoting the next attempt to a full reconnect, so the SDK retries *resume* indefinitely. At 10s, 20s, 30s and 45s offline, measurements found zero new peer connections each time.

  Three things set `fullReconnectOnNext`: a server-sent `LeaveRequest_Action.RECONNECT`, a server-disabled `resumeConnection`, or a peer connection left in `NEW` state by hardware sleep. None is reachable from Playwright. `room.simulateScenario('node-failure')` would work, but requires the `Room` instance and thus a test-only path through production code.

  **The mic-across-a-full-restart question is therefore settled by reading livekit-client, rather than by test.** This is the best available evidence, not a gap someone should attempt to close again. (F23, F24, F26)

### Selectors and regression checks

- **Next injects a `role="alert"` route announcer.** An unscoped `getByRole('alert')` therefore matches two elements. Scope to `main`. (F09)

- **Video tiles are list items too.** In a call, an unscoped `getByRole('listitem')` matches the grid as well as the intended list. Scope to the panel. (F18)

- **Trust a regression test only after seeing it fail.** At the Phase 4 checkpoint, the seen-mark fix was reverted to confirm the new test went red. Phase 5 verified its grid-layout assertion the same way, by breaking the class name. (checkpoint)

### Sessions, hydration and isolation

- **Sign-in can be tested without the identity provider.** F21 originally assumed signed-in pages could not be tested; the suite can now sign itself in. Playwright cannot drive Google's consent screen, and the password path would require an email provider we want closed.

  Instead, `auth.admin.generateLink` + `verifyOtp` creates a genuine session without sending mail. Writing that session into the browser in `@supabase/ssr`'s cookie shape signs the context in for real: `sb-<ref>-auth-token`, containing `base64-` + base64url JSON, chunked past 3180 chars. `getUser()` still revalidates, and RLS still sees the real `auth.uid()`.

  Playwright accepts `url` OR `domain`+`path`, never both. See `tests/e2e/support/session.ts`. (F21)

- **Retry hydration-dependent assertions instead of reading once.** For values that appear only after a client re-render, including anything using `useSyncExternalStore`, a single `textContent()` read passes or fails according to timing. Use `expect(locator).toHaveText()`, which polls. (F21)

- **Verify isolation from more than one user's perspective.** A policy returning nothing for everyone can pass a single-user check. Phase 5 ran the impersonation SQL as both participants *and* as a third user who belonged to neither meeting. (F21)

### Viewport, measurement and compiler checks

- **A 360px check alone is not a mobile audit.** All ten specs measuring that minimum passed, while `/history` overflowed by 181px at 768 and by 209px in phone landscape. The failures occurred between the extremes, after the layout switched to its wide form but before it had enough room. Measure the intermediate widths too. (F22)

- **Use soft assertions for a sweep, never for an ordinary spec.** A sweep must produce a *list* of findings. A hard assertion would stop thirty-plus measurements at the first finding. `expect.configure({ soft: true })` reports them all and still fails the test. This is safe only because nothing downstream reads a measurement. (F22)

- **A checklist test must prove it inspected something.** `expectHitAreas` checks both that it measured more than zero elements and that none is undersized. `chat.spec.ts` likewise checks that its recording is non-empty.

  **A rendered empty state can hide a missing check.** `DevicePicker` renders `No devices found`, so "some option has a label" passed with zero devices from F08 to F26. Its fallback hid the defect again: the numbered `Camera 1` label is exactly what the bug under test produces. Assert on something that exists only when the feature works, such as a real `deviceId`, rather than text alone. (F22, F26)

- **A `switch` without a `default` does not check exhaustiveness here.** With `noImplicitReturns` disabled, an unhandled enum member returns `undefined` without a compiler error. Use a `default` branch that assigns the narrowed value to `never`; it names any missing member at build time. F23 shipped a switch missing four members while `typecheck` passed. (F23)

- **A terminal LiveKit disconnect is reachable in about a minute.** Hold a Playwright context offline until the SDK exhausts its retry budget. This is slow for one test, but it is real and needs no test-only production path. The coverage is worth the minute. (F23)

- **Aborting a route makes Chrome navigate to its own error page.** Under parallel load, that navigation races any later `page.goto` and leaves `sessionStorage` on an opaque origin. Fulfilling a top-level navigation with `204` leaves the document in place, which is usually what an interception needs. (F22)

## Design system

### Shell, components and motion

- **Use a `(shell)` route group for the shell.** This structurally excludes `/room/[code]`, preventing a forgotten opt-out from adding a header and footer to the call. (F02)

- **Mirror ~70 tokens into `:root`; keep only `var()` references in `@theme inline`.** Before this, radii, the type scale, tracking and easings were unguarded literals. Keep the kit's 16-hue chromatic palette out until a feature earns a stop. (F02)

- **Add shadcn primitives per feature, never in advance.** Restyle each one to the kit when it arrives. Generating a set "to have them" leaves unreviewed components carrying the six things the kit forbids. (F02)

- **`src/components/ui/textarea.tsx` includes `input.tsx`'s corrections and two more of its own.** It drops `field-sizing-content`. That CSS property is the eventual answer to auto-growth, but Safari does not support it and real iOS is a mobile target, so the caller sizes the field from `scrollHeight`.

  It also adds `resize-none`: a drag handle conflicts with caller-controlled height and leaves the field stuck. Re-apply these changes after any regeneration. (F19)

- **`src/components/ui/button.tsx` is restyled; a plain `shadcn add button` reverts it.** The generated source includes six forbidden choices:

  - `dark:` variants;
  - `shadow-xs` on `outline`;
  - `rounded-md`, rather than the 0.4rem button radius;
  - `font-medium`, which synthesizes 500 because only 400 and 700 are loaded;
  - `ring-[3px]`, an arbitrary value;
  - 36px hit areas.

  The `xs` and `icon-xs` sizes were removed entirely: their 24px size cannot meet the 44px minimum. Re-apply all these changes after any regeneration. (F02)

- **Home may loop animations; the call may not.** Home does not encode video, so continuous CSS keyframes are acceptable there. It does not need `animejs`; the kit's own site components use `@keyframes` with staggered `animation-delay`.

  Every loop must still collapse under `prefers-reduced-motion`. The block in `globals.css` handles this by forcing `animation-iteration-count: 1`. (F02)

### Time, status and layout

- **Format timestamps for people in the browser. Do not use `suppressHydrationWarning` to fix them.** Server-side `Intl` uses the server's zone, UTC on Render, so its output is wrong for every reader outside that zone. The escape hatch suppresses the warning *by retaining the server's text*, leaving the bug in place.

  The client must actually re-render, using a hydration flag through `useSyncExternalStore`. The UTC+14 e2e caught both the original bug and the attempted suppressed-hydration fix. Any value known only to the reader's environment needs a real client re-render, not a silenced warning. See `history-time.tsx`. (F21; recent decision filed here during the 10 Oct 2026 camera follow-up)

- **Show connection quality through text, never colour, to preserve the red invariant.** `code-standards.md` once suggested `green-1`/`yellow-1`/`red-1` for quality, while `architecture.md` reserved `signal` for Leave and your own muted mic. Since `signal` *is* `red-1`, F23 brought the two rules into conflict. The invariant took priority, and the colour guidance was corrected.

  A degraded tile now says `· weak` or `· connection lost` in its label row. This needs no new visual vocabulary and is available to a screen reader without extra markup. Do not bring back coloured quality dots. (F23)

- **Use `max-w-5xl` for section containers and cap prose at `max-w-2xl`.** Match the header and footer to the sections so they align to one measure. The line-length rule applies to text, not card grids. (F02)

### Token order and wordmark

- **Keep `@import 'tailwindcss'` above `:root` in `globals.css`.** Five kit token families share Tailwind theme namespaces: `--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--ease-*`. Tailwind emits a self-reference such as `--radius-lg: var(--radius-lg)` for each family. They resolve only because `:root` comes later in the cascade. `_verify.mjs` checks this order so it cannot change silently. (F02)

- **Keep the wordmark's red square as a box in text flow. Never pin it to a glyph again.** Until `7.00.6`, squares dotted both i's. They had to align with JetBrains Mono's stem centre (0.245em, *not* the 0.3em advance centre) and tittle height. Those measurements came from the shipped face and were wrong for any other face. They also had to be re-derived from the `0.30em` in `preview/logo.html`, because that specimen used IoskeleyMono.

  Both letters also needed U+0131 DOTLESS I so an ordinary `i` would not show its own dot beneath the square. None of this is needed for a separator between words, which has nothing to align to.

  **The general rule still applies:** values tied to glyph metrics are specific to the shipped face. Prefer a treatment that needs no such values. (F02, `7.00.6`)

- **Give the wordmark `role="img"` and `aria-label="VideoCircle"`.** The separator is decoration, not punctuation, so nothing should announce a pause between "Video" and "Circle". Screen readers announce an empty inline box between two text nodes inconsistently. Three e2e specs check the Home heading's accessible name, making this a functional requirement.

  The original reason was stronger, but no longer applies: `inline-flex` turned each inner span into a flex item and inserted word boundaries, while U+0131 was announced as its own character. (F02, `7.00.6`)

## Tooling

- **Pin TypeScript to 6.x, not 7; this is required for the tooling to work.** `eslint-config-next` depends on `typescript-eslint`, whose runtime guard throws `typescript-eslint does not support TS 7.0` and aborts ESLint. The crash occurs in `eslint-config-next`'s own entry point, so the whole config fails, not just typed rules.

  The following alternatives were verified:
  - npm `overrides` suppresses the peer warning but not the runtime guard;
  - the official `@typescript/typescript6` side-by-side shim lets ESLint work, but makes `next build` unable to detect TypeScript;
  - npm will not nest a TS 6 copy under `typescript-eslint`, because `typescript` is a peer dependency.

  `next build` itself works with either version. Revisit the pin when [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) ships. It is blocked on ESLint gaining async parser support, so expect a long wait. (F01)

- **Pin ESLint to 9.x, not 10.** `eslint-plugin-react`, vendored inside `eslint-config-next`, calls the pre-10 rule context API. On ESLint 10 it fails with `contextOrFilename.getFilename is not a function`. This is independent of the TypeScript pin above. (F01)

- **Keep Playwright's web server on port 3100, not 3000.** With `reuseExistingServer`, anything holding the dev port is reused, such as a leftover `next start` or an editor's port-forwarding helper. The suite then tests something other than its own build. This happened once and failed five unrelated specs. Do not move the port back. (F02)

- **Keep public environment variables in `env.ts` and secrets in `env.server.ts`. Merging them breaks the browser build.** Next replaces non-public `process.env` reads with `undefined` in client code. A combined schema therefore throws as soon as any Client Component imports it, including `src/lib/supabase/client.ts`. The mechanism and variable table are in `code-standards.md` → Environment Variables. (F01)

- **`_verify.mjs` compares all three copies of the token mirror:** the kit, `library-docs.md`, and `globals.css`. Previously, the copy that actually ships was the one with no check. (F02)

- **`_verify.mjs` runs as part of `npm run lint`.** It was connected in feature 01 rather than 02 because it already passed then, so context-drift checks have run since the first commit. Changes that break the token mirror or context-doc shape fail `lint`, rather than waiting for review to catch them. (F01)

- **Keep `turbopack.root` pinned in `next.config.ts`.** Otherwise Turbopack searches parent directories for a lockfile and may select a directory above the repository, changing what it resolves. (F01)

- **Do not rely on `z.url()` alone to validate a URL.** It accepts `localhost:3000` as a URL with the scheme `localhost`. For any environment URL that must use a particular reachable scheme, include the `protocol` option. See `library-docs.md` → Zod 4. (F01)
