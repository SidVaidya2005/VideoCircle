# Build Plan

> **Role:** The ordered plan — phases and numbered features to build, in sequence.
> **Read before starting a feature**; build one feature fully before the next.
> **Relates to:** features come from `project-overview.md`; status tracked in `progress-tracker.md`.

## Core Principle

Build the visible surface with mock data first, then connect the real logic.
Verify each step in a browser before moving on. Compilation alone does not finish
a feature: open it, use it, and confirm that it works, including at a 360px
viewport.

Media and encryption need explicit failure states. Permission denials, missing
devices, dropped connections, and missing keys are ordinary situations. Build the
UI for each one in the same feature as the successful flow, rather than leaving
it for a later cleanup.

Any feature involving two participants must be verified with two participants.
Use two browser profiles, or a phone and a laptop. A call tested only with one
person has not been tested.

---

## Phase 0 — Foundation

### 01 Project scaffold and tooling

Set up the Next.js application and all quality checks before writing feature
code.

**Logic:**

- `create-next-app` with TypeScript, App Router, Tailwind 4, `src/` directory, and the `@/*` alias
- `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- ESLint and Prettier with `prettier-plugin-tailwindcss`
- Vitest configured with a `tests/unit` root; Playwright configured with fake media device flags
- `src/lib/env.ts` (public) and `src/lib/env.server.ts` (secrets), and a matching `.env.example`
- `src/lib/api.ts` (`apiOk`, `apiError`), `src/lib/constants.ts`, `src/lib/utils.ts` (`cn`)
- `node context/Design/_verify.mjs` wired into the `lint` script, so context drift fails the build
- A placeholder Home route that renders, builds, and passes lint

**Verify:** `npm run dev`, `build`, `lint`, `test`, and `test:e2e` all succeed on a clean checkout.

### 02 Design tokens and UI primitives

Bring the VideoCircle design system into the app so later features can use its
values without hardcoding their own. Read `context/Design/README.md` in full before
starting.

**UI:**

- App shell on warm near-black, rendered by a `(shell)` route group so `/room/[code]` cannot inherit it: header with the VideoCircle wordmark, sign-in slot, content region
- Footer with the author byline and links — Source, LinkedIn, Email, Portfolio — in wide-tracked caps with dot separators, following `context/Design/preview/footer.html`. Show it on Home and Call History only. **Never show it inside the call**, where it would break the fixed-strip layout
- The signature grid backdrop as a reusable `.grid-backdrop` surface, bleeding past its container
- A tokens preview route (development only) showing every surface step, text step, radius, easing, and interaction state side by side with `context/Design/preview/*.html`

**Logic:**

- `globals.css`: `:root` mirroring `context/Design/colors_and_type.css`, plus the `@theme inline` mapping to utility names and the shadcn token aliases
- JetBrains Mono wired through `next/font/google` with the `--font-jetbrains-mono` variable
- `prefers-reduced-motion` reset block
- Copy `context/Design/assets/mark.svg` into `public/brand/` for the favicon and OG tile. The wordmark renders as live text, not an image — see `context/Design/preview/logo.html`
- Wire `context/Design/_adherence.eslint.mjs` into `eslint.config.mjs` (`_verify.mjs` is already in the `lint` script from feature 01)
- Install `button` and restyle it to the kit: whisper borders, kit radii, no drop shadows or `dark:` variants, and a 44px minimum hit area at every size. Add dialog, sheet, dropdown-menu, tooltip, input, avatar, and sonner only when a feature first mounts them, per `code-standards.md` → Dependencies
- Adopt the kit's interaction states verbatim: white fill at rest for primary, `rgba(255,255,255,.05)` → `.1` for chips, inverted fill for active, asymmetric 50ms-in / 250ms-out hover transitions

**Verify:** The preview route matches the kit's specimens; grepping `src/` for a hex
literal outside `globals.css` returns nothing.

### 03 Supabase project and schema

**Logic:**

- Create the Supabase project; enable the Google OAuth provider
- Migration: `profiles`, `meetings`, `meeting_participants` exactly as specified in `architecture.md` → Data Model, including `meetings.expires_at` and `meeting_participants.is_guest` as a generated column
- Migration: indexes, including the partial unique index on `(meeting_id, identity) where left_at is null`
- Migration: the `is_meeting_participant(uuid)` `security definer` function, then RLS enabled on all three tables with the documented `select`/`update` policies. **Verify the co-participant policy does not recurse before moving on** — a self-referential policy on `meeting_participants` errors outright
- Migration: the nightly `pg_cron` sweep closing meetings past `expires_at` and any participation rows still open
- Trigger inserting a `profiles` row on `auth.users` insert
- `src/lib/supabase/{client,server,admin,proxy}.ts` and `src/proxy.ts` (both named `middleware` until the Next 16 rename in the Phase 1 checkpoint)
- Generate `src/types/database.ts`

**Verify:** Resolve all RLS and security findings. Use `get_advisors` if the
Supabase MCP server is available; otherwise review each policy directly. Then test
the policies with actual queries: user A must see nothing belonging to user B,
and an authenticated query on `meeting_participants` must not fail with infinite
recursion.

---

## Phase 1 — Identity and entry

### 04 Google sign-in and session

**UI:**

- Sign-in button in the header, opening Google's consent flow
- Signed-in state: avatar, display name, dropdown with "Call history" and "Sign out"
- Auth failure returns to Home with a readable message, not a blank page

**Logic:**

- `signInWithOAuth({ provider: 'google' })` with a `redirectTo` carrying the return path
- `/auth/callback` route handler exchanging the PKCE code, with same-origin validation on `next`
- `/auth/signout` route handler
- Proxy session refresh confirmed working across a full page reload

**Prerequisites, outside the codebase.** Verification requires all three of the
following:

1. A Google Cloud OAuth 2.0 *Web application* client whose authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`. This is Supabase's callback, not ours.
2. The Google provider enabled in Supabase with that client's ID and secret.
3. `http://localhost:3000/auth/callback` in Supabase's Redirect URLs. Add the Render URL at F25.

**Decisions, agreed before building:**

- **Read auth state on the server in `(shell)/layout.tsx`** and pass it to the header's existing `actions` slot. The header then needs no auth logic, and visitors do not briefly see a signed-out header. Home becomes dynamic rather than static, consistent with the rest of the app, which already reads session cookies on every request.
- **Read the display name from `profiles`, never `user_metadata`.** The trigger's `coalesce` chain is the single rule for deriving a name, so the header and call history agree. Users can edit `user_metadata`; it must never influence authorization.
- **Use a typographic initial for the avatar instead of the Google photo.** This follows the brand's use of type and geometry. It also avoids a `remotePatterns` entry, a request from the visitor to googleusercontent.com on each render, and a fallback for dead image URLs. Keep storing `profiles.avatar_url`.
- **Build both halves of the chat-key `sessionStorage` stash now** in `src/lib/auth/sign-in.ts`. No URL carries a `#k=` fragment until F06, and F17 owns the restore *call site*. The helper belongs here because a lost fragment fails silently; postponing it would make it easy to forget when revisiting sign-in.
- **`/auth/signout` accepts POST only**, through a form, and responds with a 303. A GET signout could be triggered by `next/link` prefetch or a third-party image tag.
- **Resolve redirects against `NEXT_PUBLIC_SITE_URL`, rather than the request origin.** Render terminates TLS at a proxy, so `new URL(request.url).origin` may not be the public origin. Callers can control `X-Forwarded-Host`. The environment value is already the canonical origin for this purpose.
- **Put `safeNext` in its own module** for Vitest coverage. Tests use `environment: 'node'` over `tests/unit/**`, so only pure functions can be unit-tested.
- **Both route handlers redirect instead of returning `apiOk`/`apiError`.** Browser-navigated OAuth endpoints need redirects. The JSON-response invariant applies to `src/app/api/`, as defined in `architecture.md`.

**Verify:** Sign in, reload, then close and reopen the tab. The session must
survive. Sign out and confirm that it clears. `/auth/callback?code=bogus` must
return to Home with a readable notice, and `curl -i` on `/auth/signout` must not
return a 303.

After a real sign-in, confirm that `profiles.display_name` holds a real name. This
checks the trigger's `coalesce` against Google's actual payload, which F03 deferred
to this feature.

### 05 Home page

> **The visual surface landed early, during feature 02.** It includes the hero,
> mock call preview, how-it-works section, and feature grid, following the Core
> Principle of building the visible surface before its logic. F04 added the two
> auth variants in the header. This feature completes the join-by-code path.

**UI:**

- Hero explaining what VideoCircle is, with "New meeting" as the primary action
- "Join with a code" input accepting either a bare code or a full pasted link
- Inline validation for a malformed code
- Responsive from 360px up

**Logic:**

- `src/lib/room-code.ts` — `generateRoomCode`, `isValidRoomCode`, `ROOM_CODE_PATTERN`
- Parse a pasted link down to its code, preserving the `#k=` fragment if present
- Client-side validation via `isValidRoomCode`
- Navigate to `/room/[code]`, carrying the fragment through unchanged

**Decisions, agreed before building:**

- **Wire only the join path.** An earlier note said "the two hero controls", but that conflicted with F06's Logic list. `START A MEETING` needs `generateRoomCode`, a Web Crypto chat key, and `POST /api/meetings`; all three belong to F06. Leave that control inert until F06 and keep F06's scope unchanged.
- **Replace `JOIN AS GUEST` with the form inline in the hero.** Once the input is visible, a button to reveal it would add an unnecessary click. Both entry points are immediately available, and no dialog primitive needs adding or restyling.
- **Build all of `src/lib/room-code.ts` here instead of splitting it with F06.** Include the shape, alphabet, and collision tests that F06's verification calls for. `architecture.md` defines one canonical block. Splitting it would mean editing the same file twice and reviewing the 32-character alphabet rationale twice. `generateRoomCode` will be unused for one feature.
- **Navigation reaches a 404 until Phase 2; that is the expected result here.** This feature owns parsing and navigation. Verify the destination in the URL bar, including the preserved fragment.
- **Accept any origin, but validate the code strictly.** A string with a path segment matching `ROOM_CODE_PATTERN` yields that code. This allows links pasted from the deployed site while running locally, as well as links with tracking parameters. Trim and lowercase the input first. The alphabet is lowercase-only, so an email client capitalising a code should not make it invalid.
- **Treat the fragment as opaque.** Carry it byte-for-byte from the pasted string to the destination URL. Never parse, decode, log, or validate it here; F17 owns reading it.
- **Validate on submit instead of on each keystroke.** Clear a visible error when typing resumes, so it cannot contradict the current field contents.

**Verify:** Unit-test room-code shape, alphabet membership, collision-freeness over
a large sample, and every input shape the parser accepts. In a browser, confirm
that both a bare code and a pasted link navigate. A link ending `#k=TESTKEY` must
arrive with the fragment byte-identical. A code containing the forbidden `i` must
not navigate, and submitting must make no network request.

### 06 Create meeting and share link

**UI:**

- Post-create confirmation showing the full share link with a copy button and a "link includes the chat key" note
- A quiet line beneath the share link explaining that a first visit after an idle spell may take about a minute to load. This discloses the free-tier cold start before the recipient encounters a blank page
- The "link includes the chat key" note also warns against shortening the link: a shortener drops the `#k=` fragment and silently costs the recipient chat
- Copy confirmation toast

**Logic:**

- `src/lib/crypto/base64url.ts` and `chat-key.ts` — generate, export, import, read-from-hash
- `POST /api/meetings` generating the code, inserting the meeting row via `supabaseAdmin`, and recording `created_by` when signed in
- On a unique-violation (`23505`) on `code`, regenerate and retry once, then return `409`
- Navigate to `/room/[code]#k=<key>`

**Decisions, agreed before building:**

- **Generate room codes only on the server.** The client POSTs an empty body and uses the returned code. The server already regenerates after a collision. If the client navigated to a code it originally supplied, that rare collision would send it to the wrong room and would be easy to miss before release. `architecture.md`'s creation flow was corrected to match.
- **Show the share panel in the hero's action area on Home.** Do not navigate straight to the room. `/room/[code]` does not exist until Phase 2, so this is the only place for the feature's UI. It also suits a product whose deliverable is the link. `JOIN NOW` performs the navigation.
- **Confirm copying on the button itself instead of in a toast.** shadcn's toast is now `sonner`, which is absent from `code-standards.md`'s approved list. Adding a browser-bundle dependency for one confirmation is unnecessary when the control can show it.
- **Let the column default set `expires_at`; omit it from the insert payload.** The migration declares the 24-hour window once, and `/api/token` and the sweep read it. Repeating the literal in application code would allow the two values to drift.
- **Keep the exported key in client-only `useState`.** Never pass it across a Server Component boundary as a prop: `library-docs.md` → Web Crypto forbids state that could be serialized. Generate and export the key once, then discard the `CryptoKey` itself. This feature does not encrypt messages.
- **This feature is the first to import `supabaseAdmin`** and therefore the first to need `SUPABASE_SERVICE_ROLE_KEY`. `env.server.ts` parses at module load, so a blank key fails on import, before any request.

**Verify:** Confirm the code exists in Postgres. `created_by` must be null for a
guest and set for a signed-in user, with `expires_at` about 24 hours ahead. The
request body must be `{}` and the response `{ code }`, with no key material in
either or in the server log.

Copying must yield exactly `${NEXT_PUBLIC_SITE_URL}/room/<code>#k=<key>`.
`JOIN NOW` must preserve that fragment. Room-code shape, alphabet, and collision
tests were added with the module in F05.

---

## Phase 2 — Lobby

### 07 Media permissions and self-preview

**UI:**

- Live self-preview video, mirrored, letterboxed with `object-contain` so any aspect ratio fits
- Requesting state while the browser decides
- Permission-denied state with instructions to re-enable
- No-camera-found, no-microphone-found, device-in-use, and unresponsive-device states
- A device failure leaves the page usable. **Do not add a Join control here**; F08 owns it. In this feature, "a path to join anyway" means keeping the lobby usable, rather than shipping a button

**Logic:**

- Resolve the code on the server before mounting the lobby: validate its shape, then check existence through `findMeetingByCode`. Call `notFound()` for either failure. F09 owns joinability, because a meeting may close while someone waits in the lobby
- `createLocalTracks` for the preview, attached to a video element
- Track cleanup on unmount, including tracks that arrive after their request was abandoned
- Discriminated-union state: `requesting | ready | denied | no-device | in-use | timeout | error`
- `ready` carries partial success — a working microphone and a dead webcam is ready, with `cameraFailure` set
- Choose acquisition based on whether a permission prompt may still appear. If permission is **granted**, request both devices separately, in parallel, with a timeout for each, so a hung microphone does not delay the camera. If permission is **not yet decided**, make one combined request without a timeout, so there is a single prompt and the person can answer at their own pace

**Two things the build changed from this entry, and why:**

- **Remove `idle` from the union.** The hook requests devices on mount, so a mounted lobby is never waiting to begin requesting. The transition was also unbuildable: ESLint's `react-hooks/set-state-in-effect` rejects the synchronous `setState` needed to leave `idle`.
- **Add `timeout`.** `getUserMedia` can hang rather than reject. On the development machine, audio never returned while the camera opened normally. Without a timeout, the lobby could wait forever.

**Verify:** Automate checks that a real code renders live preview, unknown and
malformed codes both return 404, each device has only one live track, and the lobby
has no horizontal overflow at 360px.

In a real browser, block the camera in site settings and confirm the denied state
has usable instructions. This remains manual: the E2E suite's fake-device flags
auto-grant permission and cannot reach that path.

### 08 Lobby controls

**UI:**

- Mic and camera toggles with unmistakable on/off states and `aria-pressed`. The engaged state is the kit's white fill; a muted **own** microphone is one of only two sanctioned uses of `signal`
- Camera and microphone pickers listing real device labels
- Display-name field — prefilled from `profiles` server-side for signed-in users, editable, required for guests
- Copy-invite-link secondary action
- Full-height `dvh` layout, controls bottom-weighted so they stay in one-handed reach

**Logic:**

- **Off releases the device rather than muting it.** An OFF preview with the camera light still on breaks trust. A muted track also makes `setDeviceId` defer silently
- Enumerate with `Room.getLocalDevices(kind, false)`. The `false` prevents a second permission prompt. Wait until permission is known, because device labels are empty before then
- Switching while on calls `track.setDeviceId()`, which restarts capture in place; switching while off just records the choice for the next acquire
- Persist preferences in `localStorage` and validate them with Zod on read, since users can edit storage. Apply them before touching any device: if someone left with the camera off, returning must not open it
- If a remembered device is no longer present, fall back to the system default. Pass its stored id as a bare `deviceId`, which is an ideal constraint, rather than `{exact}`
- Name validation against `MAX_DISPLAY_NAME_LENGTH`

**Three things the build changed from this entry, and why:**

- **Do not add a Join control.** F09 owns both token minting and connection. A primary action with no effect would look broken, so use the same decision as F07.
- **Move the speaker picker to the in-call device controls.** The lobby plays no remote audio, so the picker cannot be verified here. It would also silently do nothing on Firefox and iOS, which cannot honour `setSinkId`.
- **Move `SectionOverline` to `src/components/ui/` and extract clipboard logic to `useCopyToClipboard`.** The lobby is the third surface using the overline and the second needing clipboard handling, including its hang timeout. Sharing these implementations avoids the duplication and drift warned about in `code-standards.md`.

**Verify:** Automate camera off reducing live tracks to **zero**, and camera on
restoring exactly one. A muted track would still count as one. Check that the
picker has a labelled device, switching preserves the document, preferences survive
reload, the name stops at the shared maximum, and every control clears 44px at
360px.

Verify the equivalent microphone behaviour manually, because audio capture hangs
on the development machine.

### 09 Join handoff

**UI:**

- "Join now" in the lobby, disabled only when the trimmed name is empty. A failed device must not disable joining: feature 07's states exist so people can join anyway
- Separate states for "meeting does not exist", "meeting has ended", and "link expired". Explain each and offer to start a new meeting, because retrying cannot help
- Token-failure state that returns to the lobby with a retry, never a blank screen
- A minimal connected state: connection status, headcount, and Leave

**Logic:**

- `POST /api/token` — Zod body, then **meeting-state check before minting**: 404 unknown, 410 ended, 410 expired
- `getUser()`, identity resolution (`user:<uuid>` / `guest:<uuid>`, generated server-side and never accepted from the client), `mintAccessToken`
- `src/lib/livekit/token.ts` with the `min(1h, expires_at − now)` TTL cap and a single-room grant carrying no admin claims
- Parse `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in `src/lib/env.livekit.server.ts`. F06 removed them from `env.server.ts` because the shared secret schema prevented `/api/meetings` from building when these unrelated credentials were absent
- **Release preview tracks before connecting.** A live preview track holds the camera that the room is about to request
- Pass the lobby's mic/camera state and device ids into `<LiveKitRoom>`. **Memoise its `options` object.** The component re-creates its `Room` whenever that object's identity changes. A fresh literal on every render causes continuous reconnections that look like a network fault
- The joinability decision and the TTL cap live in pure modules free of `server-only`, so every branch is testable without a database or the LiveKit secrets

**Verify:** Call `POST /api/token` with a well-formed but never-created code. It
must return 404 **with nothing token-shaped in the body**: a plausible code alone must
not grant entry.

Decode a returned JWT and check that its grant names exactly one room, sets
`roomJoin`, and omits `roomAdmin`, `roomCreate`, and `roomList`. Then join a real
call against LiveKit Cloud and leave it.

---

## Phase 3 — The call

### 10 Room connection and video grid

**UI:**

- Participant tiles with video, display name, and a muted indicator
- Camera-off tiles showing initials on `bg-raised` — never a generated avatar
- Grid reflowing by headcount from 1 to `MAX_VISIBLE_TILES`
- Connecting, reconnecting, and disconnected states
- Single-column stack on phones, grid from `sm:` up
- Local participant first, mirrored and labelled `YOU`. As in the lobby, only the local self-view is mirrored; remote tiles are not

**Logic:**

- `<LiveKitRoom>` shell with `<RoomAudioRenderer />`
- `useTracks` with `withPlaceholder: true` on the camera source
- `RoomEvent` handling for `Reconnecting`, `Reconnected`, and `Disconnected`
- **Build our own grid and tile from the unstyled primitives**: `useTracks`, `VideoTrack`, `useIsSpeaking`, `useIsMuted`, and `useVisualStableUpdate`. `GridLayout` emits `lk-grid-layout`, which cannot lay out content without the unapproved `@livekit/components-styles` dependency. `ParticipantTile` includes a name chip, mute icon, quality dot, and focus button that each conflict with `Design/README.md` → Participant tiles. Using these components would require a new dependency and CSS overrides wherever their styles differ from the brand
- **Use CSS based on headcount for reflow, without measuring the container.** Map counts to complete, static Tailwind class strings at each breakpoint. Never interpolate class names; the compiler would not emit them. This avoids a `ResizeObserver` competing with WebRTC encoding and makes the mapping unit-testable without a browser
- **When headcount exceeds `MAX_VISIBLE_TILES`, promote speakers and count the hidden tiles.** `useVisualStableUpdate` keeps speakers on the visible page, and a `+N MORE` overline reports those hidden. Omit pager controls: the product is sized for ~12. `RoomAudioRenderer` still plays every remote participant, including those without a visible tile
- **Show the same camera-off state for a placeholder reference and a muted publication.** `isTrackReference` distinguishes them internally, but the viewer sees no difference
- Keep a temporary Leave action in the status strip until feature 11 adds the control bar. Without a way to leave, the meeting's `room_finished` bookkeeping would have to wait for a timeout
- Follow `Design/README.md` → Colour in a call: red for your own muted mic, `--fg-3` for a remote participant's muted mic, and a white speaking ring. Add no other colour to the grid

**Verify:** In `tests/e2e/call-grid.spec.ts`, join one code from two browser
contexts. Each must see two tiles, including the other's name. A single-person
call is not sufficient verification. Unit-test the column mapping for counts
1–13 and the visible/overflow split.

Use `context.setOffline(true)` followed by `false` to confirm the reconnecting
strip appears while the tile DOM node persists and Leave remains enabled. The
room tree must stay mounted through a transient disconnect. Confirm audio by hand
with two real participants; automated assertions cannot establish that claim.

### 11 In-call control bar

**UI:**

- Mic, camera, chat, participants, reactions, and leave controls, built to the `control-states.html` recipe
- Active/inactive styling, tooltips on desktop, 44px minimum targets on touch
- Bar pinned above the safe-area inset on mobile
- Leave confirmation

**Logic:**

- `useLocalParticipant` toggles for microphone and camera
- Keyboard shortcuts: `d` mic, `e` camera, suppressed while the chat composer has focus
- Controls remain interactive during a reconnect
- **Build the full bar now, with four controls disabled until their features arrive.** Use the kit's disabled state: `rgba(255,255,255,.03)` ground, `--fg-4` glyph, and `aria-disabled`. F12, F14, F15, and F19 each enable one control and attach its handler. Until F14, MORE will open with three disabled rows
- **Omit screen share until F12 instead of disabling it.** The specimen requires unavailable capabilities to be absent, as sharing already is on every phone. A visible share control must therefore mean the device can share. Giving absence a second meaning would weaken that rule
- **Keep camera-off neutral; only your muted mic is red.** `Design/README.md` → Colour in a call and the `control-states.html` note previously said "mic *or camera*". That conflicted with `DeviceToggle`, which has passed `signalWhenOff` only for the mic since F08. The docs were corrected to match the code: camera-off is not a warning
- **Confirm Leave in place.** Widen the control to `LEAVE?` instead of opening a modal over the call. Return it to rest after a timeout or another control press. Leaving is recoverable because the same link lets the person rejoin
- **Use CSS for the responsive collapse, without a media-query hook.** Define secondary controls once and render them in two places: inline at `sm:` and above, and inside MORE below that. This avoids measurement inside the call tree and SSR mismatches. MORE reuses the `dropdown-menu` restyled in F04. The specimen's `aria-haspopup="menu"` trigger requires a dropdown rather than a sheet

**Verify:** Use two contexts to confirm that camera off releases all live video
tracks, leaving **zero**, and changes the other participant's view to initials.
Check `d` and `e` from the keyboard. Unit-test the typing guard with inputs,
contenteditable, modifiers, and key repeat, because F19's composer is not available
for an end-to-end check yet.

Leave must require two presses and navigate only on the second. At 360px, the bar
must retain mic, camera, MORE, and Leave, with every control at least 44px on both
axes and no horizontal overflow. Keep the room offline with `setOffline` and
confirm the mic toggle remains enabled and responsive while reconnecting.

### 12 Screen sharing

**UI:**

- Screen-share control, absent entirely on browsers without `getDisplayMedia`
- "You are sharing your screen" banner with a stop action
- Screen-share tiles labelled with the sharer's name

**Logic:**

- `setScreenShareEnabled` on the local participant
- Capability detection driving whether the control renders
- Handle the user cancelling the browser's own share picker without leaving stale UI state
- Detect share-ended-from-browser-UI and sync our state
- **Keep sharing state in LiveKit rather than duplicating it.** `useLocalParticipant` re-emits on `LocalTrackUnpublished`. When someone uses Chrome's "Stop sharing" bar, it therefore updates `isScreenShareEnabled` without another listener. A mirrored boolean could go stale; using the SDK state meets the requirement
- **Sort share tiles before all camera tiles.** A shared screen must never be hidden by `MAX_VISIBLE_TILES` while its owner believes everyone can see it; without this ordering, that happens in a nine-person call. Add only the sort step here. F13 still owns spotlight, focus resolution, and the filmstrip
- **Show the sharer their own share tile**, through the same path everyone uses. It lets them catch the common mistake of sharing the wrong window
- **Omit the mirror, mute dot, and speaking ring from share tiles.** Only a self-camera is mirrored. The dot and ring describe the person and belong on their camera tile. Label the share with the sharer's name plus `— SCREEN`
- **Show the control according to capability, never width** (`code-standards.md` → Responsive). It is absent on every phone but appears inside MORE in a narrow desktop window. Absence means the device cannot share
- **Treat `NotAllowedError` as a normal cancellation.** Do not show a toast or log an error. No state is set optimistically, so the bar returns to rest by itself

**Verify:** Stub `getDisplayMedia` with a canvas-captured stream. This replaces
only the browser picker: LiveKit still publishes a real track, and the SFU relays
it to the remote participant.

Prove the capability gate in both directions, the share reaching the other
participant in first position, the sharing banner and stop action, and dismissal
of the picker leaving state unchanged. Also stop a track outside our UI and
confirm the state updates without reloading.

**Receiving a real desktop share on a real phone remains a manual check.** Record
it as a follow-up; do not claim it is verified.

### 13 Speaker and spotlight view

**UI:**

- Layout switches to a large focused tile with a filmstrip when a screen share starts
- Manual pin/unpin on any participant
- Filmstrip scrolls horizontally on mobile, vertically on desktop
- Return to grid when the share ends and nothing is pinned

**Logic:**

- Focus resolution order: manual pin, then active screen share, then active speaker
- Active-speaker detection from LiveKit
- **Use active speaker for filmstrip order and the speaking ring, never to trigger spotlight.** The two bullets above cannot both apply literally. Focusing every new speaker would switch the layout several times a minute in a four-way conversation, while "return to grid when the share ends and nothing is pinned" establishes grid as the resting state. Only a share or pin enters or leaves grid
- **Clear a pin when its participant leaves.** Focus a running share if one exists; otherwise return to grid. Moving focus to the next speaker would leave spotlight active without a pin or an obvious exit
- **Store a pin as its tile key** (`identity:source`), never as a participant object. A stale pin then cannot retain a departed participant
- **Support both a gesture and a menu for pinning.** Double-click or long-press a tile, or use its Pin/Unpin menu for keyboard and screen-reader access. Where a fine pointer supports hover, show the menu button on hover or focus. Where hover is unavailable, keep it visible so it remains reachable. Add a desktop hover tooltip naming the gesture
- **Exclude only the focused tile from the filmstrip.** If Ada's screen is focused, keep her camera in the strip so people can see her while she presents and talks
- **Keep `orderCallTiles` unchanged from F12.** Spotlight uses the same ordered, capped list. Its existing share-first sort makes the share the natural focus without undoing prior work

**Verify:** With two contexts, confirm that a share changes the receiver's layout
to one focused tile and a filmstrip, then returns it to grid when sharing stops.
Test pin and unpin by double-click, pinning from the menu without a pointer
gesture, and a pin taking priority over a running share.

Unit-test focus resolution, including a pinned key whose participant has left. At
360px in spotlight, require no horizontal overflow and at least 44px for every
control in `main`.

### 14 Participant list panel

**UI:**

- Panel listing every participant with name, mic state, camera state, and a "you" marker
- Live headcount in the control bar
- `Sheet` on mobile, inline side panel on desktop

**Logic:**

- Derive from LiveKit participant state; no separate data source
- Sort: local participant first, then join order
- **Switch from sheet to inline panel at `lg:`, rather than `sm:`.** A side column has room at that width, and it matches the spotlight filmstrip's breakpoint
- **Put the panel in the right column and switch the filmstrip to horizontal while it is open.** Two scrolling regions stacked in a narrow column are not useful at 1024px. Use only one column of surrounding UI at a time; the filmstrip already has a horizontal mode
- **Move headcount from the status strip to a badge on the participants control.** Keep the count beside the control that opens the list. This also frees the strip for the sharing banner and connection state at 360px. Delete `participant-count.tsx` so no unused second count can diverge
- **Use one `openPanel` value on `CallStage`**, initially `'participants' | null` and widened in F19. Only one panel can then be open, which is necessary on a phone and prevents competition for the right column. F19 adds a variant without needing a new mechanism
- **Read each row's mic and camera state through `useIsMuted`, as tiles do.** Reading `participant.isMicrophoneEnabled` would rely on `useParticipants` re-rendering for events it does not promise to handle. LiveKit mutates publications in place; this caused the kind of defect found in F11 and again in F13
- **Do not add pinning to the list.** F13 deferred the question here, but F14's requirements do not include it, and tiles already support pinning by gesture and menu

**Verify:** Use two contexts to confirm both names appear, `you` marks only the
local row, and mic/camera states update without reopening the list. The badge
must count 1 when alone, 2 after a join, and 1 again after a leave.

At 360px, require a dialog with no horizontal overflow and controls of at least
44px. At desktop width, require an `aside` without a dialog role; opening it must
make the filmstrip horizontal. Unit-test sorting.

### 15 Reactions and raise hand

Use brand-native reactions. The kit forbids emoji, so reactions use
wide-tracked CAPS chips and the signature red-dot burst. Follow the control-row
treatment in `context/Design/preview/control-states.html`.

**UI:**

- A fixed reaction set as CAPS chips: `NICE`, `+1`, `LOL`, `WOW`, `BRB`
- Chip row styled as the kit's ease-buttons — `rgba(255,255,255,.05)` at rest, `.1` on hover, inverted fill while sending
- A fired reaction rises over the sender's tile as its CAPS label with a red-dot burst behind it, easing on `ease-out-expo`, fading after `REACTION_TTL_MS`
- Show a persistent raised-hand badge on the tile and participant list, using a **neutral marker rather than the red dot**. A tile's red dot already means *your own muted mic*. Giving another red dot a different meaning on the same tile would violate `architecture.md`'s red invariant. A raised hand is neither destructive nor a warning

**Logic:**

- Accept only reaction labels from the fixed set. Drop unknown labels so an untrusted peer cannot place arbitrary text over a tile
- Publish **reactions** on `DATA_TOPIC.REACTION` with `{ reliable: false }`. An occasional lost reaction is acceptable, which makes the unreliable channel suitable
- **Store raise-hand in a LiveKit participant attribute, rather than `DATA_TOPIC.HAND`.** A data channel cannot show a late joiner a hand raised before they arrived. With `reliable: false`, a dropped packet could also leave the hand up on some screens and down on others, without any visible failure. `setAttributes` provides durable per-participant state synced to everyone, including late joiners. Read it per participant with `useParticipantAttributes`, following the rule that each tile subscribes only to its own participant. Keep `DATA_TOPIC.HAND` declared but unused in `constants.ts` as part of the wire-protocol record
- **Add exactly one token claim: `canUpdateOwnMetadata`.** It is outside the forbidden set and lets a client describe only itself. Because it changes a security-relevant surface, explicitly assert it in the grant spec alongside the three claims that must remain false
- Raise-hand is toggle state that clears on leave. The participant's attributes disappear with them, so no cleanup is needed
- Rate-limit reactions **on both sides**. Throttle sends to stop a local flood and drop excess receives to stop a peer's flood. Peers are untrusted, so a send-side limit alone is insufficient
- **Use one control and one popover.** Keep the bar at seven controls, measured at 440px in `code-standards.md`. An eighth cannot fit a phone while preserving the 44px minimum. Put both chips and the hand toggle inside the popover, with a clear visual distinction between a one-time reaction and persistent hand state
- **Use a React context only for reactions**, keyed by identity so each tile reads its own. Read hands from participant attributes instead, keeping the provider small. Passing reaction props through three components would re-render every memoised tile whenever anyone reacted
- CSS-only animation — this renders inside the call, where `animejs` is not permitted

**Verify:** In two contexts, confirm that a reaction appears on the *sender's*
tile and expires without interaction. A raised hand must appear on both the tile
and participant row on both sides. Join from a third context after the hand is
raised and confirm it sees the hand too. That late-join case is why the transport
changed.

Unit-test the validator and rate limiter. End-to-end publication of a malformed
payload would require a room handle that production code does not expose; state
that gap instead of simulating coverage. The grant spec must assert
`canUpdateOwnMetadata` true and the three admin claims false.

### 16 Copy invite link in call

**UI:**

- Invite control in the control bar opening a dialog with the full link
- Copy button with confirmation
- Explicit note that the link carries the chat key

**Logic:**

- Reconstruct the link from `NEXT_PUBLIC_SITE_URL`, the code, and the current fragment
- Clipboard fallback (select-and-copy) for browsers that block `navigator.clipboard`
- **Use a centred `dialog`.** A sheet suggests ongoing content rather than a short action to complete and dismiss. An anchored popover has no room at 360px
- **Put the link in a read-only input and select it on focus.** In this project, `navigator.clipboard.writeText` has hung even after a trusted click in a secure context with permission granted. `use-copy-to-clipboard` already races it against a timeout. A selected input gives a one-keystroke fallback when copying fails; asking someone to find the address bar mid-call on a phone does not
- **Show a different note according to whether the link has a key.** With a key, explain that anyone holding the link can read chat. Without one, say the link gives no chat access. Otherwise someone who arrived through a stripped link may keep passing it on without noticing anything wrong in the call
- **Build links in `src/lib/invite-link.ts`.** Keep it pure and take the hash as an argument, leaving `window` in the event handler. Reuse it for the lobby copy button. Test that fragments are never case-normalised, turning the existing comment into a verified rule
- **The bar now has eight controls at `sm:` and above**, one more than the control-states specimen's seven. The 440px figure in `code-standards.md` applies to phones, where Invite joins the other secondary controls in MORE. Eight fit comfortably on desktop. Record this departure explicitly

**Verify:** Confirm the dialog's live link preserves the current fragment
verbatim and that copying confirms success. Stub a clipboard rejection to check
that the fallback appears with the field selected. A URL without a fragment must
show the no-chat-access note instead of the key warning.

Record every request made while the dialog is open and during copying. Assert
that none contains any part of the fragment. This tests the product's central
privacy claim, which had previously been protected structurally but not tested.
Unit-test the builder with a mixed-case key and an origin different from
`NEXT_PUBLIC_SITE_URL`.

---

## Phase 4 — Encrypted chat

### 17 Chat key handling

**UI:**

- Key-missing state on the chat panel: plain explanation that this link cannot read chat
- The chat control stops being a placeholder and opens a third `CallPanel`
- **Build the panel shell here and the composer in F19.** The missing-key state must be reachable in the UI to verify this feature. F17 adds the panel and its two states; F19 fills it and uses the same `status !== 'ready'` condition for the composer. Do not build a disabled composer now only to rebuild it later
- **Always let the control open the panel.** Never disable it. The panel needs to explain that the link is missing a piece; a disabled button would only suggest chat is broken

**Logic:**

- `useChatKey` hook reading the fragment, importing the key non-extractable, exposing `loading | ready | missing`
- Treat malformed and missing keys alike. One state and explanation is enough: someone with a truncated link cannot act on the distinction
- **Call the hook once in `CallStage` and pass its result down.** It mounts at join, giving the key time to import before the panel opens. `CallPanel` returns `null` when closed, so putting the hook inside it would repeat the import on every open and expose `loading` unnecessarily. Wait for a second consumer before adding a provider
- **React state may hold the `CryptoKey`, but not the encoded string.** The imported key is non-serializable and non-extractable. Read the base64url string in the effect without storing it
- **Read the fragment once without a `hashchange` listener.** Only the restore below rewrites it, and that runs first. Allowing a mid-call key change would silently make earlier transcript messages unreadable, so do not introduce that state
- **Call `restoreChatKeyFragment()` on mount of `RoomExperience`.** The lobby mounts and restores first. `CallStage`, the only key reader, mounts later after a Join click, making the ordering safe by construction. Restoring in a parent effect after its reader child mounted would be unsafe because React runs child effects first
- **Render nothing for `loading`.** Import takes less than a millisecond and finishes before the panel can open. A spinner would flash only when something is wrong

**Verify:** Open `/room/[code]` without a fragment. Show the explanation rather
than crashing or displaying an empty transcript. A malformed `#k=` must show the
same state; a valid key must reach ready.

As with F16's invite dialog, record requests while the chat panel is open and
assert none contains any part of the fragment. At 360px and 640px, the bar must fit
and every control must clear 44px.

Do not add a unit test for the hook. React Testing Library is not an approved
dependency, so adding it would be a separate dependency decision. The underlying
pure functions already have coverage.

### 18 Message encryption

**UI:**

- A plain input, a Send button, and an unstyled message list in the F17 panel
- **Build the minimal composer here so the channel can be inspected.** F18's plaintext-leak check needs a way to send messages. F19 adds Enter/Shift+Enter, own-message alignment, relative timestamps, the unread badge, and auto-scroll to this composer; it does not rebuild it
- No composer at all when the key is missing; F17's explanation stands unchanged

**Logic:**

- `src/lib/crypto/chat-message.ts` — `encryptChatMessage` and `decryptChatMessage` with a fresh 12-byte IV and sender identity as additional authenticated data
- `useEncryptedChat` hook wrapping `useDataChannel(DATA_TOPIC.CHAT)` with `{ reliable: true }`
- Decryption failure yields an "unreadable message" entry rather than a throw
- Enforce `MAX_CHAT_MESSAGE_LENGTH` before encryption. `encryptChatMessage` validates its own input with `ChatPlaintextSchema`, making the limit a rule. The input's `maxLength` is only a convenience
- **Keep the transcript in `CallStage`.** `CallPanel` unmounts its children when closed, so a hook there would stop receiving when the panel closes. F19's unread badge is also outside the panel, on the control bar
- **Use local receive time for both order and displayed time.** Validate the envelope's `sentAt` on arrival, then deliberately leave it unused. A peer's clock may be inaccurate or untrustworthy. Ordering by it would let one client reorder everyone's transcript or keep its messages at the top
- **Serialize decryptions with a tail-promise chain.** Async `decrypt` calls can finish out of order even when payloads arrive back to back. Chaining preserves arrival order when appending, without adding a pending state for F19 to render
- **Append a local message after `publishData` resolves.** If it rejects, keep the message with a `failed` status. `reliable: true` can still reject, and LiveKit does not echo local data to its sender
- **Drop incoming payloads when there is no key.** The panel already explains the lack of chat access. Adding unreadable placeholders below it would add noise
- **Do not re-export the base64url helpers from `chat-message.ts`.** An earlier `architecture.md` snippet did so, but message bytes go directly onto the channel without base64 encoding. A pure re-export would also be the barrel pattern forbidden by `code-standards.md`

**Verify:** Vitest must cover round trip, wrong key, tampered ciphertext,
mismatched sender identity, over-long body, and a distinct IV for each message.
Also use `crypto.subtle` directly to craft plaintext that is valid JSON with the
wrong shape, and test its rejection.

With two browser contexts, prove that messages cross between participants. A
payload encrypted with a different key must show an unreadable placeholder without
breaking the call.

**Inspect the data channel rather than HTTP requests.** `page.on('request')`
cannot observe SCTP traffic over WebRTC. In an init script, patch
`RTCDataChannel.prototype.send` to record every outgoing payload. Assert that the
recording is non-empty and contains no plaintext, so a missing recording cannot
make the check pass.

### 19 Chat panel

**UI:**

- Message list with sender name, relative timestamp, and own-message alignment
- Composer with Enter to send and Shift+Enter for a newline
- Unread badge on the chat control while the panel is closed
- Empty state noting that messages are end-to-end encrypted and not stored
- Auto-scroll that does not yank the view when the user has scrolled up
- `Sheet` on mobile, inline panel on desktop, sharing the participants-panel shell
- **Use a textarea that grows to about five rows, then scrolls.** Render message bodies with `whitespace-pre-wrap` to preserve typed newlines through the round trip. Read `scrollHeight` on input to grow the field. This is a layout measurement rather than an animation and does not violate the no-JS-animation-in-call rule
- **Fill only the local user's messages.** The inline panel already uses `bg-card`; filling both sides would make them harder to distinguish
- **Use terse relative times**: `just now`, `2m`, `47m`, `3h`, `2d`. Keep them lowercase and unpunctuated, like room codes and identifiers. Do not use `Intl.RelativeTimeFormat`, whose "2 minutes ago" wording differs from the rest of the product

**Logic:**

- Transcript held in component state only; never written to storage
- Messages from participants who have since left still render with their captured name
- **Count unread messages by index.** `CallStage` remembers how many messages had been seen when chat was last opened or closed. Count non-local entries after that mark. Unlike timestamps, an index cannot tie with a message received in the same millisecond
- **Update the seen mark in handlers, never in an effect.** Do it on both open and close, including the sheet's dismiss path. This avoids the `setState` in an effect body rejected by `react-hooks/set-state-in-effect`, the same rule that reshaped `useChatKey` in F17
- **Read whether the view is near the bottom before the list grows.** Keep that value in a ref updated on scroll. Measuring afterward would always report that the view was no longer near the bottom, so it would never follow new messages
- **Use one interval in `ChatPanel`, rather than one per message.** `CallPanel` unmounts it when closed, so no interval ticks while chat is shut
- **Keep `formatChatTime` pure in `src/lib/`.** Pass `receivedAt` and `now` so every boundary can be tested without a clock

**Verify:** Unit-test every relative-time boundary. With two contexts, confirm
that Enter sends, Shift+Enter does not, and a typed newline arrives intact. The
badge must count messages received while the panel was closed, clear on open, and
exclude the local user's messages.

Assert scrolling in both directions: it follows new messages near the bottom and
stays put when scrolled up. A view that never moved could pass a one-sided test.

---

## Phase 5 — Call history

### 20 Participation recording

**Logic:**

- `src/lib/livekit/webhook.ts` with `WebhookReceiver`
- `POST /api/livekit/webhook` reading the raw body and verifying the signature before anything else
- `participant_joined` → insert a participation row, resolving `user_id` from the `user:` identity prefix
- `participant_left` → set `left_at` on the open row for that `(meeting_id, identity)`
- `room_finished` → set `meetings.ended_at`, and close every still-open participation row for that meeting as reconciliation for a dropped `participant_left`
- Idempotent handling; `500` on transient failure so LiveKit retries, `200` on events deliberately ignored
- Confirm the nightly sweep from feature 03 closes meetings whose `room_finished` never arrived
- Configure the webhook URL in the LiveKit Cloud dashboard

**Decisions taken before building:**

- **Use the existing partial unique index for idempotency:** `meeting_participants_open_row_idx on (meeting_id, identity) where left_at is null`. Add neither a dedupe ledger nor a schema change. `participant_joined` inserts and treats `23505` as "already recorded". Scope `participant_left` and `room_finished` updates with `left_at is null` / `ended_at is null`, so redelivery updates zero rows.

  One limitation is accepted: if a join is redelivered after its participation row has closed, it no longer conflicts and creates a false open row. That requires a retry to outlast the entire participation. The nightly sweep closes the extra row.
- **Use LiveKit's event clock for all three timestamps, never `now()`.** Set `joined_at` from `participant.joinedAt`, and `left_at` and `ended_at` from `event.createdAt` (both `bigint` seconds). Durations remain accurate despite delivery delays and retries, which matters for feature 21.

  Using one clock also guarantees that the `left_at >= joined_at` CHECK cannot fire. Mixing clocks could violate it and leave the handler returning `500` on every retry.
- **Clamp the nightly sweep with `greatest(p.joined_at, m.expires_at)`.** It previously set `left_at = m.expires_at`. A token minted a second before expiry can produce a join after expiry, so that assignment violates the CHECK and aborts the whole function, preventing any meeting from being swept. This case becomes reachable only when this feature creates participation rows, which is why the fix belongs here.
- **Record joins even for ended or expired meetings.** LiveKit reports what actually happened, and expiry intentionally allows an already connected call to finish.
- **Separate pure logic from IO**, as in feature 09. Put identity parsing and timestamp conversion in a module Vitest can import. Keep Supabase writes behind `server-only`.
- **Verify with synthetic signed events now; configure the LiveKit Cloud dashboard in feature 25.** LiveKit cannot reach `localhost`. A Playwright spec therefore signs payloads with `LIVEKIT_API_SECRET`, using `AccessToken`'s `sha256` setter for the same claim checked by `WebhookReceiver`, then POSTs them. This makes redelivery repeatable. The limitation is explicit: real webhook traffic remains unverified until deployment.

**Verify:** Use signed-payload e2e tests to check all of the following:

- An unsigned request and a body changed after signing each return `401`.
- A join writes exactly one row with the event's `joined_at` and the correct `user_id` for `user:` versus `guest:`.
- Posting the identical payload twice leaves one row.
- A leave sets `left_at`, and redelivery leaves it unchanged.
- `room_finished` without a preceding `participant_left` closes the row and sets `ended_at`. This makes the killed-tab case deterministic.
- A valid-shaped code for a nonexistent meeting returns `200` and writes nothing.

Also verify the sweep clamp, first confirming that the check fails before the fix.
Real traffic from two accounts is verified in feature 25.

### 21 Call history page

**UI:**

- Reverse-chronological list: date and time, duration, participant names, and the meeting code
- Offer "Rejoin" only while `ended_at is null AND now() < expires_at`, matching `/api/token`. Do not offer a link that would return 410. State plainly that a rejoin link has no chat key
- Empty state for users with no history
- Card layout on mobile, table on desktop

**Logic:**

- Server Component query scoped with `.eq('user_id', user.id)`, ordered and limited
- Redirect to `/` when unauthenticated
- Duration derived from `joined_at`/`left_at`, falling back to the meeting's own timestamps
- Query failure logs and renders the empty state

**Decisions taken before building:**

- **Show one entry per meeting rather than per participation row.** A rejoin adds two rows to the same entry; its duration spans the user's first `joined_at` to their last `left_at`. `architecture.md` defines history as "the set of meetings they have a participation record for". A dropped connection is the most common reason for another row. Showing those rows as separate meetings with the same code and guest list would look like a bug.
- **Handle three duration states.** An open row in a joinable meeting shows in progress, without a number. A closed row shows the presence span. An open row in a meeting that is over uses `ended_at`, then `expires_at`. A single fallback chain could turn a 24-hour expiry into the displayed duration of an ongoing call.
- **Use two queries instead of a nested embed.** First fetch the user's own rows joined to `meetings`. Then use one `.in('meeting_id', ids)` query for all rows in those meetings. Grouping and name extraction can then be pure functions covered by unit tests. A self-referencing double embed would hide that logic in a query the tests cannot reach.
- **Use the session client, never `supabaseAdmin`.** The `read participation in meetings you joined` policy already permits exactly these co-participant rows. RLS therefore protects the scope beneath the explicit `.eq('user_id', …)`. This is the one page where that applies; the admin client would remove a useful defence.
- **Format times in the browser.** `Intl` in a Server Component uses the server's zone, UTC on Render, giving the wrong local time to readers elsewhere. The `<time>` element carries the ISO value and `suppressHydrationWarning`; the zone is the only difference across the server/client boundary.
- **Show three co-participant names, then `+N more`.** This keeps rows readable at 360px, where eleven names would wrap to five lines. Deduplicate by identity so a rejoiner appears once, and exclude the user's own rows.
- **Redirect signed-out visitors directly to `/`.** `project-overview.md` previously said "with the sign-in prompt open", but no mechanism supports that and neither `architecture.md` nor this plan requires it. Correct that sentence rather than adding the behaviour.

**Verify:** Prove that a second account's history contains none of the first
account's meetings. Use JWT impersonation in SQL from both users' perspectives,
so a policy that returns nothing for everyone cannot pass. `library-docs.md`
identifies this as the only check that exercises policies as PostgREST does.
Browser verification would require Google OAuth; using passwords would require
enabling the email provider that an open follow-up says to disable. Signed-in
rendering remains manual until feature 25.

Unit-test grouping across rejoins, all three duration states, co-participant
deduplication and self-exclusion, and the `+N more` split. Add e2e checks for the
signed-out redirect, 360px overflow, and hit areas. Render a `TZ=UTC` server to a
non-UTC browser to prove timestamps use the reader's zone.

---

## Phase 6 — Mobile and resilience

### 22 Mobile pass

**UI:**

- Every route audited at 360px, 390px, 430px, 768px, 1024px, 1440px, and 1920px — phones, both iPad orientations, laptop, and desktop
- Measure the audit: require zero horizontal overflow (`scrollWidth === clientWidth`) and no interactive target smaller than 44×44 at every listed width
- Performance targets in `code-standards.md` → Performance verified on the deployed instance: bundle sizes from `next build`, Lighthouse on mobile throttling, and a ten-minute four-participant call
- Call layout using `dvh` with safe-area insets honoured top and bottom
- All touch targets at least 44px, panels as full-height sheets
- Landscape orientation on phones handled without clipping the control bar

**Logic:**

- Confirm the screen-share control is absent on iOS Safari and Android Chrome
- Verify audio starts correctly after the Join gesture on iOS Safari
- Confirm device pickers show real labels on mobile after permission

**Decisions taken before building:**

- **Carry checks requiring a phone or deployed URL to F25 as blockers after doing everything possible locally.** `getUserMedia` requires a secure context. LAN http is not secure, so a real device cannot test local media paths. A tunnel would provide a secure origin, but not the deployed instance, and would also require changes to `NEXT_PUBLIC_SITE_URL` and Supabase's redirect list.

  F25 already has three blockers for this reason. Add these checks there rather than introducing a fourth environment. **The checks move; none is dropped.**
- **Add one audit spec using shared helpers. Leave the ten existing feature-specific 360px blocks in place.** Each protects its own feature against regression. F26 owns suite-wide consolidation, including the duplicated `joinAs` helper.

  The hit-area helper must **poll rather than measure once**. `animate-tile-in` uses `scale(0.96)`, making a freshly mounted tile's contents measure fractionally too small.
- **The safe-area padding added in F09 has never taken effect.** Without `viewport-fit=cover`, `env(safe-area-inset-*)` resolves to `0`. `src/app/layout.tsx` exports no `viewport`, so `room-experience.tsx`'s `pb-[env(safe-area-inset-bottom)]` is currently inert on every iOS device.

  Fix the `viewport` export; the CSS is already correct. **A desktop browser looks correct either way, so actual behaviour is confirmed only at F25.**
- **Omit `maximumScale` and `userScalable: false` from the export.** Next documents them, but disabling pinch-zoom would reduce accessibility and mobile usability. Also omit `colorScheme`: `globals.css` already declares `color-scheme: dark`, and `CLAUDE.md` forbids duplicating a specific value across files.
- **Measure landscape before changing its layout.** The call already uses a `min-h-0` flex column and may fit 740×360 without changes. Add a short-viewport treatment only if measurements show it is needed. Extra layout work competes with WebRTC encoding on the same thread.
- **Measure the Home bundle, make local improvements, and record what remains.** `code-standards.md` → Performance requires a reason when a target cannot be met, rather than silently lowering it. Moving Google sign-in to a route handler to get below 200 kB would rewrite the OAuth/PKCE and chat-key-stash paths settled in F04 and F17, beyond a mobile pass.

  Motion is not the source of the weight: `animejs` is not installed. Home's comment in `globals.css` explains why.
- **Use `interactiveWidget: 'resizes-content'` for the Android part of the soft-keyboard fix, while recording its limitation.** It shrinks the layout viewport on Android Chrome. iOS Safari ignores it and may need a `visualViewport` treatment. Add the single, unambiguous field now; leave the iOS part as an F25 follow-up to test with a device.

**Verify:** Run the sweep spec at all seven widths plus landscape. First break
one width's expectation and **observe the test failing** before trusting it, as
`constraints.md` → Testing requires for every new regression test.

Confirm `viewport-fit=cover` by grepping the meta tag from a production server's
HTML, rather than inspecting the source that emits it. Before and after each Home
bundle improvement, sum the gzipped chunks requested from `npm run start`, using
the same method that produced the 341 kB measurement. Then run the four gates.

**Leave these six checks unclaimed here and record them in Follow-ups against F25:**

- Safe-area insets render correctly on a notched phone.
- Audio starts after the Join gesture on iOS Safari.
- Device pickers display real labels on mobile.
- A real desktop share reaches a real phone.
- The composer clears a real soft keyboard.
- Performance targets hold on the deployed instance.

All six need hardware or a URL that does not yet exist. Devtools emulation cannot
verify them.

### 23 Connection quality and recovery

**UI:**

- Per-tile connection-quality indicator
- Room-level banner while reconnecting
- Terminal disconnect state offering rejoin or return Home

**Logic:**

- Subscribe to LiveKit connection-quality and connection-state changes
- Preserve mic/camera intent across a reconnect so a muted user does not come back unmuted

**Decisions taken before building:**

- **Distinguish deliberate leave from a dropped call with `DisconnectReason`.** Do not add a separate flag. Currently every `onDisconnected` pushes Home, making a dropped call look like Leave. Keep Home navigation for `CLIENT_INITIATED`; show the terminal notice for every other reason, with copy appropriate to that reason.

  **Compare reasons explicitly.** The parameter is optional, and `UNKNOWN_REASON` is `0`. A `if (!reason)` guard would wrongly treat the most common unknown drop as deliberate leave.
- **Show a neutral quality marker only for degraded connections.** Append `· weak` or `· connection lost` to the existing tile label row, like `· pinned`, without colour.

  This resolves a conflict between context docs. `architecture.md` reserves `signal` red for Leave and your own muted mic, while `code-standards.md` → Colour discipline offered `green-1`/`yellow-1`/`red-1` for quality, and `signal` is `red-1`. Follow the invariant and correct the colour-discipline line. Keeping red to two meanings matters more than a faster-reading dot, and twelve coloured dots would add the noise that the invariant is meant to prevent.
- **Do not mark `Unknown` as degraded.** It is the state before the first quality report, so treating it as bad would immediately mark every mounted tile. Show a marker only for `Poor` and `Lost`.

  The installed `ConnectionQuality` has **five** members, including `Lost`. Context7's published docs list four and omit `Lost`, even though this feature needs it. Use the installed types as the authority.
- **Keep the banner inside `CallStatus`.** One component must describe the connection state. A second overlay could disagree and would cover faces just when people need to see them.
- **Prioritise reconnecting over screen sharing in the strip.** `CallStatus` currently returns its sharing branch first, hiding a reconnect that occurs during a share. Fix that existing bug so the more urgent state appears.
- **Test whether mic/camera restoration is needed before implementing it.** The plan assumes LiveKit loses mute intent on reconnect, but that has not been checked. If the SDK preserves it, add no restoration code. Reapplying state unnecessarily could race the SDK's restore, with the failure appearing only on a flaky real network.
- **Reload to rejoin instead of returning to the lobby in place.** `stopPreview()` advances the acquisition generations, and acquisition runs only on mount. Returning to `phase: 'lobby'` would therefore show a permanently dead preview.

  A new restart path would have to navigate the most intricate hook's generations, cancellation, double-invoke guards, and risk of leaked camera tracks. A reload preserves `#k=`, repeats the server-side meeting lookup, and acquires media through the normal first-visit path.

**Verify:** Unit-test the reason-to-copy mapping for all **seventeen**
`DisconnectReason` members plus `undefined`, so an overlooked value fails a test
instead of leaving a blank panel. The plan originally said thirteen because the
last four members were below the window used to read the type file. The first test
run caught that omission.

Test the quality predicate for all five `ConnectionQuality` values, including
`Unknown` producing no marker. E2E must show the banner appearing and clearing
through an offline/online cycle, and a reconnect during sharing being visible.
That sharing check fails on the current code. Assert mic state across a reconnect;
the result decides whether restoration code is needed.

**Do not claim real-network verification of the marker or banner.** Playwright's
offline toggle is binary, while real degradation is gradual. The suite can assert
how `Poor` renders but cannot naturally produce it. Add that check to F25's
real-device work.

If reaching terminal disconnect by waiting through LiveKit's retry budget is
impractically slow, record it as manually verified instead of claiming automated
coverage.

### 24 Error and edge states

**UI:**

- `not-found.tsx` for a malformed or unknown room code
- Root `error.tsx` with a recovery action
- Loading skeletons for the history page and the room shell
- Consistent toast styling for transient failures

**Logic:**

- Room-code validation on the server before rendering the room
- Friendly copy for token failure, room-full, and permission-denied
- Confirm no user-facing message leaks an error code, provider name, or stack trace

**Decisions taken before building:**

- **Keep the F07 work rather than rebuilding two of the bullets above.** `not-found.tsx` already handles malformed and unknown codes without distinguishing them, and `page.tsx` validates shape before querying. F09's `JoinFailureNotice` already provides friendly join-failure copy. The remaining work is the error boundary, loading skeletons, and checks; the original feature scope includes work already done.
- **Do not add a toast system; correct `architecture.md`.** Each transient failure already has feedback where it occurs: the copy button's failed state, a chat message marked *not sent*, lobby media notices, `JoinFailureNotice`, and the sign-in alert. Toasts would give those failures a second place for feedback that could drift apart.

  `architecture.md`'s anticipated shadcn `toast` primitive was never built. Correct that stale entry instead of adding `sonner`, which is also absent from the approved dependency list.
- **Add loading skeletons at route level, outside the call.** `/room/[code]` waits for a meeting lookup and profile lookup, while `/history` waits for two queries. On a cold instance, those waits are the blank periods people see. `CallStatus` already owns the in-call connecting state; F23 kept it in one component to prevent conflicting connection feedback.
- **Automate the leak check in all three places where copy lives.** Unit-test pure modules. Test API routes' error bodies end to end, because their user-facing `message` goes to the client verbatim. Add e2e checks for rendered surfaces the suite can reach. A one-time copy review would not catch an edit six months later.
- **Move media-failure copy into a pure module.** It currently lives as a `Record` in `media-state-notice.tsx`, and the suite cannot reach three of its five states. The map must be importable for a unit test to cover those states. Follow the existing split used for `disconnect-reason.ts`.
- **Gate sharing on `Connected`.** During the one-to-three-second handshake after Join, publishing sends the share into a room that is not ready. It is immediately unpublished without feedback, at exactly the time someone may press Share.
- **Limit the empty-room share investigation and produce evidence rather than promise a fix.** Its mechanism has been unknown since F13. In F24, measure the failure rate over repeated solo publishes instead of relying on "roughly half the time". Capture `livekit-client` debug logs across publish→unpublish to establish whether the server or client initiates the unpublish. Re-test `dynacast: false` rigorously; the existing note rules it out without describing the test.

  Finish with either a named mechanism or a characterised reproduction in `constraints.md`. **File nothing upstream without explicit approval.**

**Verify:** Make a component throw, observe `error.tsx` catching it, and use
`reset()` to recover. Reading the boundary source is insufficient. Delay each
route's data request to verify its skeleton.

Run the forbidden-pattern leak checks against every API error body and all five
`MediaFailure` states. Unit tests cover the three states the suite cannot reach.
Give the share gate and jump-to-latest an e2e test each, and observe each test
failing before trusting it.

**Do not claim the empty-room unpublish is fixed.** It is LiveKit behaviour inside
LiveKit's SFU. This feature delivers a characterised reproduction and a decision,
which may be "accept and document".

---

## Phase 7 — Ship

### 25 Render deployment

**Logic:**

- Define the Node web service on Render's **free** plan in `render.yaml`, including build/start commands and every env var with `sync: false`. Include all four `NEXT_PUBLIC_*` values: although public, they must exist at build time
- Use `engines.node` in `package.json` for the minimum version and `NODE_VERSION` in `render.yaml` for the exact build version. Pinning Node makes deployments reproducible
- Add `/healthz` for **liveness only**, without reading any dependency. This intentionally differs from Render's advice. A free Supabase project pauses after ~7 days idle; a readiness check would cause a restart loop that cannot unpause it
- **Leave `healthCheckPath` unset in `render.yaml`, with its line commented in place.** Render says free instances spin down after 15 minutes without "any inbound traffic", but does not say whether its own health checks count. If they count, enabling one would accidentally add the keep-alive pinger rejected by `constraints.md` → Hosting.

  **Do not add an external Render pinger either.** The later direct-to-Supabase exception belongs in that constraint and does not change this deployment feature
- Use `startCommand: npm run start` without `--port`. The installed Next 16 CLI reference documents `env: PORT` for `--port`; hostname defaults to `0.0.0.0`
- Rewrite the README: its Status and Running sections both claimed the app was unbuilt. Put the cold-start disclosure above the demo link
- Set `NEXT_PUBLIC_SITE_URL` to the deployed origin **before the first build**. The compiler inlines it, and Zod parses it at import, so leaving it absent fails the build
- Add the deployed origin to Supabase's allowed redirect URLs and to the Google OAuth client
- Disable Supabase's email/password provider if it is enabled. `architecture.md` allows only Google sign-in, and the code does not enforce that restriction
- Set the LiveKit webhook to the deployed `/api/livekit/webhook`. This is the first verification of F20 with real traffic
- Add a first-deploy checklist to the README, separating configuration steps from verification checks

**Verify:** On the deployed URL, sign in, create a meeting, and complete a call
between two devices from beginning to end.

Verify the deployment files locally: compare `render.yaml` env keys with
`.env.example`, curl `/healthz` on a production `next start` using `$PORT`, and
assert the proxy exclusion in `tests/unit/proxy-matcher.test.ts`. Checks requiring
the deployed origin, four dashboards, or real phones belong in the checklist;
they are not automated tests.

### 26 End-to-end test suite

**The original requirements were completed feature by feature.** Keep them
recorded as done rather than rebuilding them: guest joins via link, lobby toggles
carry into the call, two contexts see each other, chat round-trips between two
contexts, and a link without `#k=` disables chat. Each already has a spec, and
every two-participant test already uses separate browser contexts.

F26 therefore strengthens the suite, as follow-ups have assigned to it since F08.

**Logic:**

- **Give `joinAs` one home.** It is copied into **12** specs in **7** variants; the follow-up saying "eight, now identical" was wrong on both counts. The variants differ on two points: an optional `hash`, and waiting for either `Connected` or the control bar to mount. Default `until` to `connected`, the stronger condition. Pass `mounted` for the three specs that currently wait for Leave, preserving every spec's behaviour
- **Reach all three media failure states through a stub and keep one Playwright project.** The previously planned second project without `--use-fake-ui-for-media-stream` was intended to test *denied* and *no-device* directly, with only *in-use* stubbed. Seven flag/permission combinations measured at `7.26.3` showed that this cannot work:

  - `--use-fake-ui-for-media-stream` auto-grants and **overrides Playwright's context permissions**, preventing denial while the flag is present.
  - Without it, bundled headless Chromium rejects all capture with `NotSupportedError`, which is none of the intended states.
  - Keeping it while removing `--use-fake-device-for-media-stream` still synthesizes a device.
  - No real Chrome is installed as a fallback.

  Use `stubMediaFailure` to reject with a real `DOMException` for each state. The suite then proves that each rejection reaches the correct copy. It does **not** prove that the browser produces that rejection; never claim it does
- **Do not claim a test forces a full LiveKit restart.** The earlier requirement expected a test to distinguish a restart from a resume using the peer-connection recorder in `support/reconnect.ts`: a restart creates new connections; a resume creates none. Building that recorder disproved the premise.

  `context.setOffline` produces `SignalReconnectError`. The catch in `attemptReconnect` explicitly excludes that error from causing a full reconnect on the next attempt, so it keeps retrying *resume*. At 10s, 20s, 30s, and 45s offline, the recorder measured zero new peer connections. Playwright cannot reach the only three paths that set `fullReconnectOnNext`. Calling `room.simulateScenario('node-failure')` would require a test-only path in production code.

  **The suite cannot reach `republishAllTracks`.** Settle mic behaviour across a full restart by reading livekit-client, the best available evidence, rather than reopening the gap. Keep the recorder so a future reconnect test cannot pass by exercising only resume and proving nothing
- Timebox diagnosis of the intermittent `/api/meetings` 500. Capture the handler's own `[api/meetings]` log from a failing run; that has never been seen. Add a retry only if the timebox expires, recording the causes ruled out
- Retry spec-side Supabase reads on transport errors, mirroring `createMeeting`
- Measure the reconnect-banner flake before changing its timeout. Increasing it without diagnosis could hide the cause
- Confirm the F08/F24 duplicate-track flake is closed by the lobby-leak fix
- Wire `npm run test:e2e` into the documented pre-deploy checklist

**Verify:** Run the full E2E suite, `npm run test`, `lint`, and `typecheck` with
all passing. Each previously flaky spec must pass 40 consecutive runs; fewer runs
are insufficient evidence.

Two verification clauses were removed because testing disproved their premises.
"Across both projects" assumed a second Playwright project that the measurements
show cannot exist. "The full-restart test seen to fail when pointed at a resume"
assumed a test that cannot be written from Playwright. The revised requirements
above retain the measurements and explain both changes.

Run every check against a **production build** with `retries: 0`. `next dev`
starves outbound connections under parallel load, while `CI=true` sets
`retries: 2`. Either condition could produce a green result that does not prove
what this verification requires.

---

## Feature Count

| Phase | Features |
| ----- | -------- |
| Phase 0 — Foundation | 3 |
| Phase 1 — Identity and entry | 3 |
| Phase 2 — Lobby | 3 |
| Phase 3 — The call | 7 |
| Phase 4 — Encrypted chat | 3 |
| Phase 5 — Call history | 2 |
| Phase 6 — Mobile and resilience | 3 |
| Phase 7 — Ship | 2 |
| **Total** | **26** |
