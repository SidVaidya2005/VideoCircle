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

**Phase:** Phase 3 — The call
**Last completed:** 12 Screen sharing — capability-gated control, share tiles promoted ahead of every camera so the cap cannot hide them, the sharer's own share visible and never mirrored, and the banner replacing the connection line in the status strip. 50 e2e and 138 unit tests pass
**Next:** 13 Speaker and spotlight view — turns F12's promoted share tile into a real focused layout with a filmstrip

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
- [ ] 13 Speaker and spotlight view
- [ ] 14 Participant list panel
- [ ] 15 Reactions and raise hand
- [ ] 16 Copy invite link in call
- [ ] Phase checkpoint — verify Phase 3 — The call is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 4 — Encrypted chat

- [ ] 17 Chat key handling
- [ ] 18 Message encryption
- [ ] 19 Chat panel
- [ ] Phase checkpoint — verify Phase 4 — Encrypted chat is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

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

- **Home's first-load JS is ~341 kB gzipped, against a 200 kB target** in `code-standards.md` → Targets. Pre-existing and not from F07 — `livekit-client` is confirmed absent from Home's chunks, whose only `livekit` match is the `NEXT_PUBLIC_LIVEKIT_URL` string. Measured by summing the gzipped chunks Home requests from a production `next start`, since Next 16 no longer prints the size table. **Belongs to F22.**
- **The denied, no-device, and in-use states have no automated coverage.** `--use-fake-ui-for-media-stream` auto-grants and the fake device is always present, so none of the three is reachable from the suite as configured. Reaching them needs a second Playwright project launched without the fake-UI flag. **F26 owns this**; until then they are verified by hand.
- **A device that hangs on a first visit still leaves the lobby waiting.** The timeout only runs once permission is known granted, because a pending prompt is a person thinking, not a fault. Reloading recovers, since permission is granted by then. Fixable by watching `PermissionStatus.onchange` and starting the timer when the state flips — worth doing only if it is seen in the wild. (F07)
- **One E2E flake is open.** "Turning the camera back on re-acquires exactly one track" failed once under parallel load and has not reproduced in ten runs since; its artifact was overwritten, so what it asserted is unknown. A real purity defect found in the same path (a track stop inside a `setState` updater) was fixed and is a plausible but unproven cause. Re-open if it recurs — capture `test-results/` before re-running. (F08)
- **The microphone paths have no automated coverage.** `getUserMedia({audio:true})` hangs on this machine, so the mic toggle, mic picker, and mic labels are manual checks. The camera equivalents cover the shared code, since both kinds run the same acquisition path. **F26 owns closing this**, alongside the denied-state gap above. (F08)
- **Add the Render URL to Supabase's Redirect URLs at F25.** The localhost callback is configured and the Google round trip works; the deployed origin needs the same entry, plus `NEXT_PUBLIC_SITE_URL` pointed at it. **Blocks F25.**
- **Check whether the email/password provider is enabled on the Supabase project, and disable it if so.** `architecture.md` says Google OAuth is *the only* sign-in method, but nothing in the code enforces that — an enabled email provider is a live account-creation surface reachable straight from the Auth API, outside every route handler here. The security advisor's one finding (`auth_leaked_password_protection`) is about password auth and is moot either way once email is off.
- **LiveKit credentials are live locally and proven end to end** — F09 mints tokens against them and joins real rooms. Render still needs all three set in its dashboard at F25. **Blocks F25.**
- **A real desktop share has never been received on a real phone.** The suite stubs the picker and proves the publish path, the capability gate, and the remote tile — but the build plan's own verify line asks for a phone as receiver, and that stays manual. Worth doing at **F22**, alongside the mobile pass. (F12)
- **Pressing the share control during the connect handshake silently does nothing.** The bar renders as soon as the room tree mounts, which is before `Connected`, so a share requested in that window is published into a room that is not there and immediately unpublished. The window is one to three seconds and the person has just pressed Join, so it is unlikely to be reached — revisit at **F24** with the other edge states. (F12)
- **The speaking ring has never been seen firing.** `useIsSpeaking` drives it and the styling is audited in source — `ring-active`, white, never a colour — but Chromium's fake audio device does not produce speech that trips LiveKit's active-speaker detection, so no test and no screenshot has shown the ring on. It needs two real microphones to confirm, alongside the other manual mic checks **F26 owns**. (F10)
- **The wordmark's tittle sits ~3.5px off during the `next/font` swap window**, because the generated fallback matches advance and ascent but not glyph shapes. First paint only, on a cold load. Accepted at F02 rather than trading it for a flash of invisible text; revisit only if it looks wrong on the deployed instance.
- **`/tokens` still ships its markup in the production bundle** even though it returns 404 there. A few kB of static swatches; revisit at F22 if the Home budget is tight.

## Key Decisions

- **We hold no mirrored sharing state, and that is what makes the hard case free.** `useLocalParticipant` re-emits on `LocalTrackUnpublished`, so a share ended from Chrome's own stop bar syncs the control and banner with no listener of ours. The build plan's "no stale UI state" requirement is met by having no state that could go stale. (F12)
- **A memo comparator must read only immutable facts.** `ParticipantTile` compared `publication.isMuted`, which LiveKit mutates in place — both sides of the comparison resolved to the same live value, so a camera turned off mid-call left a dead `<video>` on every other screen. Mute state now comes from `useIsMuted`, whose own state re-renders the tile regardless of what the memo decides. (F11)
- **The prebuilt LiveKit grid was rejected, not overlooked.** `GridLayout` lays out nothing without `@livekit/components-styles`, an unapproved dependency, and `ParticipantTile` ships four pieces of chrome the design system contradicts. Ours is built on the unstyled primitives — `useTracks`, `VideoTrack`, `useIsSpeaking`, `useIsMuted`, `useVisualStableUpdate`. (F10)
- **Pure decision modules exist because `server-only` throws under Node.** Joinability and the token TTL cap are free of it so every branch is testable without a database or the LiveKit secrets; the route handler does the IO around them. (F09)
- **A valid-looking room code is never authorization.** `/api/token` re-reads the meeting and refuses unless `ended_at is null and now() < expires_at`, even though the page already checked existence at render: the endpoint is directly callable, and a meeting can close while someone sits in the lobby deciding. (F09)
- **In the lobby, off releases the device — it never mutes.** A preview reading OFF while the camera light stays lit is what breaks trust in a lobby. It also keeps the SDK's muted-track trap out of reach: `setDeviceId` sets `pendingDeviceChange` and returns early on a muted track, so a device picker would appear to do nothing until the track was unmuted. (F08)
- **A media request is only timed out when it cannot be waiting on a person.** `getUserMedia` does not settle until the permission prompt is answered, so a flat timeout fires on someone who took a moment to find the Allow button — a false failure on the most ordinary path in the product. Permission state decides the shape: granted means no prompt is coming, so each device is requested separately and timed; undecided means one combined untimed request. (F07)
- **Secrets are parsed per service, not all in one schema.** `env.server.ts` parsed all three at module load, so `/api/meetings` — which never calls LiveKit — could not build while the LiveKit keys were blank. The same coupling would take meeting creation down during a LiveKit key rotation in production. (F06)
- **A fragment is never case-normalised.** `parseRoomCodeInput` lowercases the room code but splits the fragment off first: the chat key is base64url and case-sensitive, so normalising the whole pasted string would silently decode to the wrong bytes. Now an invariant in `architecture.md` → Encryption. (F05)
- **The session is read server-side in the `(shell)` layout**, which makes Home and Call History dynamic. A client-side read would keep Home static at the cost of showing a signed-out header on every load before correcting — worst on exactly the cold free-tier load this project already fights. (F04)
