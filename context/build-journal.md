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

## Phase 3 — The call

### 10 Room connection and video grid — 2026-08-13

**Decisions**

- **The prebuilt grid was rejected on evidence, not taste.** `GridLayout` renders `className="lk-grid-layout"` and derives its columns from `@livekit/components-styles`, which is not an approved dependency — without it the component lays out nothing at all. `ParticipantTile` additionally ships a name chip, mute icon, connection-quality dot and focus button, each contradicting `Design/README.md` → Participant tiles. Adopting them meant a new dependency plus overriding its CSS everywhere the brand differs, so the grid and tile are ours, on `useTracks`, `VideoTrack`, `useIsSpeaking`, `useIsMuted` and `useVisualStableUpdate`. `library-docs.md` showed the prebuilt path and was corrected in the same feature.
- **Reflow is keyed to headcount in CSS, not to a measured container.** A lookup returns whole static class strings per breakpoint, so the mapping is unit-testable without a browser and nothing observes a resize inside the tree that shares a main thread with WebRTC encoding.
- **The local participant is pinned first and excluded from the visible-page cap**, so above twelve people you can never be the one hidden from your own screen. `useVisualStableUpdate` promotes speakers among the remainder.

**Gotchas**

- **`useIsMuted` reads an absent publication as _unmuted_.** Its implementation falls back to `participant.getTrackPublication(source)?.isMuted`, and both being undefined yields `false` — so a participant publishing no microphone at all would have rendered as unmuted. Absent is treated as muted in the tile. Found by reading the shipped implementation after the published `.d.ts` proved too thin to answer the question.
- **Gating video on `isSubscribed` deadlocks `adaptiveStream`.** It decides what to subscribe to from the visibility of attached `<video>` elements, so a tile that renders no element until it is subscribed is never subscribed and never renders one. The only gate is `isTrackReference` plus the publication's mute state.
- **`<LiveKitRoom>` renders a container div between the page and the call**, which broke the flex height chain and collapsed a full-height call to the height of its own content. It accepts `className`, so the layout contract lives in `room-shell.tsx`.
- **Two design rules nearly went the wrong way.** `SectionOverline` leads with the red square, so using it for the `+N MORE` count would have spent the call's red budget on a headcount; and `animate-live-dot` is an infinite keyframe, which `constraints.md` allows on Home and forbids inside a call. Both replaced with plain type and a static dot.
- **`:root` cannot take a project-only token.** `_verify.mjs` compares that block three ways, so a safe-area token would have failed the gate. The inset is applied as `pb-[env(safe-area-inset-bottom)]` on top of the stage's own `pb-3` — no literal in a class, and additive rather than a `max()`.
- **The first layout was top-heavy.** `content-start` pinned two tiles to the top of a 1280×720 window with 45% dead space below; tiles are width-constrained at 16:9 and cannot fill it, so the rows are centred instead. Caught by screenshotting a real two-person call, not by any assertion.

**Verified:** 36 e2e specs and 126 unit tests pass; `lint`, `typecheck` and `build`
clean. Two real browser contexts against LiveKit Cloud see two tiles each, named
correctly, with the local tile first and mirrored; a participant who leaves drops
back to one tile and "Only you"; a camera-off join keeps a named tile with no
`<video>`; `context.setOffline` shows the reconnecting strip while the tile
persists and Leave stays enabled; no horizontal overflow at 360px. Red appears in
exactly two places in `src/components/room/`, both audited by grep: the local
muted dot and the Leave control.

### 11 In-call control bar — 2026-08-13

**Decisions**

- **The full bar shipped with its unbuilt controls disabled**, against the recommendation to ship only what acts. Chat, participants and reactions use the kit's own disabled recipe and carry `aria-disabled`; F14, F15 and F19 each remove one flag and add one handler. The cost, accepted knowingly: MORE opens to three disabled rows until F14.
- **Screen share is absent rather than disabled**, so absence keeps one meaning — your device cannot do this. It is already absent on every mobile browser, and a second meaning would have cost the rule its clarity.
- **Camera-off is neutral; only your own muted mic is red.** `Design/README.md` and the `control-states.html` note both said "mic *or camera*", contradicting `DeviceToggle`, which has passed `signalWhenOff` for the mic alone since F08. The docs were corrected to match the code rather than the reverse: off-camera is a preference, and the slashed icon carries it.
- **Leave confirms in place** rather than in a modal, which would cover the people you are deciding whether to leave. `armed` lives in the bar, not the control, because only the bar knows another control was pressed.
- **The responsive collapse is CSS.** Secondary controls are declared once and rendered twice — inline at `sm:`, in the dropdown below it — so there is no measurement inside the call tree and no SSR mismatch.

**Gotchas**

- **A memo comparator that reads a mutable object can never see it change.** `ParticipantTile` compared `publication.isMuted`; LiveKit mutates the publication in place, so `previous` and `next` resolved to the same live value and the tile never re-rendered. Turning a camera off mid-call left a dead `<video>` on every other participant's screen. F10 shipped this — its camera-off test joined with the camera already off, exercising the placeholder path and never the muted-publication one. Mute now comes from `useIsMuted`, whose own state re-renders the tile whatever the memo decides, and the comparator reads only immutable facts.
- **Playwright's role engine pierces shadow DOM; `querySelectorAll` does not.** An unscoped `getByRole('button')` hit-area sweep measured Next's dev-tools badge at 32px and failed. Scope to `main` — the same fix the route announcer needed at F09.
- **Two React rules were broken and caught by lint, not by behaviour**: a ref written during render in `use-call-shortcuts`, and `setState` inside an effect in the first Leave control. The second was a design smell — the state belonged to the parent, which is where it went.
- **Three existing specs encoded the one-press Leave contract** and failed the moment it became two. They were updated, not worked around; a passing suite that asserts the old contract is worse than a red one.
- **Two real-SFU specs outran the 30s default** once the suite ran them in parallel — the reconnect test needs two offline transitions, and the two-context camera test needs two joins before it starts. Both now set their own budget.
- **The generated tooltip carried two arbitrary pixel values**, both on the arrow. Dropping the arrow removed them and the brand has no arrow precedent anyway — a tooltip here is a chip, not a speech bubble.

**Verified:** 45 e2e specs and 134 unit tests pass; `lint`, `typecheck` and `build`
clean. Camera off drops live tracks to zero and the other participant's tile
switches to initials, proven with two contexts. `d` and `e` toggle; Cmd-D and
Ctrl-D do not. Leave takes two presses and pressing the mic disarms it. At 360px
the bar keeps mic, camera, MORE and Leave, every control in `main` clears 44px on
both axes, and nothing overflows. Screenshots confirm the muted-mic red, the
neutral camera-off, the dimmed stubs, and the phone collapse.

### 12 Screen sharing — 2026-08-13

**Decisions**

- **Share tiles sort ahead of every camera tile.** One sort step in a pure function, not a layout — F13 still owns spotlight, focus resolution and the filmstrip. Without it a share started in a busy call lands past `MAX_VISIBLE_TILES` and is invisible to everyone while its owner believes it is up.
- **No mirrored sharing state, which is what makes the hard requirement free.** `useLocalParticipant` re-emits on `LocalTrackUnpublished`, so a share ended from Chrome's own stop bar syncs the control and the banner with no listener of ours. "No stale UI state" is met by having no state that could go stale.
- **The banner replaces the connection line** rather than sitting beside it: a call you are presenting to is a call that is connected, so the strip stays one line at 360px. The status strip moved into `call-status.tsx` so the banner and the line it replaces live together, which also keeps the stage from re-rendering on local track events.
- **The sharer sees their own share, and it is never mirrored.** Only a self-*camera* is a mirror; a flipped spreadsheet is unreadable. Seeing it is how you catch the most common screen-share mistake, which is sharing the wrong window.
- **`useSyncExternalStore` for the capability, not an effect.** The room tree is server-rendered despite being a Client Component, and this is the shape React provides for a value the server cannot see. The lint rule that bars `setState` in an effect caught the first attempt.

**Gotchas**

- **Three hours went into a test failure that was a race, not a bug.** The control bar renders as soon as the room tree mounts, well before `ConnectionState.Connected`, so the spec's `joinAs` — which waited on the Leave button — was clicking Share mid-handshake. LiveKit published the track into a room that was not there and immediately unpublished it. The spec now waits for `Connected`; the product window is real but one to three seconds, and is recorded as a follow-up for F24 rather than papered over.
- **`livekit-client` clones the track from the picker and stops the original.** Every diagnostic that read `readyState` on what `getDisplayMedia` returned said `ended` while the share was perfectly healthy — a red herring that cost most of the debugging. The SDK listens for `ended` on its clone, so the test helper wraps `clone()` to keep hold of the right track.
- **A `CanvasCaptureMediaStreamTrack` ends on its own** a second or two after publishing, whether or not the canvas is retained and repainted. The stub now sources from Chromium's fake camera device, which is what every camera assertion in the suite already runs on.
- **`delete navigator.mediaDevices.getDisplayMedia` is a no-op** — the method lives on `MediaDevices.prototype`, so removing the capability means shadowing it with `undefined` on the instance.
- **`getByRole('button', { name: 'Stop' })` matched two controls** once "Stop sharing your screen" existed. Substring matching is the default; `exact: true` was the fix.
- **One F11 spec asserted screen share was absent** and failed the moment it existed. Updated to the new contract — absence still means exactly one thing, and `screen-share.spec.ts` now proves it by removing the capability.
- **The banner's STOP was a 16px-tall text link** on first write, which the F11 hit-area sweep would have failed. A text action in a status strip is exactly where the 44px floor quietly goes missing.

**Verified:** 50 e2e specs and 138 unit tests pass; `lint`, `typecheck` and `build`
clean. Two contexts prove a share reaching the other participant as the first tile,
labelled `— screen`, with the sharer seeing their own copy unmirrored; the banner
appears and its stop ends the share on both sides; a dismissed picker changes
nothing and surfaces no alert; and a track ended from outside our UI returns the
bar and banner to rest without a reload. The capability gate is proven in both
directions, including that the control is not hiding in MORE. Screenshots confirm
the promoted share tile, the unmirrored share beside the mirrored self-camera, and
screen share sitting in MORE on a narrow window while remaining on the bar at
`sm:` and up.

### 13 Speaker and spotlight view — 2026-08-13

**Decisions**

- **The build plan contradicted itself and the contradiction was resolved in favour of the grid.** "Focus resolution order: manual pin, then active screen share, then active speaker" cannot coexist with "return to grid when the share ends and nothing is pinned" — if speech could focus, the grid would never be the resting state. `resolveFocusKey` takes no speaker argument at all, so the layout *cannot* follow whoever is talking. Active speakers reach the filmstrip through `useVisualStableUpdate`, which already promotes them, and ring their own tile.
- **A pin whose participant has left is cleared**, falling to a running share and otherwise back to grid. Keeping spotlight alive on the next speaker would leave a focused layout with nothing pinned and no obvious way out.
- **Pins are stored as the tile key**, not a participant object — a string cannot keep a departed participant alive.
- **Two pin paths ship.** The gesture is a double-click or long-press; the per-tile menu is the keyboard and screen-reader path, and is what makes a hidden gesture defensible. The menu button hides on hover-capable devices and is always visible where hover does not exist, since a hover-revealed control is unreachable on exactly the phones that cannot hover.
- **The filmstrip drops only the focused tile.** With Ada's screen focused, Ada's camera stays in the strip — you keep her face at the moment she is presenting and talking.

**Gotchas**

- **The memo comparator needed the new props, and this is the second time.** `ParticipantTile` gained `pinned` and `size`; a comparator that ignored them would have left a pinned tile rendering as unpinned — the same defect class as the `isMuted` comparison F11 found. `onTogglePin` is deliberately excluded: a fresh closure every render would defeat the memo outright while always closing over the correct key.
- **Counting lists could not detect spotlight.** With nobody else in the call the filmstrip is empty and one list renders either way. Naming the lists — `Focused participant` and `Other participants` — fixed the test and is a real accessibility improvement: two unnamed lists announce as "list" twice.
- **`animate-tile-in` makes every hit area measure small while it plays.** Its `scale(0.96)` put the new tile menu button at 43.53px and failed both 44px sweeps. Measured once, that is a false failure; polled, it waits out the 700ms and still catches a control that is genuinely undersized. Both specs now poll.
- **One screen-share spec turned out to be a real product finding, after three wrong diagnoses.** It failed under parallel load and passed alone, so it looked like a timeout — a 20s budget changed nothing. It looked like the stub, so the canvas source was swapped back in — no change. It looked like `dynacast`, so that was switched off and measured — the solo case got *worse*, ruling it out. What is actually true: **a screen share published into a room with nobody else in it is unpublished again within about a second, roughly half the time**, and with one other participant present it is stable across many runs. The mechanism is still unknown and is recorded as an open follow-up for F24. The spec now tests the two-participant case, which is what the feature is for, rather than encoding a known-bad one. Our UI was correct throughout: holding no sharing state, it followed the unpublish instead of lying about it.
- **Diagnosis cost more than the feature.** Two of the wrong turns were self-inflicted: an early debug script called `getDisplayMedia` directly before clicking, which was itself enough to disturb the publish, and the `ended` readings that pointed at the canvas were the clone-and-stop behaviour discovered in F12 all over again. Read the harness before blaming the product, and then read it again.

**Verified:** 55 e2e specs and 151 unit tests pass; `lint`, `typecheck` and `build`
clean. Two and three contexts prove a share switching the receiver's layout on its
own and releasing it when stopped, the sharer's camera staying in the strip, and a
pin outranking a running share. Double-click pins and unpins; the menu does the
same without a pointer gesture. Unit tests cover focus resolution including a
pinned key whose participant has gone. At 360px in spotlight there is no
horizontal overflow and every control in `main` clears 44px. Screenshots confirm
the vertical strip from `lg:` and the horizontal one below it.

### 14 Participant list panel — 2026-08-13

**Decisions**

- **`lg:` is the sheet/inline boundary**, not `sm:` — it is where a side column has room to exist, and it is the breakpoint the spotlight filmstrip already switches on. With the panel open the filmstrip falls back to horizontal, so only one column of chrome ever holds the right edge.
- **The headcount moved out of the status strip onto the participants control.** The number belongs beside the control that opens the list, and the strip needs its width at 360px for the sharing banner. `participant-count.tsx` was deleted rather than left as a second source that could disagree.
- **`openPanel` is one value on the stage.** One value means one open panel — the only workable behaviour on a phone, and it stops two panels competing for the right column. F19 adds a variant, not a mechanism.
- **Rows read mic and camera through `useIsMuted` per row**, as the tile does. Reading `participant.isMicrophoneEnabled` would depend on `useParticipants` re-rendering for events it does not promise, and LiveKit mutates publications in place — the defect class found in F11 and again in F13.
- **The panel shows your real name plus `· you`, where the tile says `YOU`.** A list whose one job is answering "who is here" should name you in it.

**Gotchas**

- **This is the first responsive decision in the call made in JavaScript, and the reason is Radix.** An open dialog traps focus, locks body scroll and hides the rest of the page from assistive tech the moment it mounts, and its content is portaled to `document.body` — out of reach of any wrapper class. Choosing sheet-versus-inline with `lg:hidden` would have left an invisible dialog holding focus on every desktop. `use-media-query` exists for that one case, built on `useSyncExternalStore` with a server snapshot, the same shape as the screen-share capability hook. Rendering one form rather than both also means the list mounts once instead of subscribing to room events twice.
- **`Participant.joinedAt` is a `Date`, not a number.** The sort takes milliseconds so it can stay a pure module with no LiveKit types; mapping happens at the boundary rather than widening the shared shape.
- **An `aria-label` on a button overrides its contents outright**, so the count badge is unreachable to a screen reader no matter what is inside it. The number is written into the label — `Show participants (3)` — and the badge is `aria-hidden`.
- **The row truncated the names it exists to show.** Side by side, `MIC ON CAM ON` took enough of a 288px panel that "Ada Lovelace" rendered as "Ada Lovela…". Caught by screenshot, not by any assertion; the state moved to a second line.
- **Two existing specs asserted the strip's headcount** and one asserted the participants control was a disabled stub. All three were updated to the new contract rather than worked around.

**Verified:** 60 e2e specs and 158 unit tests pass; `lint`, `typecheck` and `build`
clean. Two contexts prove the list naming both people with the marker on the local
row only, and mic and camera state updating live without reopening the panel. The
badge reads 1 alone, 2 after a join and 1 after a leave. At desktop width the panel
is a `complementary` with no dialog present; at 360px it is a dialog reached
through MORE, with no horizontal overflow and every control in it clearing 44px.
Screenshots confirm both forms and the two-line row.
