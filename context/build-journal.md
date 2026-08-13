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
