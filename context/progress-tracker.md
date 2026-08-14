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

**Phase:** Phase 5 — Call history
**Last completed:** Phase 4 checkpoint — gates green from a clean build, phase diff walked against every invariant with no violations. The diff found one real bug the feature's own tests missed: switching straight from chat to the participants panel closed chat without stamping the seen mark, so everything already read came back as unread. Fixed, and the regression test was confirmed to fail without the fix before being trusted. `architecture.md` reconciled, journal compacted 161→103 lines, Phase 4's binding decisions promoted into `constraints.md` under Encryption, The call, Design system and Testing
**Next:** 20 Participation recording — opens Phase 5, and the first server-side work since F09

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

- [ ] 20 Participation recording
- [ ] 21 Call history page
- [ ] Phase checkpoint — verify Phase 5 — Call history is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 6 — Mobile and resilience

- [ ] 22 Mobile pass
- [ ] 23 Connection quality and recovery
- [ ] 24 Error and edge states
- [ ] Phase checkpoint — verify Phase 6 — Mobile and resilience is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 7 — Ship

- [ ] 25 Render deployment
- [ ] 26 End-to-end test suite
- [ ] Phase checkpoint — verify Phase 7 — Ship is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

---

## Follow-ups

Open work carried forward. Cleared as the feature that needs each arrives.

- **~~`POST /api/meetings` 500s under parallel test load~~ — diagnosed at the Phase 3 checkpoint and closed.** It is `next dev` resetting connections when four Playwright workers hit it at once, surfacing as `read ECONNRESET` *before* any handler runs: across four fully logged suite runs the handler logged nothing, and twelve concurrent requests by hand never reproduced it. `createMeeting` now retries once on a thrown transport error only — a non-201 still fails immediately, so a genuine 500 stays as loud as it was. CI builds and runs a production server, where this has never appeared. (checkpoint)
- **Home's first-load JS is ~341 kB gzipped, against a 200 kB target** in `code-standards.md` → Targets. Pre-existing and not from F07 — `livekit-client` is confirmed absent from Home's chunks, whose only `livekit` match is the `NEXT_PUBLIC_LIVEKIT_URL` string. Measured by summing the gzipped chunks Home requests from a production `next start`, since Next 16 no longer prints the size table. **Belongs to F22.**
- **The denied, no-device, and in-use states have no automated coverage.** `--use-fake-ui-for-media-stream` auto-grants and the fake device is always present, so none of the three is reachable from the suite as configured. Reaching them needs a second Playwright project launched without the fake-UI flag. **F26 owns this**; until then they are verified by hand.
- **A device that hangs on a first visit still leaves the lobby waiting.** The timeout only runs once permission is known granted, because a pending prompt is a person thinking, not a fault. Reloading recovers, since permission is granted by then. Fixable by watching `PermissionStatus.onchange` and starting the timer when the state flips — worth doing only if it is seen in the wild. (F07)
- **One E2E flake is open.** "Turning the camera back on re-acquires exactly one track" failed once under parallel load and has not reproduced in ten runs since; its artifact was overwritten, so what it asserted is unknown. A real purity defect found in the same path (a track stop inside a `setState` updater) was fixed and is a plausible but unproven cause. Re-open if it recurs — capture `test-results/` before re-running. (F08)
- **The microphone paths have no automated coverage.** `getUserMedia({audio:true})` hangs on this machine, so the mic toggle, mic picker, and mic labels are manual checks. The camera equivalents cover the shared code, since both kinds run the same acquisition path. **F26 owns closing this**, alongside the denied-state gap above. (F08)
- **Add the Render URL to Supabase's Redirect URLs at F25.** The localhost callback is configured and the Google round trip works; the deployed origin needs the same entry, plus `NEXT_PUBLIC_SITE_URL` pointed at it. **Blocks F25.**
- **Check whether the email/password provider is enabled on the Supabase project, and disable it if so.** `architecture.md` says Google OAuth is *the only* sign-in method, but nothing in the code enforces that — an enabled email provider is a live account-creation surface reachable straight from the Auth API, outside every route handler here. The security advisor's one finding (`auth_leaked_password_protection`) is about password auth and is moot either way once email is off.
- **LiveKit credentials are live locally and proven end to end** — F09 mints tokens against them and joins real rooms. Render still needs all three set in its dashboard at F25. **Blocks F25.**
- **A room with one participant behaves differently from a room with two, in two unrelated places.** Screen sharing into an empty room is unreliable (below), and LiveKit does not echo a participant-attribute change back to the participant who set it while they are alone — found at F15, worked around by holding your own raised hand in local state. Two findings with the same shape is worth treating as a pattern the next time something works with an audience and not without one. (F13, F15)
- **Screen sharing into an empty room is unreliable, and the mechanism is unknown.** With nobody else in the call, LiveKit publishes the share and unpublishes it again within a second or so, roughly half the time; with even one other participant present it is reliable across many runs. **`dynacast` is not the cause** — it was tested off and the solo case got no better. Our UI is behaving correctly throughout: it holds no sharing state, so it simply follows the unpublish. Reproduce with a single-participant share; the e2e spec deliberately tests the two-participant case instead of encoding a known-bad one. **F24 owns this** with the other edge states. (F13)
- **A real desktop share has never been received on a real phone.** The suite stubs the picker and proves the publish path, the capability gate, and the remote tile — but the build plan's own verify line asks for a phone as receiver, and that stays manual. Worth doing at **F22**, alongside the mobile pass. (F12)
- **Pressing the share control during the connect handshake silently does nothing.** The bar renders as soon as the room tree mounts, which is before `Connected`, so a share requested in that window is published into a room that is not there and immediately unpublished. The window is one to three seconds and the person has just pressed Join, so it is unlikely to be reached — revisit at **F24** with the other edge states. (F12)
- **The wordmark's tittle sits ~3.5px off during the `next/font` swap window**, because the generated fallback matches advance and ascent but not glyph shapes. First paint only, on a cold load. Accepted at F02 rather than trading it for a flash of invisible text; revisit only if it looks wrong on the deployed instance.
- **With chat open and scrolled up, nothing signals a new message.** The badge counts only while the panel is closed, and the scroll pin deliberately holds the view still — so a message arriving while you read back is silent until you scroll down. A jump-to-latest control closes it; it was left out of F19 as scope. Worth doing at **F24** with the other edge states, or sooner if it is felt in a real call. (F19)
- **The composer's behaviour under a phone's on-screen keyboard is unverified.** The sheet is proven at 360px with hit areas and no overflow, but Playwright has no soft keyboard, so whether the composer stays clear of it on real iOS Safari and Android Chrome is untested. **F22 owns it** with the rest of the mobile pass. (F19)
- **`joinAs` is copy-pasted into eight e2e specs.** Every call spec declares its own four-line version because they drifted apart before there was a support module; they are now identical. Lifting one into `tests/e2e/support/` is a small, safe cleanup that touches every call spec at once, so it wants its own commit rather than a feature's. **F26 owns it** with the other suite work. (F17)
- **`/tokens` still ships its markup in the production bundle** even though it returns 404 there. A few kB of static swatches; revisit at F22 if the Home budget is tight.

## Key Decisions

- **Unread is counted by index, and the seen mark is stamped in handlers rather than an effect.** An index has no tie-break problem where a message sharing a millisecond with a timestamp could be counted either way — and stamping on both open and close keeps `setState` out of an effect body, which is an error here. It also meant `closePanel` had to exist beside `togglePanel`: the sheet dismisses itself, and that path would otherwise never mark anything seen. (F19)
- **The end-to-end encryption claim is measured at the data channel, because no HTTP request ever carries it.** `page.on('request')` cannot see SCTP over WebRTC, so a request-level assertion would have passed without ever looking at the bytes — the most dangerous kind of green test. `chat.spec.ts` patches `RTCDataChannel.prototype.send`, asserts no outgoing payload contains the plaintext or the key, and asserts the recording is non-empty so it cannot pass vacuously. (F18)
- **A peer's clock is not evidence.** The envelope carries `sentAt` and the schema validates it, but the transcript is ordered and timestamped by local arrival: sorting by a sender-supplied value lets one misconfigured client reorder everyone's transcript and a hostile one pin itself to the top. Decryptions are chained through a tail promise for the same reason — async resolution order is not arrival order. (F18)
- **A value the browser can read synchronously does not belong in an effect.** `useChatKey` was written the way `code-standards.md` drew it — read the hash in an effect, `setState` — and `react-hooks/set-state-in-effect` failed the build over it, correctly: a link with no key would have cost a second render pass before paint. The fragment now comes through `useSyncExternalStore`, the same shape `use-media-query` uses for the same reason, and only the genuinely async import touches state. The doc's canonical snippet was wrong and has been corrected. (F17)
- **The privacy claim is now tested, not only structured.** The chat key never leaving the browser was defended by invariants and code review; `tests/e2e/invite.spec.ts` records every request made while the invite dialog is open and copying, and asserts none carries the fragment. Showing the key in a dialog is exactly the change that could have broken it. (F16)
- **Ephemeral and durable state get different transports, and the build plan had them the same.** A reaction rides the unreliable data channel because losing one costs nothing; a raised hand rides a participant attribute because losing one is a real failure — an unreliable packet can drop, and a data-channel message reaches nobody who joins afterwards. The cost is one extra token claim, `canUpdateOwnMetadata`, pinned by the grant spec. (F15)
- **One responsive decision in the call is made in JavaScript, and only one.** Everything else is a Tailwind variant so nothing measures the viewport in the call tree — but a Radix dialog traps focus, locks scroll and hides the page from assistive tech the moment it opens, and its content is portaled out of reach of any wrapper class. Choosing sheet-versus-inline in CSS would leave an invisible dialog holding focus on every desktop, so `use-media-query` exists for that case alone. (F14)
- **Speech never moves the layout.** `resolveFocusKey` takes no speaker argument at all, so it cannot: a layout that follows whoever is talking flips several times a minute in an ordinary conversation. Active speakers order the filmstrip and ring their own tile, which is what the build plan's "active-speaker detection" is actually for. (F13)
- **We hold no mirrored sharing state, and that is what makes the hard case free.** `useLocalParticipant` re-emits on `LocalTrackUnpublished`, so a share ended from Chrome's own stop bar syncs the control and banner with no listener of ours. The build plan's "no stale UI state" requirement is met by having no state that could go stale. (F12)
- **A memo comparator must read only immutable facts.** `ParticipantTile` compared `publication.isMuted`, which LiveKit mutates in place — both sides of the comparison resolved to the same live value, so a camera turned off mid-call left a dead `<video>` on every other screen. Mute state now comes from `useIsMuted`, whose own state re-renders the tile regardless of what the memo decides. (F11)
