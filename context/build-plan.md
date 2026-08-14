# Build Plan

> **Role:** The ordered plan — phases and numbered features to build, in sequence.
> **Read before starting a feature**; build one feature fully before the next.
> **Relates to:** features come from `project-overview.md`; status tracked in `progress-tracker.md`.

## Core Principle

Build the visible surface first against mock data, then wire the real logic behind
it, and verify every step in a browser before moving on. A feature is not done when
the code compiles — it is done when you have opened it, exercised it, and watched it
work, including at a 360px viewport.

Two consequences specific to this project. First, media and encryption are hostile
to "wire it up and see": permission denials, absent devices, dropped connections, and
missing keys are ordinary states, so each one gets deliberate UI in the same feature
that introduces the happy path, never in a cleanup pass afterwards. Second, anything
involving two participants must be verified with two participants — two browser
profiles, or a phone and a laptop. A call that works when you are alone in it has not
been tested.

---

## Phase 0 — Foundation

### 01 Project scaffold and tooling

Stand up the Next.js application with every quality gate wired before any feature
code exists.

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

Port the VideoCircle design system into the app so no later feature has an excuse
to hardcode a value. Read `context/Design/README.md` in full before starting.

**UI:**

- App shell on warm near-black, rendered by a `(shell)` route group so `/room/[code]` cannot inherit it: header with the VideoCircle wordmark, sign-in slot, content region
- Footer with the author byline and links — Source, LinkedIn, Email, Portfolio — as wide-tracked caps with dot separators, per `context/Design/preview/footer.html`. Rendered on Home and Call History only; **never inside the call**, where it would break the fixed-strip layout
- The signature grid backdrop as a reusable `.grid-backdrop` surface, bleeding past its container
- A tokens preview route (development only) showing every surface step, text step, radius, easing, and interaction state side by side with `context/Design/preview/*.html`

**Logic:**

- `globals.css`: `:root` mirroring `context/Design/colors_and_type.css`, plus the `@theme inline` mapping to utility names and the shadcn token aliases
- JetBrains Mono wired through `next/font/google` with the `--font-jetbrains-mono` variable
- `prefers-reduced-motion` reset block
- Copy `context/Design/assets/mark.svg` into `public/brand/` for the favicon and OG tile. The wordmark renders as live text, not an image — see `context/Design/preview/logo.html`
- Wire `context/Design/_adherence.eslint.mjs` into `eslint.config.mjs` (`_verify.mjs` is already in the `lint` script from feature 01)
- Install `button` and restyle it to the kit — whisper borders, kit radii, drop shadows stripped, `dark:` variants removed, every size at the 44px hit-area floor. Dialog, sheet, dropdown-menu, tooltip, input, avatar, and sonner are added by the feature that first mounts them, per `code-standards.md` → Dependencies
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

**Verify:** No outstanding RLS or security findings — via `get_advisors` if the
Supabase MCP server is available, otherwise by reviewing each policy directly. Then
confirm empirically: a query as user A returns nothing belonging to user B, and
selecting from `meeting_participants` as an authenticated user does not error with
infinite recursion.

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

**Prerequisites, outside the codebase.** Nothing here can be verified until all three
exist: a Google Cloud OAuth 2.0 *Web application* client whose authorized redirect URI
is `https://<project-ref>.supabase.co/auth/v1/callback` — Supabase's callback, not
ours; the Google provider enabled in Supabase with that client's ID and secret; and
`http://localhost:3000/auth/callback` added to Supabase's Redirect URLs, joined by the
Render URL at F25.

**Decisions, agreed before building:**

- **Auth state is read server-side in `(shell)/layout.tsx`** and passed into the header's existing `actions` slot, so the header stays auth-ignorant and there is no flash of a signed-out header. This makes Home dynamic rather than static — already true of the app generally, since session cookies are read on every request.
- **The display name comes from `profiles`, never `user_metadata`.** One derivation of a display name — the trigger's `coalesce` chain — so the header cannot disagree with call history. `user_metadata` is also user-editable and must never reach an authorization decision.
- **The avatar is a typographic initial, not the Google photo.** The brand is type and geometry, and it avoids a `remotePatterns` entry, a per-render request from the visitor to googleusercontent.com, and a dead-URL fallback. `profiles.avatar_url` is still stored.
- **Both halves of the chat-key `sessionStorage` stash ship here**, in `src/lib/auth/sign-in.ts`, even though no URL carries a `#k=` fragment until F06. The restore *call site* is F17's; the helper exists now because a lost fragment fails silently and reopening the sign-in path later is how it gets forgotten.
- **`/auth/signout` is POST-only**, submitted from a form and answered with a 303. A GET signout is reachable by `next/link` prefetch and by any third-party image tag.
- **Redirects resolve against `NEXT_PUBLIC_SITE_URL`, not the request origin.** Render terminates TLS at a proxy, so `new URL(request.url).origin` is not reliably the public origin, and `X-Forwarded-Host` is caller-controlled. The env value is already the canonical origin for exactly this purpose.
- **`safeNext` is its own module** so Vitest can cover it — the config is `environment: 'node'` over `tests/unit/**`, so only pure functions are unit-testable.
- **These two route handlers redirect rather than returning `apiOk`/`apiError`**, which is correct for a browser-navigated OAuth endpoint. The invariant is about the JSON API surface and is scoped to `src/app/api/` in `architecture.md`.

**Verify:** Sign in, reload, close and reopen the tab — the session survives. Sign out
clears it. `/auth/callback?code=bogus` lands on Home with a readable notice. `curl -i`
on `/auth/signout` is not a 303. `profiles.display_name` after a real sign-in holds a
real name, confirming the trigger's `coalesce` against Google's actual payload — which
F03 deferred to here.

### 05 Home page

> **The visual surface landed early, during feature 02** — hero, mock call
> preview, how-it-works, and feature grid, per the Core Principle of building the
> visible surface before the logic. The header's two auth variants landed in F04.
> What remains here is the join-by-code path.

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

- **Only the join path is wired.** The note above originally said "the two hero controls", which contradicted F06's own Logic list: `START A MEETING` needs `generateRoomCode`, a Web Crypto chat key, and `POST /api/meetings`, all three F06's. It stays inert until then, and F06 keeps its shape.
- **The form replaces `JOIN AS GUEST` inline in the hero.** Once the input is on screen, a button whose job is to reveal it is a click toward something already visible. Two entry points, both immediate, and no dialog primitive to add and restyle.
- **`src/lib/room-code.ts` lands whole, here rather than in F06**, with the shape/alphabet/collision tests F06's verify asks for. `architecture.md` defines it as one canonical block; splitting it across two features means editing the file twice and reviewing the 32-character alphabet reasoning twice. `generateRoomCode` is unused for exactly one feature.
- **Navigating lands on a 404 until Phase 2, and that is the pass condition.** What this feature owns is the parse and the push; the URL bar — including the surviving fragment — is the observable.
- **Parsing is permissive about origin, strict about the code.** Any string with a path segment matching `ROOM_CODE_PATTERN` yields that code, so a link pasted from the deployed site while running locally, or one carrying tracking parameters, still works. Input is trimmed and lowercased first: the alphabet is lowercase-only, and a code capitalised by an email client is not a malformed code.
- **The fragment is opaque here.** Carried byte-for-byte from the pasted string to the destination URL, never parsed, decoded, logged, or validated — F17 owns reading it.
- **Validation runs on submit, not on keystroke**, and typing clears a showing error, so the message can never contradict what is currently in the field.

**Verify:** Unit tests for room-code shape, alphabet, and collision-freeness over a
large sample, and for every input shape the parser accepts. In a browser: a bare code
and a pasted link both navigate, a link ending `#k=TESTKEY` arrives with the fragment
byte-identical, a code containing the forbidden `i` does not navigate, and submitting
fires no network request at all.

### 06 Create meeting and share link

**UI:**

- Post-create confirmation showing the full share link with a copy button and a "link includes the chat key" note
- A quiet line beneath the share link noting a first visit after an idle spell may take about a minute to load — honest about the free-tier cold start rather than letting the recipient meet a blank page
- The "link includes the chat key" note also warns against shortening the link: a shortener drops the `#k=` fragment and silently costs the recipient chat
- Copy confirmation toast

**Logic:**

- `src/lib/crypto/base64url.ts` and `chat-key.ts` — generate, export, import, read-from-hash
- `POST /api/meetings` generating the code, inserting the meeting row via `supabaseAdmin`, and recording `created_by` when signed in
- On a unique-violation (`23505`) on `code`, regenerate and retry once, then return `409`
- Navigate to `/room/[code]#k=<key>`

**Decisions, agreed before building:**

- **The server is the only room-code generator.** The client POSTs an empty body and trusts the returned code. The collision retry already regenerates server-side, so a client navigating to the code *it* sent would land on the wrong room — a bug that surfaces only on a collision, which is to say almost never, which is to say it would ship. `architecture.md`'s creation flow was corrected to match.
- **The share panel replaces the hero's action area on Home**, rather than the user being pushed straight to the room. It is the only place this feature's UI can live, since `/room/[code]` does not exist until Phase 2 — and it matches the product, where the link is the deliverable. `JOIN NOW` is what finally navigates.
- **Copy confirms inline on the button, not with a toast.** shadcn's toast is now `sonner`, which is not on `code-standards.md`'s approved list; a browser-bundle dependency is not worth one confirmation that belongs on the control anyway.
- **`expires_at` comes from the column default, never the insert payload.** The 24-hour window is declared once in the migration and read by `/api/token` and the sweep; writing it again in application code would put the same literal in two places, free to drift.
- **The exported key lives in client-only `useState`** and never crosses a Server Component boundary as a prop — `library-docs.md` → Web Crypto forbids copying it into state that could be serialized. It is generated, exported once, and the `CryptoKey` itself discarded: this feature never encrypts anything.
- **This is the first feature to import `supabaseAdmin`**, and therefore the first that needs `SUPABASE_SERVICE_ROLE_KEY`. `env.server.ts` parses at module load, so a blank key throws on import rather than at request time.

**Verify:** The created code appears in Postgres with `created_by` null for a guest and
set when signed in, `expires_at` about 24 hours out. The request body is `{}` and the
response is `{ code }` — no key material in either, and none in the server log. Copy
yields exactly `${NEXT_PUBLIC_SITE_URL}/room/<code>#k=<key>`, and `JOIN NOW` arrives
with that fragment intact. Room-code shape, alphabet, and collision tests landed with
the module in F05.

---

## Phase 2 — Lobby

### 07 Media permissions and self-preview

**UI:**

- Live self-preview video, mirrored, letterboxed with `object-contain` so any aspect ratio fits
- Requesting state while the browser decides
- Permission-denied state with instructions to re-enable
- No-camera-found, no-microphone-found, device-in-use, and unresponsive-device states
- A failed device never dead-ends the page. **No Join control here** — it belongs to F08, so "a path to join anyway" means the lobby stays usable, not that a button ships

**Logic:**

- The page resolves the code server-side before the lobby mounts: shape, then existence via `findMeetingByCode`, `notFound()` on either. Joinability stays with F09 — a meeting can close while someone sits in the lobby
- `createLocalTracks` for the preview, attached to a video element
- Track cleanup on unmount, including tracks that arrive after their request was abandoned
- Discriminated-union state: `requesting | ready | denied | no-device | in-use | timeout | error`
- `ready` carries partial success — a working microphone and a dead webcam is ready, with `cameraFailure` set
- Acquisition strategy depends on whether a permission prompt can still appear: **granted** → both devices requested separately and in parallel, each timed, so a hung microphone costs nothing; **not yet decided** → one combined untimed request, so there is a single prompt and the person answers at their own pace

**Two things the build changed from this entry, and why:**

- **`idle` was dropped from the union.** The hook requests on mount, so no mounted lobby is ever not-yet-requesting. It was also unbuildable: ESLint's `react-hooks/set-state-in-effect` rejects the synchronous `setState` that moving out of `idle` required.
- **`timeout` was added.** `getUserMedia` can hang instead of rejecting — reproduced on the development machine, where audio never returned while the camera opened normally. Without it the lobby waits forever, which is the one thing a failure path must not do.

**Verify:** Automated — a real code renders a live preview, an unknown and a malformed code both 404, only one live track exists per device, and the lobby has no horizontal overflow at 360px. Manual, in a real browser — block the camera in site settings and confirm the denied state renders with usable instructions; the fake-device flags auto-grant, so this path cannot be reached from the E2E suite as configured.

### 08 Lobby controls

**UI:**

- Mic and camera toggles with unmistakable on/off states and `aria-pressed`. The engaged state is the kit's white fill; a muted **own** microphone is one of only two sanctioned uses of `signal`
- Camera and microphone pickers listing real device labels
- Display-name field — prefilled from `profiles` server-side for signed-in users, editable, required for guests
- Copy-invite-link secondary action
- Full-height `dvh` layout, controls bottom-weighted so they stay in one-handed reach

**Logic:**

- **Off releases the device; it never mutes.** A preview reading OFF while the camera light stays lit destroys trust, and a muted track makes `setDeviceId` defer silently
- Enumeration through `Room.getLocalDevices(kind, false)` — the `false` matters, or the SDK raises a second permission prompt. Runs only once permission is known, because labels are empty before that
- Switching while on calls `track.setDeviceId()`, which restarts capture in place; switching while off just records the choice for the next acquire
- Preferences persisted to `localStorage` and Zod-validated on read, since storage is user-editable. Honoured *before* any device is touched, so leaving with the camera off means it is not opened on the way back in
- A remembered device that has since vanished falls back to the system default: the stored id is passed as a bare `deviceId`, an ideal constraint rather than `{exact}`
- Name validation against `MAX_DISPLAY_NAME_LENGTH`

**Three things the build changed from this entry, and why:**

- **No Join control.** Minting a token and connecting are both F09, and a primary action that does nothing when pressed reads as broken. Same call as F07's, kept consistent.
- **The speaker picker moved out.** Nothing in the lobby plays remote audio, so the control could not be verified here and would silently do nothing on Firefox and iOS, which cannot honour `setSinkId`. It belongs with the in-call device controls.
- **`SectionOverline` moved to `src/components/ui/`, and the clipboard logic became `useCopyToClipboard`.** The lobby is the third surface needing the overline and the second needing clipboard handling, including its hang timeout. Duplicating either would have been the drift `code-standards.md` warns about.

**Verify:** Automated — camera off drops live tracks to **zero** (a mute would still read as one, which is the point), on again returns to exactly one, the picker lists a labelled device, switching keeps the same document, preferences survive a reload, the name caps at the shared maximum, and every control clears 44px at 360px. Manual — the microphone equivalents, since audio capture hangs on the development machine.

### 09 Join handoff

**UI:**

- "Join now" in the lobby, disabled only while the trimmed name is empty — never on a failed device, since joining anyway is the point of feature 07's states
- Distinct states for "meeting does not exist", "meeting has ended", and "link expired". Each explains what happened and offers to start a new meeting, because a retry cannot help
- Token-failure state that returns to the lobby with a retry, never a blank screen
- A minimal connected state: connection status, headcount, and Leave

**Logic:**

- `POST /api/token` — Zod body, then **meeting-state check before minting**: 404 unknown, 410 ended, 410 expired
- `getUser()`, identity resolution (`user:<uuid>` / `guest:<uuid>`, generated server-side and never accepted from the client), `mintAccessToken`
- `src/lib/livekit/token.ts` with the `min(1h, expires_at − now)` TTL cap and a single-room grant carrying no admin claims
- `src/lib/env.livekit.server.ts` parsing `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. They were dropped from `env.server.ts` in F06, because one shared secret schema made `/api/meetings` fail to build over credentials it never uses
- **Preview tracks are released before connecting**, not after. A live preview track holds the camera the room is about to ask for
- `<LiveKitRoom>` carries the lobby's mic/camera state and device ids. Its `options` object **must be memoised**: the component re-creates its `Room` whenever that object's identity changes, so a fresh literal per render reconnects continuously and looks like a network fault
- The joinability decision and the TTL cap live in pure modules free of `server-only`, so every branch is testable without a database or the LiveKit secrets

**Verify:** `POST /api/token` with a well-formed code that was never created returns
404 **with nothing token-shaped in the body** — a valid-looking code must not be
enough to get into a room. Decode the returned JWT and confirm the grant names
exactly one room, sets `roomJoin`, and carries no `roomAdmin`, `roomCreate`, or
`roomList`. Then join for real against LiveKit Cloud and leave again.

---

## Phase 3 — The call

### 10 Room connection and video grid

**UI:**

- Participant tiles with video, display name, and a muted indicator
- Camera-off tiles showing initials on `bg-raised` — never a generated avatar
- Grid reflowing by headcount from 1 to `MAX_VISIBLE_TILES`
- Connecting, reconnecting, and disconnected states
- Single-column stack on phones, grid from `sm:` up
- The local participant is the first tile, mirrored, labelled `YOU`. Mirroring is local-only, as in the lobby preview — a self-view is a mirror, a remote tile is not

**Logic:**

- `<LiveKitRoom>` shell with `<RoomAudioRenderer />`
- `useTracks` with `withPlaceholder: true` on the camera source
- `RoomEvent` handling for `Reconnecting`, `Reconnected`, and `Disconnected`
- **Our own grid and tile, on the unstyled primitives** — `useTracks`, `VideoTrack`, `useIsSpeaking`, `useIsMuted`, `useVisualStableUpdate`. `GridLayout` renders `lk-grid-layout` and lays out nothing without `@livekit/components-styles`, which is not an approved dependency, and `ParticipantTile` ships a name chip, mute icon, quality dot and focus button that each contradict `Design/README.md` → Participant tiles. Adopting them would mean a new dependency plus overriding its CSS everywhere the brand differs
- **Reflow is pure CSS keyed to headcount**, not a measured container. A lookup maps participant count to whole static Tailwind class strings per breakpoint — never interpolated, or the compiler never emits them. No `ResizeObserver` competing with WebRTC encoding, and the mapping is unit-testable without a browser
- **Above `MAX_VISIBLE_TILES`, speakers are promoted and the rest are counted.** `useVisualStableUpdate` keeps whoever is talking on the visible page; a `+N MORE` overline states what is hidden. No pager controls — the product is sized for ~12. Audio is unaffected: `RoomAudioRenderer` plays every remote whether or not they hold a tile
- **Camera-off is a placeholder ref _or_ a muted publication**, and the tile does not distinguish them to the viewer. `isTrackReference` separates the two internally
- A temporary Leave lives in the status strip until feature 11 lands the control bar. A call surface a person cannot leave strands the meeting's `room_finished` bookkeeping behind a timeout
- Colour follows `Design/README.md` → Colour in a call: your own muted mic is red, a remote's is `--fg-3`, speaking is a white ring. Nothing else in the grid is coloured

**Verify:** Two browser contexts join one code and each sees two tiles carrying the
other's name — automated in `tests/e2e/call-grid.spec.ts`, since a call that works
alone has not been tested. Unit tests cover the column mapping across counts 1–13
and the visible/overflow split. `context.setOffline(true)` then `false` shows the
reconnecting strip while the tile DOM node persists and Leave stays enabled — the
room tree must never unmount on a transient disconnect. Audio between two real
participants is confirmed by hand, being the one claim no assertion reaches.

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
- **The full bar ships now, with the four unbuilt controls in the kit's disabled state** — `rgba(255,255,255,.03)` ground, `--fg-4` glyph, `aria-disabled`. F12, F14, F15 and F19 each remove one flag and wire one handler. The known cost: MORE opens to three disabled rows until F14 lands
- **Screen share is absent until F12, not disabled.** The specimen's rule is that an unavailable *capability* is absent, and it is already absent on every phone — so if the control is on the bar, your device can share. Two meanings for absence would cost that rule its clarity
- **Camera-off is neutral; only your muted mic is red.** `Design/README.md` → Colour in a call and the `control-states.html` note both said "mic *or camera*", contradicting `DeviceToggle`, which has passed `signalWhenOff` for the mic alone since F08. The docs were corrected to match the code — off-camera is not a warning
- **Leave confirms in place**, widening to `LEAVE?` rather than opening a modal over the people you are deciding whether to leave. Reverts on a timeout or when another control is pressed. Leaving is recoverable: the same link rejoins
- **The responsive collapse is CSS, not a media-query hook.** Secondary controls are defined once and rendered twice — inline at `sm:` and up, inside the MORE dropdown below it — so there is no measurement inside the call tree and no SSR mismatch. MORE reuses the `dropdown-menu` restyled at F04; the specimen's own trigger declares `aria-haspopup="menu"`, which is the dropdown contract rather than the sheet one

**Verify:** Pressing camera off drops live video tracks to **zero**, not to a muted
track, and the other participant's tile switches to initials — proven with two
contexts. `d` and `e` toggle from the keyboard; the typing guard is unit-tested
across inputs, contenteditable, modifiers and key repeat, since the composer that
would prove it end to end arrives at F19. Leave takes two presses and only the
second navigates. At 360px the bar keeps mic, camera, MORE and Leave, every
control clears 44px on both axes, and nothing overflows horizontally. The mic
toggle stays enabled and responsive while `setOffline` holds the room in
reconnecting.

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
- **We hold no sharing state of our own.** `useLocalParticipant`'s observer re-emits on `LocalTrackUnpublished`, so a share ended from Chrome's own "Stop sharing" bar updates `isScreenShareEnabled` without a listener here. A mirrored boolean is precisely the thing that would go stale, so the requirement is met by not having one
- **Share tiles sort ahead of every camera tile**, so the thing everyone is looking at can never be the one `MAX_VISIBLE_TILES` hides. One sort step, not a layout — F13 still owns spotlight, focus resolution and the filmstrip. Without it a share started in a nine-person call is invisible to everyone while its owner believes it is up
- **You see your own share tile**, like everyone else: one code path, and it is how the sharer catches the most common mistake, which is sharing the wrong window
- **A share tile suppresses three things the camera tile has** — the mirror (only a self-*camera* is a mirror), the mute dot and the speaking ring (both belong to the person, on their camera tile). Its label is the sharer's name plus `— SCREEN`
- **The control is gated on capability, never on width** (`code-standards.md` → Responsive), so it is absent on every phone and present inside MORE on a narrow desktop window. Absence keeps one meaning: your device cannot do this
- **`NotAllowedError` is a normal cancel**, not a fault: no toast, and never logged as an error. Since nothing is set optimistically, the bar returns to rest on its own

**Verify:** The suite stubs `getDisplayMedia` with a canvas-captured stream — that
replaces the browser's picker only, so LiveKit publishes a real track and the SFU
relays it and the remote assertions are genuine. It proves the capability gate in
both directions, the share tile reaching the other participant promoted to first
position, the banner and its stop, a dismissed picker changing nothing, and a
track stopped from outside our UI syncing without a reload. **A real desktop share
received on a real phone stays a manual check** — recorded as a follow-up rather
than claimed.

### 13 Speaker and spotlight view

**UI:**

- Layout switches to a large focused tile with a filmstrip when a screen share starts
- Manual pin/unpin on any participant
- Filmstrip scrolls horizontally on mobile, vertically on desktop
- Return to grid when the share ends and nothing is pinned

**Logic:**

- Focus resolution order: manual pin, then active screen share, then active speaker
- Active-speaker detection from LiveKit
- **Active speaker orders the filmstrip and drives the speaking ring; it never triggers spotlight.** The two bullets above cannot both hold literally — a layout that focuses whoever is speaking flips several times a minute in a four-way conversation, and "return to grid when the share ends and nothing is pinned" says grid is the resting state. Grid is entered and left only by a share or a pin
- **A pin whose participant has left is cleared**, falling to the share if one is running and otherwise back to grid. Keeping spotlight alive on the next speaker would leave a focused layout with nothing pinned and no obvious way out
- **Pins are stored as the tile key** (`identity:source`), never a participant object, so a stale pin cannot retain a departed participant
- **Two pin paths ship: the gesture and the menu.** Double-click or long-press on a tile, plus a per-tile Pin/Unpin menu that is the keyboard and screen-reader path. The menu button shows on hover or focus where a pointer is fine and is always visible where hover is not available — otherwise it is unreachable on exactly the devices that cannot hover. A hover tooltip names the gesture on desktop
- **The filmstrip excludes the focused tile only.** With Ada's screen focused, Ada's camera stays in the strip — you keep her face at the moment she is presenting and talking
- **`orderCallTiles` is unchanged from F12.** Spotlight consumes the same ordered, capped list, so the share-first sort is what makes a share the natural focus and nothing is unpicked

**Verify:** Two contexts prove a share switching the receiver's layout to one
focused tile plus a filmstrip and returning to grid when it stops; a double-click
pinning and unpinning; the menu pinning without a pointer gesture; and a pin
outranking a running share. Unit tests cover focus resolution, including a pinned
key whose participant has gone. At 360px in spotlight the page has no horizontal
overflow and every control in `main` clears 44px.

### 14 Participant list panel

**UI:**

- Panel listing every participant with name, mic state, camera state, and a "you" marker
- Live headcount in the control bar
- `Sheet` on mobile, inline side panel on desktop

**Logic:**

- Derive from LiveKit participant state; no separate data source
- Sort: local participant first, then join order
- **`lg:` is the sheet/inline boundary**, not `sm:` — it is where a side column has room to exist, and it is the breakpoint the spotlight filmstrip already switches on
- **The panel takes the right column, and the filmstrip falls back to horizontal while it is open.** One column of chrome at a time; two independently scrolling regions stacked in a narrow column are useless at 1024px, and the filmstrip's horizontal mode already exists
- **The headcount moves out of the status strip onto the participants control as a badge.** The number belongs beside the control that opens the list, and the strip needs its width at 360px for the sharing banner and connection state. `participant-count.tsx` is deleted rather than left unused, so two counts can never disagree
- **`openPanel` is a single value on `CallStage`** — `'participants' | null`, widening at F19. One value means one open panel, which is the only workable behaviour on a phone and stops two panels competing for the right column. F19 adds a variant, not a mechanism
- **Rows read mic and camera through `useIsMuted` per row**, as the tile does. Reading `participant.isMicrophoneEnabled` would depend on `useParticipants` re-rendering for events it does not promise, and LiveKit mutates publications in place — the defect class found in F11 and again in F13
- **No pinning from the list.** F13 deferred the question here; F14's bullets do not ask for it and the tile already offers pin by gesture and by menu

**Verify:** Two contexts prove the list naming both people, the `you` marker on the
local row only, and mic and camera state updating live without reopening the panel.
The badge counts 1 alone, 2 after a join, 1 again after a leave. At 360px the panel
is a dialog with no horizontal overflow and every control clearing 44px; at desktop
width it is an `aside` with no dialog role, and opening it turns the filmstrip
horizontal. Sorting is unit-tested.

### 15 Reactions and raise hand

Brand-native reactions, not emoji — the kit forbids emoji outright. Reactions are
wide-tracked CAPS chips plus the signature red-dot burst, built on the control-row
treatment in `context/Design/preview/control-states.html`.

**UI:**

- A fixed reaction set as CAPS chips: `NICE`, `+1`, `LOL`, `WOW`, `BRB`
- Chip row styled as the kit's ease-buttons — `rgba(255,255,255,.05)` at rest, `.1` on hover, inverted fill while sending
- A fired reaction rises over the sender's tile as its CAPS label with a red-dot burst behind it, easing on `ease-out-expo`, fading after `REACTION_TTL_MS`
- Raised hand shows a persistent badge on the tile and in the participant list, marked **neutrally, not with the red dot**. A tile already uses a red dot for *your own muted mic*; a second red dot meaning something else on the same tile is exactly what `architecture.md`'s red invariant exists to prevent. A raised hand is neither destructive nor a warning

**Logic:**

- Reaction payloads carry a label from the fixed set; unknown labels are dropped rather than rendered, so a malformed peer cannot inject arbitrary text over a tile
- Publish **reactions** over `DATA_TOPIC.REACTION` with `{ reliable: false }` — losing one costs nothing, which is what makes the unreliable channel right for them
- **Raise-hand rides a LiveKit participant attribute, not `DATA_TOPIC.HAND`.** A data channel cannot tell a late joiner about a hand raised before they arrived, and `reliable: false` can drop the packet outright, leaving a hand up on some screens and down on others — both failures silent. `setAttributes` is LiveKit's own durable per-participant state and syncs to everyone including late joiners; `useParticipantAttributes` reads it per participant, matching the rule that a tile subscribes to its own participant and nothing wider. `DATA_TOPIC.HAND` stays declared in `constants.ts` as part of the wire-protocol record, unused
- **This widens the token grant by exactly one claim, `canUpdateOwnMetadata`.** It is outside the forbidden set and only ever lets a client describe itself, but it is a real change to a security-relevant surface, so the grant spec asserts it explicitly alongside the three that must stay false
- Raise-hand is toggle state and clears on leave — attributes vanish with the participant, so nothing has to clean up
- Rate-limit reactions **on both sides**: a send-side throttle stops you flooding, a receive-side drop stops a peer flooding you. A peer is untrusted, so the send-side limit alone proves nothing
- **One control, one popover.** The bar stays at seven controls, which `code-standards.md` measures at 440px — an eighth cannot fit a phone at the 44px floor. The chips and the toggle sit inside it, kept visually distinct because one fires and the other persists
- **A React context carries reactions only**, keyed by identity, with each tile reading its own. Hands come from attributes per participant, so the provider stays small. Prop-drilling would thread through three components and re-render every memoised tile whenever anyone reacted
- CSS-only animation — this renders inside the call, where `animejs` is not permitted

**Verify:** Two contexts prove a reaction landing on the *sender's* tile and
expiring on its own without interaction, and a raised hand appearing as a badge on
both the tile and the participant row on both sides. A third context joining
*after* a hand goes up still sees it — the case the data channel cannot serve, and
the reason for the transport change. The validator and the rate limiter are
unit-tested; publishing a malformed payload end to end would need a handle on the
room that production code does not expose, so that gap is stated rather than faked.
The grant spec pins `canUpdateOwnMetadata` true and the three admin claims false.

### 16 Copy invite link in call

**UI:**

- Invite control in the control bar opening a dialog with the full link
- Copy button with confirmation
- Explicit note that the link carries the chat key

**Logic:**

- Reconstruct the link from `NEXT_PUBLIC_SITE_URL`, the code, and the current fragment
- Clipboard fallback (select-and-copy) for browsers that block `navigator.clipboard`
- **A centred `dialog`, not the sheet or the popover.** A sheet reads as ongoing content rather than a short thing you act on and dismiss, and an anchored popover has nowhere to go at 360px
- **The link sits in a read-only input, selected on focus.** `navigator.clipboard.writeText` has been seen in this project hanging on a trusted click in a secure context with permission granted, which is why `use-copy-to-clipboard` already races it against a timeout. When that path fails a selected field is one keystroke away; telling someone to find the address bar mid-call on a phone is not a fallback
- **Two states, two notes.** With a key, the note says the link carries it and anyone holding it can read chat. Without one, it says plainly that this link gives no chat access — otherwise someone who arrived through a stripped link passes the same broken link on, and nothing about the call looks wrong
- **Link construction lives in `src/lib/invite-link.ts`**, pure and taking the hash as an argument so `window` stays in the event handler. The lobby's copy button uses it too, and it is where the rule that a fragment is never case-normalised finally gets a test rather than only a comment
- **This makes eight controls on the `sm:`-and-up bar**, one past the seven the control-states specimen draws. The 440px figure in `code-standards.md` is a phone constraint, and on a phone this collapses into MORE with the rest of the secondary group; eight is comfortable on a desktop viewport. Named here rather than silently exceeded

**Verify:** The dialog shows the live link with the current fragment carried
verbatim, copy confirms, and a stubbed clipboard rejection surfaces the fallback
with the field's text selected. Joining through a URL with no fragment shows the
no-chat-access note and not the key warning. Every request made while the dialog is
open and copying is recorded and asserted to carry no part of the fragment — the
product's central privacy claim, defended structurally until now but never tested.
Unit tests cover the builder, including a mixed-case key and an origin that differs
from `NEXT_PUBLIC_SITE_URL`.

---

## Phase 4 — Encrypted chat

### 17 Chat key handling

**UI:**

- Key-missing state on the chat panel: plain explanation that this link cannot read chat
- The chat control stops being a placeholder and opens a third `CallPanel`
- **The panel shell ships here, the composer at F19.** This feature's own verify line is only executable if something in the UI reaches the missing state, so F17 builds the panel and its two states; F19 fills it and gates its composer on the same `status !== 'ready'` rather than inventing a second condition. A disabled composer built now would be built twice
- **The control opens the panel in every state, and is never disabled.** A disabled control says "chat is broken" where the truth is "your link is missing a piece", and only the panel has room to say which

**Logic:**

- `useChatKey` hook reading the fragment, importing the key non-extractable, exposing `loading | ready | missing`
- Reject a malformed key the same way as a missing one. One state, one explanation: someone sent a truncated link cannot act on the difference
- **Called once, in `CallStage`, and passed down.** It mounts at join, so the import is settled long before the panel can be opened — and `CallPanel` returns `null` while closed, so a hook inside the panel would re-import on every open and make `loading` visible for no reason. No provider until a second consumer exists
- **The `CryptoKey` is safe in React state; the encoded string is not.** Non-serializable and non-extractable once imported. The base64url string is read in the effect and never stored
- **Read once, never watched.** No `hashchange` listener: the only thing that rewrites the fragment is the restore below, which happens first, and a key that changed mid-call would mean the transcript's earlier messages silently became unreadable — a state worth not inventing
- **`restoreChatKeyFragment()` finally gets its caller**, on mount of `RoomExperience`. Ordering is safe by construction rather than by care: the restore runs when the lobby mounts, and `CallStage` — the only reader — mounts later, behind a click on Join. A parent effect restoring for an already-mounted child would be the bug, since React runs child effects first
- **`loading` renders nothing.** The import is sub-millisecond and settles before the panel can be opened; a spinner would flash only when something is wrong

**Verify:** Open `/room/[code]` with no fragment and confirm the explanatory state,
not a crash or an empty transcript. A malformed `#k=` reaches the same state. A
valid key reaches the ready state. Every request made while the chat panel is open
is asserted to carry no part of the fragment, as F16 does for the invite dialog. The
bar still fits at 360px and 640px with every control clearing 44px. No unit test for
the hook — React Testing Library is not an approved dependency, and adding one is a
dependency decision rather than part of this feature; the pure functions beneath it
are already covered.

### 18 Message encryption

**UI:**

- A plain input, a Send button, and an unstyled message list in the F17 panel
- **The minimal composer ships here so the wire can be inspected at all.** F18's verify line asks that no plaintext crosses the channel, which needs something able to send. F19's items — Enter/Shift+Enter, own-message alignment, relative timestamps, unread badge, auto-scroll — are additions to this, not rebuilds
- No composer at all when the key is missing; F17's explanation stands unchanged

**Logic:**

- `src/lib/crypto/chat-message.ts` — `encryptChatMessage` and `decryptChatMessage` with a fresh 12-byte IV and sender identity as additional authenticated data
- `useEncryptedChat` hook wrapping `useDataChannel(DATA_TOPIC.CHAT)` with `{ reliable: true }`
- Decryption failure yields an "unreadable message" entry rather than a throw
- Enforce `MAX_CHAT_MESSAGE_LENGTH` before encrypting. `encryptChatMessage` validates its own input against `ChatPlaintextSchema`, so the limit is the rule and the input's `maxLength` only a courtesy
- **The transcript lives in `CallStage`, not the panel.** `CallPanel` unmounts its children when closed, so a hook inside the panel would stop receiving the moment someone closed it — and F19's unread badge sits on the control bar, outside the panel either way
- **Order and displayed time both come from local receive time.** `sentAt` is part of the envelope and is validated on arrival, then deliberately unused: a peer's clock is neither trustworthy nor accurate, and ordering by it lets one misconfigured client reorder everyone's transcript or pin itself to the top
- **Decryptions are serialized through a tail-promise chain.** `decrypt` is async, so two payloads arriving back to back can resolve in either order and land reversed. Chaining keeps append order equal to arrival order without inventing a pending state F19 would have to render
- **Your own message appends after `publishData` resolves**, with a `failed` status on rejection rather than disappearing. `reliable: true` can genuinely reject, and LiveKit does not echo your own data back to you
- **With no key, incoming payloads are dropped rather than shown as unreadable.** The panel already explains that this link cannot read chat; a column of placeholders beneath that explanation is noise
- **`chat-message.ts` does not re-export the base64url helpers**, as this file's earlier `architecture.md` snippet did. Nothing about a message is base64 — the bytes go raw onto the channel — and a pure re-export is the barrel pattern `code-standards.md` bans

**Verify:** Vitest covers round trip, wrong key, tampered ciphertext, mismatched
sender identity, an over-long body, a valid-JSON-wrong-shape plaintext crafted with
`crypto.subtle` directly, and a distinct IV per message. Two browser contexts prove
a message crosses between participants and that a payload encrypted under a
different key renders as an unreadable placeholder without breaking the call.

**The wire assertion cannot use `page.on('request')`** — the data channel is SCTP
over WebRTC, not HTTP, so no request is ever made. Patch
`RTCDataChannel.prototype.send` in an init script to record every outgoing payload,
then assert none contains the plaintext **and** that the recording is non-empty, so
the check cannot pass vacuously.

### 19 Chat panel

**UI:**

- Message list with sender name, relative timestamp, and own-message alignment
- Composer with Enter to send and Shift+Enter for a newline
- Unread badge on the chat control while the panel is closed
- Empty state noting that messages are end-to-end encrypted and not stored
- Auto-scroll that does not yank the view when the user has scrolled up
- `Sheet` on mobile, inline panel on desktop, sharing the participants-panel shell
- **The composer becomes a textarea growing to about five rows**, then scrolling, and bodies render `whitespace-pre-wrap` so a typed newline survives the round trip. Growth is a `scrollHeight` read on input — a layout read, not an animation, so the no-JS-animation-in-call rule is untouched
- **Own messages carry the fill; everyone else's do not.** The inline panel is already `bg-card`, so filling both sides would flatten the distinction rather than draw it
- **Terse relative time** — `just now`, `2m`, `47m`, `3h`, `2d` — lowercase and unpunctuated, as room codes and identifiers are. Not `Intl.RelativeTimeFormat`, which produces "2 minutes ago" and reads nothing like the rest of the product

**Logic:**

- Transcript held in component state only; never written to storage
- Messages from participants who have since left still render with their captured name
- **Unread is counted by index, not by timestamp.** `CallStage` remembers how many messages had been seen when chat was last opened or closed; unread is the non-local entries past that mark. An index has no tie-break problem, where a message sharing a millisecond with the seen-stamp could be counted either way
- **The seen mark is stamped in the handlers, never in an effect** — on open and on close, including the sheet's own dismiss path. This keeps `setState` out of an effect body, which `react-hooks/set-state-in-effect` rejects as an error; see F17, where that rule reshaped `useChatKey`
- **"Near the bottom" is read from a ref updated on scroll, captured before the list grows.** Reading it after would always report not-near-bottom, and the list would never follow anything
- **One interval per panel, never one per message.** It lives in `ChatPanel`, which `CallPanel` unmounts when closed, so nothing ticks in a call where chat is shut
- **`formatChatTime` is pure and lives in `src/lib/`**, taking `receivedAt` and `now` so every boundary is testable without a clock

**Verify:** Unit tests cover each relative-time boundary. Two contexts prove Enter
sends while Shift+Enter does not, that a typed newline arrives intact, that the
badge counts what landed while the panel was shut and clears on open, and that your
own messages never count toward it. The scroll pin is asserted in both directions —
a view that never moves would otherwise pass a one-sided test.

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

- **Idempotency comes from the existing partial unique index**, `meeting_participants_open_row_idx on (meeting_id, identity) where left_at is null` — no dedupe ledger and no schema change. `participant_joined` inserts and treats `23505` as "already recorded"; `participant_left` and `room_finished` scope their updates with `left_at is null` / `ended_at is null`, so a redelivery matches zero rows. The accepted hole: a join redelivered *after* its row was closed finds no conflict and inserts a spurious open row, which requires a retry to outlive an entire participation and which the nightly sweep closes.
- **All three timestamps come from LiveKit's event clock**, never `now()`: `joined_at` ← `participant.joinedAt`, `left_at` and `ended_at` ← `event.createdAt` (both `bigint` seconds). Durations then survive delivery latency and retries, which matters because feature 21 renders them. One clock source is also what guarantees the `left_at >= joined_at` CHECK can never fire — mixing sources would turn that constraint into a permanent `500` retry loop.
- **The nightly sweep needs a `greatest(p.joined_at, m.expires_at)` clamp.** It set `left_at = m.expires_at`, but a token minted a second before expiry produces a join *after* it, so the CHECK aborts the whole function and no meeting gets swept. Unreachable until this feature creates participation rows, which is why the fix lands here.
- **A join is recorded even when the meeting is ended or expired.** LiveKit is reporting what happened, and expiry deliberately lets a connected call drain.
- **Logic splits pure from IO**, per the feature 09 precedent: identity parsing and timestamp conversion live in a module Vitest can import, the Supabase writes behind `server-only`.
- **Verification is synthetic signed events; the LiveKit Cloud dashboard is configured at feature 25.** LiveKit cannot reach `localhost`, so a Playwright spec signs payloads with `LIVEKIT_API_SECRET` (via `AccessToken`'s `sha256` setter, the same claim `WebhookReceiver` checks) and POSTs them. This makes redelivery a repeatable test rather than a manual one, at the stated cost that the handler is unproven against real traffic until deployment.

**Verify:** Signed-payload e2e covering an unsigned request and a body mutated
after signing (both `401`); a join writing exactly one row with the event's own
`joined_at` and the right `user_id` for `user:` versus `guest:`; the identical
payload posted twice leaving one row; a leave setting `left_at` and a redelivery
leaving it unchanged; `room_finished` with no preceding `participant_left`
closing the row and setting `ended_at` — the killed-tab case, made deterministic;
and a valid-shaped code naming no meeting answering `200` with nothing written.
Plus the sweep clamp, confirmed to fail before the fix. Real two-account traffic
is verified at feature 25.

### 21 Call history page

**UI:**

- Reverse-chronological list: date and time, duration, participant names, and the meeting code
- "Rejoin" action only where the meeting is still joinable — `ended_at is null AND now() < expires_at`, the same rule `/api/token` enforces, so the button is never offered for a link that would 410. With the caveat that a rejoin link has no chat key, stated plainly
- Empty state for users with no history
- Card layout on mobile, table on desktop

**Logic:**

- Server Component query scoped with `.eq('user_id', user.id)`, ordered and limited
- Redirect to `/` when unauthenticated
- Duration derived from `joined_at`/`left_at`, falling back to the meeting's own timestamps
- Query failure logs and renders the empty state

**Verify:** A second account's history contains none of the first account's meetings.

---

## Phase 6 — Mobile and resilience

### 22 Mobile pass

**UI:**

- Every route audited at 360px, 390px, 430px, 768px, 1024px, 1440px, and 1920px — phones, both iPad orientations, laptop, and desktop
- Audit is measured, not eyeballed: zero horizontal overflow (`scrollWidth === clientWidth`) and zero interactive targets under 44×44 at every width above
- Performance targets in `code-standards.md` → Performance verified on the deployed instance: bundle sizes from `next build`, Lighthouse on mobile throttling, and a ten-minute four-participant call
- Call layout using `dvh` with safe-area insets honoured top and bottom
- All touch targets at least 44px, panels as full-height sheets
- Landscape orientation on phones handled without clipping the control bar

**Logic:**

- Confirm the screen-share control is absent on iOS Safari and Android Chrome
- Verify audio starts correctly after the Join gesture on iOS Safari
- Confirm device pickers show real labels on mobile after permission

**Verify:** Run the full guest-join flow on a real iOS device and a real Android device, not only in devtools emulation.

### 23 Connection quality and recovery

**UI:**

- Per-tile connection-quality indicator
- Room-level banner while reconnecting
- Terminal disconnect state offering rejoin or return Home

**Logic:**

- Subscribe to LiveKit connection-quality and connection-state changes
- Preserve mic/camera intent across a reconnect so a muted user does not come back unmuted

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

---

## Phase 7 — Ship

### 25 Render deployment

**Logic:**

- `render.yaml` defining the Node web service on the **free** plan, build and start commands, and every env var with `sync: false` for secrets
- A `/healthz` route for Render's health check. **No external keep-alive pinger** — see `constraints.md` → Hosting for why
- README states above the demo link that a first visit after an idle spell takes about a minute to wake
- Set `NEXT_PUBLIC_SITE_URL` to the deployed origin
- Add the deployed origin to Supabase's allowed redirect URLs and to the Google OAuth client
- Point the LiveKit webhook at the deployed `/api/livekit/webhook`
- Health check and a documented first-deploy checklist in the README

**Verify:** Sign in, create a meeting, and complete a two-device call end to end on the deployed URL.

### 26 End-to-end test suite

**Logic:**

- Playwright specs: guest joins via link; lobby toggles carry into the call; two contexts see each other; chat round-trips between two contexts; a link without `#k=` disables chat
- Two-participant tests use separate browser contexts
- Wire `npm run test:e2e` into the documented pre-deploy checklist

**Verify:** The full suite passes locally against a running dev server.

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
