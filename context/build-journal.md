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


## Phase 4 — Encrypted chat

### 17 Chat key handling — 2026-08-14

- **The canonical snippet in `code-standards.md` was written before the rule that now forbids it.** `useChatKey` was implemented exactly as drawn — read the hash in an effect, `setState` — and `react-hooks/set-state-in-effect` failed `npm run lint` as an error. The rule is right: for the commonest case, a link carrying no key, that is a second render pass before paint. The fragment now comes through `useSyncExternalStore` with a `() => null` server snapshot, which is the shape `use-media-query` already uses for a value the server cannot see, and only the genuinely async import goes through state. The doc was corrected rather than the rule suppressed.
- **The panel shell shipped here rather than at F19, so the feature could be verified at all.** F17's own verify line asks for the key-missing state to be visible; nothing in the UI could reach it while the chat control was still a disabled stub. The composer stayed at F19 rather than being built twice — it will gate on the same `status !== 'ready'`.
- **The chat control is never disabled, and that is a copy decision as much as a UI one.** A disabled control says "chat is broken"; the truth is "the link you were sent is missing a piece", and only the panel has room to say which. Its wording is the other half of the invite dialog's no-key note — one warns the sender, one explains to the receiver.
- **`PENDING_CONTROLS` is gone and `SecondaryControl.onClick` is now required.** Chat was the last stub, so the disabled path through the bar and the MORE menu disappeared with it. `control-bar.spec.ts`'s "controls whose panels do not exist yet" test was rewritten to assert the opposite — that no control in the call is disabled.
- **`restoreChatKeyFragment()` got its first caller, four features after it shipped.** It lives on `RoomExperience`'s mount, and the ordering is safe by construction rather than by care: the restore runs when the lobby mounts, while `useChatKey` runs when `CallStage` mounts, behind a click on Join. React runs child effects before parent ones, so a restore placed any deeper would have raced the read it exists to precede. Note it still has no *producer* on this route — `signInWithGoogle` is only reachable from the shell header, which `/room/[code]` sits outside.
- **The test fixture was the only real bug, and it was mine.** The 39-character key borrowed from `invite.spec.ts` is ~29 bytes, which AES-GCM rejects; that spec only ever carries the string through a URL, while this one imports it. Three tests failed identically, all on the valid-key path. A genuine 32-byte, 43-character key fixed them — and the wrong-length case became the malformed-key test.
- **A `#k=` that is well-formed but unusable is one state with the missing case, not two.** Someone holding a truncated link cannot act on the difference.

**Verified:** `npm run typecheck` clean; `npm run lint` clean (3 pre-existing
`call-preview.tsx` inline-style warnings, no errors) with all 8 `_verify.mjs` checks
passing; `npm run test` 173 passing; `npm run test:e2e` 77 passing, up from 71. Six
new specs in `tests/e2e/chat-key.spec.ts` cover the ready, missing and malformed
states, one-panel-at-a-time, the MORE path with no overflow at 360px, and that no
request made while the chat panel is open carries any part of the fragment. One
`call-grid.spec.ts` failure on the first full run was the known parallel-load
`/api/meetings` flake: it passed alone, and `[api/meetings]` logged nothing across a
second clean full run, matching the Phase 3 diagnosis that it fails before the
handler.
