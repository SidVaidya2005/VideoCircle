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

**Phase:** Phase 0 — Foundation
**Last completed:** Nothing yet — build not started
**Next:** 01 Project scaffold and tooling

---

## Progress

### Phase 0 — Foundation

- [ ] 01 Project scaffold and tooling
- [ ] 02 Design tokens and UI primitives
- [ ] 03 Supabase project and schema
- [ ] Phase checkpoint — verify Phase 0 — Foundation is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 1 — Identity and entry

- [ ] 04 Google sign-in and session
- [ ] 05 Home page
- [ ] 06 Create meeting and share link
- [ ] Phase checkpoint — verify Phase 1 — Identity and entry is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 2 — Lobby

- [ ] 07 Media permissions and self-preview
- [ ] 08 Lobby controls
- [ ] 09 Join handoff
- [ ] Phase checkpoint — verify Phase 2 — Lobby is stable, then **compact `build-journal.md` and promote binding decisions into `constraints.md`**

### Phase 3 — The call

- [ ] 10 Room connection and video grid
- [ ] 11 In-call control bar
- [ ] 12 Screen sharing
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

## Key Decisions

_None yet._
