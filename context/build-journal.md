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


## Phase 2 — Lobby

### 2026-08-13 — 07 Media permissions and self-preview

**Decisions**

- **Two acquisition shapes, chosen by permission state.** A flat timeout on `getUserMedia` is wrong, because the promise does not settle until the permission prompt is answered — so the timer fires on someone who simply took a while to find Allow, turning the most ordinary path in the product into a rendered failure. Permission state decides instead: already granted means no prompt is coming, so each device is asked for separately, in parallel, each timed; undecided means one combined untimed request, one prompt, answered at the person's own pace. Falls back to the untimed path wherever `permissions.query` rejects, which is Firefox and older Safari for these names — the fallback that cannot produce a false failure.
- **The page verifies the code before the lobby mounts.** Shape, then existence through `findMeetingByCode`, `notFound()` on either. A dead link now fails before anyone is asked for a camera rather than after. Joinability stayed with F09 on purpose: a meeting can close while someone sits in the lobby, so that check has to happen at join, and the two are not duplicates.
- **`findMeetingByCode` uses `supabaseAdmin`, and lives in `src/lib`.** RLS on `meetings` admits only an authenticated participant, so the anon client would make every valid code look unknown to the very guest opening its link. Putting it behind a lib function keeps the service-role client out of `src/app`, where the boundary in `architecture.md` does not allow it.
- **No Join control shipped.** The entry asked for "a path to join anyway", but Join belongs to F08 and joining to F09. Shipping a disabled button for two features reads as broken; the guarantee kept instead is that no failure state dead-ends the page.
- **`idle` dropped, `timeout` added.** Nothing can produce `idle` when the hook requests on mount — and ESLint's `react-hooks/set-state-in-effect` rejects the synchronous `setState` that moving out of it required. `timeout` earned its place empirically, below.

**Gotchas**

- **`getUserMedia` can hang instead of rejecting, and it happens on real hardware.** On this machine `{video: true}` opens normally while `{audio: true}` never settles at all — so the combined request never settles either, and the lobby sat on "Waiting for camera and microphone" forever. Found because the E2E suite failed, not because anything was reviewed. This is the same failure the clipboard hit in F06, in a different API: a call that neither succeeds nor fails is worse than one that fails.
- **`MediaDeviceFailure.getFailure` throws on a primitive.** It tests `'name' in error`, and `in` raises a TypeError on a string or null. `throw 'string'` is legal JavaScript, so the classifier could itself throw and strand the lobby. Caught by the unit test on its first run, from the case that existed only for completeness.
- **`next/dynamic` with `ssr: false` is rejected in a Server Component.** The plan called for it to code-split the room tree; Next errors on it. Not needed anyway — the route is the split point, verified by serving the production build and confirming Home requests no chunk carrying the SDK.
- **Playwright's default headless build has no working audio capture here,** and the fake-device flags auto-grant permission, so the denied, no-device, and in-use states are unreachable from the suite as configured.

**Verified**

- `npm run lint` (0 errors, 3 pre-existing warnings), `npm run typecheck`, `npm run build`, `npm run test` (84 passing), `npx playwright test` (all specs).
- 5 new E2E specs: a real code renders a live preview with frames arriving (`readyState >= 2`, non-zero `videoWidth`); unknown and malformed codes both 404 with no video element; exactly one live camera track, which is what catches an orphaned acquisition; no horizontal overflow at 360px.
- 8 unit assertions over the classifier, covering both spellings of each DOMException, an unrecognised one, and non-object throws.
- Bundle claim checked by serving the production build: Home requests no chunk containing SDK symbols; its only `livekit` match is the `NEXT_PUBLIC_LIVEKIT_URL` value. Home's first load measures ~341 kB gzipped against a 200 kB target — pre-existing, recorded as a follow-up for F22.
- **Not verified:** the denied, no-device, and in-use states in a real browser. Recorded as a follow-up.
