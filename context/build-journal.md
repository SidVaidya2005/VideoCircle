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


## Phase 2 — Lobby *(compacted 2026-08-13)*

- **The lobby's hardest problem was not media, it was promises that never settle.** `getUserMedia` can hang rather than reject, and the first fix for it was wrong: a flat timeout fires on someone who merely took a while to press Allow, turning the most ordinary path in the product into a rendered failure. The shipped design picks its shape from permission state — granted means no prompt is coming, so each device is requested separately and timed; undecided means one combined untimed request. This is the same failure the clipboard hit in F06, in a different API. (F07)
- **Three track leaks, each found by a test rather than by reading.** Per-run effect state hoisted into a shared ref, so React's double-mount made the first request adopt its track alongside the second's. A `track.stop()` placed inside a `setState` updater, which React double-invokes and which must be pure. And an acquisition abandoned mid-flight whose track arrived with nothing left to own it. All three now have named guards. (F07, F08)
- **Off releases the device rather than muting it**, which also keeps the SDK's muted-track trap unreachable — `setDeviceId` defers silently on a muted track, so a picker would appear to do nothing. The headline test asserts *zero* live tracks, because a mute would still read as one. (F08)
- **Scope was cut three times to the same rule: every control that ships does something when pressed.** Join was deferred out of F07 and F08 to F09, where the token that makes it work arrives; the speaker picker moved to where remote audio exists. A disabled primary action for two features reads as broken. (F07–F09)
- **Two API defaults would have been silently wrong.** `Room.getLocalDevices` requests permission unless passed `false`, which would have raised a second prompt from an enumeration. `<LiveKitRoom>` re-creates its `Room` when its options object changes identity, so carrying the lobby's device ids inline would have reconnected the call every render. Both found by reading signatures and docs, not by failing. (F08, F09)
- **`server-only` throws under Node, which shaped the module layout.** The joinability decision and the TTL cap are pure modules precisely so every branch is testable without a database or the LiveKit secrets; the route handler does the IO around them. (F09)
- **The context docs drifted in two places that would have caused real bugs**, both found while reading a section for the feature that needed it rather than at this checkpoint: `library-docs.md` had LiveKit secrets being read from the public env module, and still showed the merged `env.server.ts` that F06 undid. (F09)
- **One E2E flake remains open and unexplained.** It failed once under parallel load and has not reproduced in more than ten runs; the artifact was overwritten before it could be read. A real purity defect found in the same path was fixed and is a plausible but unproven cause. (F08)

## Phase 3 — The call *(compacted 2026-08-13)*

- **The prebuilt LiveKit layouts were rejected on evidence, and everything visible in a call is ours.** `GridLayout` lays out nothing without an unapproved stylesheet dependency, and `ParticipantTile` ships four pieces of chrome the design system contradicts. Grid, tile, filmstrip, control bar, panels and dialogs are all built on the unstyled primitives. `library-docs.md` showed the prebuilt path and was corrected. (F10)
- **The same memo defect appeared twice, and is now the phase's most transferable lesson.** LiveKit mutates publication objects in place, so a comparator reading `isMuted` compares the new value against itself — a camera turned off mid-call left a dead `<video>` on every other screen. F10 shipped it; F11's tests caught it; F13 reintroduced the shape by adding props the comparator did not compare. Hooks, not memo props, carry anything mutable. (F10, F11, F13)
- **Three build-plan bullets were wrong and were corrected in writing rather than worked around.** Raise-hand's transport (an unreliable data channel for durable state), its mark (red, colliding with the muted-mic dot on the same tile), and F13's focus order (which made the grid unreachable as a resting state if speech could focus). Each correction is recorded in `build-plan.md` beside the bullet it replaces. (F13, F15)
- **Two findings point at LiveKit rather than at this code, and both involve a room of one.** A screen share published into an empty room is unpublished again within about a second, roughly half the time — `dynacast` was measured off and made it worse, so the obvious suspect is ruled out and the mechanism is open. And attributes do not echo back to a lone participant. Both are recorded as follow-ups; the second was worked around. (F13, F15)
- **Diagnosis repeatedly cost more than implementation, and the harness was usually the variable.** A test clicking Share mid-handshake; a debug script whose own `getDisplayMedia` call disturbed the publish; `ended` readings that were really the SDK's clone-and-stop; a Python edit that silently no-op'd because Prettier had reflowed the line. Read the harness before blaming the product. (F12, F13, F15)
- **Every accessibility affordance in the call had to be built twice — once for pointers, once for everything else.** Pinning is a double-click *and* a per-tile menu; reactions are a popover *and* flat menu items below `sm:`; a count lives in an `aria-label` because it overrides the badge inside the button. (F13, F14, F15)
- **Four shadcn primitives arrived — tooltip, sheet, popover, dialog — each restyled identically**: no shadow, brand radii, `dark:` stripped, dead `tw-animate-css` classes replaced with the kit's own keyframes, 44px dismiss targets, and unused sub-components removed. The edits are documented in each file so a later `shadcn add` cannot silently revert them. (F11, F14, F15, F16)
- **The privacy claim stopped being structural.** The chat key never reaching a server was defended by invariants and review since F06; F16 records every request made while the invite dialog is open and copying and asserts none carries the fragment. (F16)
- **Phase gates at close:** `lint`, `typecheck`, `build` clean; 173 unit tests and 71 e2e specs pass. The suite grew from 36 e2e at the start of the phase to 71.



## Phase 4 — Encrypted chat *(compacted 2026-08-14)*

- **The privacy claim stopped being a structural argument and became a measurement.** It had been defended by invariants and review since F06, and by a request-level assertion at F16. That assertion could not carry chat: the data channel is SCTP over WebRTC and makes no HTTP request, so a request listener would have passed without ever having looked at a chat byte. `chat.spec.ts` patches `RTCDataChannel.prototype.send`, asserts no outgoing payload holds the plaintext or the key, and asserts the recording is non-empty — a leak check that never observed a send is the most dangerous green test available. (F18)
- **Two rules about untrusted input turned out to be the same rule.** A decrypted payload proves the sender held the link key, not that they sent something well formed — so `ChatPlaintextSchema` validates on the way in, exactly as `decodeReaction` does for reactions. The sender's `sentAt` is the same problem wearing a clock: validated, then deliberately unused, because ordering by a peer-supplied value lets one wrong clock reorder everyone's transcript. (F18)
- **`react-hooks/set-state-in-effect` shaped three separate designs this phase.** It rejected `useChatKey` as `code-standards.md` had drawn it, which moved the fragment read to `useSyncExternalStore`; it kept the unread seen-mark in handlers rather than an effect; and the doc's canonical snippet was corrected rather than the rule suppressed. A synchronous `setState` in an effect is an error here, not a warning. (F17, F19)
- **Every feature in this phase shipped its UI early so it could be verified at all.** F17's verify line needs the key-missing state visible, F18's needs something able to send. Each built the smallest surface that made its own claim checkable, and F19 added to those rather than replacing them. (F17, F18, F19)
- **Ownership follows the unmount boundary.** `CallPanel` unmounts its children when closed, which decided three things: the key is imported in `CallStage`, the transcript lives there too, and the relative-time interval lives in the panel precisely so it dies with it. (F17, F18, F19)
- **The checkpoint diff found a bug the feature's own tests missed.** Switching straight from chat to the participants panel closes chat without touching the chat control, so the seen mark was never stamped and everything already read came back as unread. Fixed, and the regression test was confirmed to fail without the fix before being trusted. (checkpoint)
- **Three defects traced to library and platform shapes rather than to logic**: `Uint8Array` now defaults to `ArrayBufferLike`, which neither `crypto.subtle` nor `publishData` accepts; `.call` on the four-times-overloaded `RTCDataChannel.send` resolves to the last overload; and `locator.type()` is deprecated. None was a reasoning error, and all three cost real time. (F18, F19)
- **Test bugs outnumbered product bugs.** A 39-character key that `invite.spec.ts` can carry through a URL but `importChatKey` rejects; `getByRole('listitem')` matching video tiles as well as chat entries; an assertion naming the guest where the message is attributed to the host. Read the harness before blaming the product — the same lesson Phase 3 recorded. (F17, F18)
- **Phase gates at close:** `lint`, `typecheck`, `build` clean; 189 unit tests and 87 e2e specs pass. The suite grew from 71 e2e at the start of the phase to 87.

## Phase 5 — Call history

### 2026-08-14 — F20 Participation recording

The signed LiveKit webhook endpoint and the participation writes behind it. First
server-side work since F09, and the first consumer of `WebhookReceiver`.

**Decisions**

- **Idempotency came from schema that already existed.** The obvious design is an
  event-id ledger keyed on `WebhookEvent.id`, but F03's partial unique index
  `meeting_participants_open_row_idx on (meeting_id, identity) where left_at is null`
  already asserts a participant has at most one *open* row — so a redelivered join
  collides on `23505` and is reported as `duplicate` rather than doubling the row,
  and a genuine rejoin after a clean leave does not collide because the earlier row
  is closed. No new table, no pruning job. The accepted hole is a join redelivered
  *after* its own row was closed, which finds nothing to collide with; it needs a
  retry to outlive an entire participation, and the sweep closes what it leaves.
- **Every timestamp is LiveKit's, and the tests are built so a `now()` handler fails
  rather than merely being wrong.** `joined_at` from `participant.joinedAt`,
  `left_at` and `ended_at` from the event's `createdAt`. `now()` is only ever wrong
  by delivery latency in the happy path — but a leave written on the third retry
  records minutes of call time that did not happen, and F21 renders that duration.
  A single clock source is also what keeps the `left_at >= joined_at` CHECK
  unreachable; mixing sources would turn that constraint into a permanent 500 loop.
  `ParticipantInfo` has `joinedAt` but no `disconnectedAt`, which is why a leave time
  can only come from the event envelope.
- **Verification is synthetic signed events; the dashboard waits for F25.** LiveKit
  cannot reach `localhost`, so the suite plays the sender: real protobuf-JSON, a real
  HS256 signature over a real digest, and no test-only path through the route. That
  bought a repeatable redelivery test, which a manual check could never be. It did
  not buy proof that LiveKit sends what we think — recorded as a follow-up blocking
  F25.

**Gotchas**

- **F20 made a latent Phase 0 bug reachable, and it was worse than it looked.** The
  sweep set `left_at = m.expires_at` on open rows, but `/api/token` only checks
  expiry when it *mints*, so a token issued a second before `expires_at` produces a
  join after it — and `meeting_participants_left_after_joined` rejects that. Both of
  the sweep's statements share one plpgsql call, so a single late joiner in a single
  meeting aborts the sweep for *every* meeting, silently, until someone reads the
  cron logs. Reproduced against the live schema first (`23514`, raised from the
  update), then fixed with `greatest(p.joined_at, m.expires_at)`, then re-run to see
  it pass — the regression-must-be-seen-to-fail rule, applied to SQL.
- **`target: ES2017` from the Next scaffold forbids BigInt literals.** The SDK reports
  event times as `bigint`, so `0n` would not compile. Moved to ES2020, which is safe
  here: `noEmit` is on, and every browser this product supports is far past it. The
  first `typecheck` after the change still failed — a stale `tsconfig.tsbuildinfo`,
  not the change.
- **Test bugs outnumbered product bugs again, and both were mine.** The
  tamper-detection test "tampered" by setting `room.name` to the value it already
  had, so the body was byte-identical and the signature verified — a green test
  proving nothing, the same shape as the vacuous-leak-check trap F18 recorded. And
  the `room_finished` fixture back-dated events to before the meeting was created,
  tripping `meetings_ended_after_creation`; the fix was to backdate the *meeting*,
  since a call being recorded is one that started a while ago.
- **The Supabase CLI is not logged in on this machine**, so `db push` cannot run.
  Applied via MCP `apply_migration` under the same name as the file, which matches
  what F03 evidently did — the remote migration versions already differ from the
  local filenames while the names agree.

**Verified:** 198 unit tests, 96 e2e (9 new), `lint`, `typecheck`, and `build` all
clean. The webhook spec covers an unsigned request and a body altered after signing
(both 401), a guest join carrying the event's own `joined_at`, a signed-in join
resolving through the `profiles` foreign key, a join delivered twice leaving one row,
a leave and its redelivery, `room_finished` closing a row whose leave never arrived —
the killed-tab case made deterministic — an unknown room code answering 200 with
nothing written, and an unhandled event type. Sweep clamp confirmed against the live
database, seen failing first. Advisors show only the pre-existing
`auth_leaked_password_protection`.

### 2026-08-14 — F21 Call history page

`/history`: one entry per meeting, newest first, with duration, room code,
co-participant names, a gated Rejoin, and an empty state. The first reader of what
F20 writes.

**Decisions**

- **One entry per meeting, not per participation row.** A rejoin — which a dropped
  connection produces routinely — writes a second row, and two entries sharing a
  code and a guest list read as a bug rather than as history. The span therefore
  runs from the user's first join to their last leave, deliberately including the
  gap rather than summing the sessions: the row already shows a start time, and a
  duration that disagrees with the wall clock beside it invites the question it
  cannot answer.
- **Three duration states, not one fallback chain.** `recorded` from a closed row,
  `in-progress` when the row is open and the meeting still joinable, `estimated`
  when the row is open but the meeting is over. The middle one is the reason: a
  single `left_at ?? ended_at ?? expires_at` renders a duration derived from a
  24-hour expiry for a call the reader is sitting in. `estimated` stays visibly
  distinct — a `~` and a screen-reader note — because it can overstate by hours.
- **Two queries rather than one nested embed.** Embedding `meeting_participants`
  twice through `meetings` works, but it puts the grouping inside a query shape no
  unit test can reach, and the grouping is where every decision above lives.
- **The session client, not `supabaseAdmin`.** The only page in the product where
  that is possible: the `read participation in meetings you joined` policy admits
  exactly these rows, so RLS enforces the scope a second time beneath the explicit
  `.eq()`. Everything else serves guests, who have no session at all.

**Gotchas**

- **A server-rendered timestamp is wrong for everyone outside the server's
  timezone, and the first fix made it worse.** `Intl` on the server formats in the
  server's zone — UTC on Render. Reaching for `suppressHydrationWarning` looked
  right and was exactly backwards: it suppresses the warning *by keeping the
  server's text*, so the page kept rendering the wrong zone with nothing to
  indicate it. The e2e caught both — first showing the machine's IST, then UTC —
  before a hydration flag through `useSyncExternalStore` made the client genuinely
  re-render. Seen failing twice before it passed.
- **The plan conceded coverage it did not have to.** It recorded that a signed-in
  page could not be tested, since Playwright cannot drive Google's consent screen
  and the password path would mean enabling a provider an open follow-up says to
  close. `auth.admin.generateLink` + `verifyOtp` mints a real session with no mail
  sent, and writing it into the browser in `@supabase/ssr`'s cookie shape
  (`sb-<ref>-auth-token`, `base64-` + base64url JSON, chunked past 3180 chars)
  signs the context in for real. Probing that took minutes and turned a manual
  deferral into eight browser tests, including the build plan's headline claim.
  Worth probing before conceding, next time.
- **`Cookie should have either url or path`** — Playwright takes `url` OR
  `domain` + `path`, never both.
- **An arbitrary-value grid template is a lint error here, and rightly.** The
  column widths moved into `globals.css` as `.history-row`, beside `.grid-backdrop`.
  Only the track widths live there: `display`, `align-items` and `gap` stay as
  Tailwind variants, so `hidden sm:grid` on the header strip resolves by Tailwind's
  own variant ordering rather than by this file's position in the cascade.
- **`project-overview.md` was the outlier on the signed-out redirect**, promising a
  sign-in prompt that no mechanism supports and that neither `architecture.md` nor
  the build plan asked for. Corrected rather than implemented.

**Verified:** 216 unit tests, 104 e2e (8 new), `lint`, `typecheck` and `build` all
clean. Isolation proved twice over: JWT impersonation in SQL, run as both users and
as a third who was in neither meeting — so a policy returning nothing for everyone
could not pass — and again in a browser, where a second account's page contains
neither the first's room code nor their display name. Alongside those: the empty
state, a rejoin collapsing to one entry at `00:20:00`, `00:12:07` from a 727-second
row, Rejoin present on an open meeting and absent on an ended one, `+8 more` at
360px with no overflow and every target at 44px, and the timezone check from a
UTC+14 browser.
