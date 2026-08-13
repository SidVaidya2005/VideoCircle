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

**Verify:** Share from desktop and confirm the tile appears for a mobile participant, and that the mobile participant has no share button at all.

### 13 Speaker and spotlight view

**UI:**

- Layout switches to a large focused tile with a filmstrip when a screen share starts
- Manual pin/unpin on any participant
- Filmstrip scrolls horizontally on mobile, vertically on desktop
- Return to grid when the share ends and nothing is pinned

**Logic:**

- Focus resolution order: manual pin, then active screen share, then active speaker
- Active-speaker detection from LiveKit

### 14 Participant list panel

**UI:**

- Panel listing every participant with name, mic state, camera state, and a "you" marker
- Live headcount in the control bar
- `Sheet` on mobile, inline side panel on desktop

**Logic:**

- Derive from LiveKit participant state; no separate data source
- Sort: local participant first, then join order

### 15 Reactions and raise hand

Brand-native reactions, not emoji — the kit forbids emoji outright. Reactions are
wide-tracked CAPS chips plus the signature red-dot burst, built on the control-row
treatment in `context/Design/preview/control-states.html`.

**UI:**

- A fixed reaction set as CAPS chips: `NICE`, `+1`, `LOL`, `WOW`, `BRB`
- Chip row styled as the kit's ease-buttons — `rgba(255,255,255,.05)` at rest, `.1` on hover, inverted fill while sending
- A fired reaction rises over the sender's tile as its CAPS label with a red-dot burst behind it, easing on `ease-out-expo`, fading after `REACTION_TTL_MS`
- Raised hand shows a persistent badge on the tile and in the participant list, using the red dot as the mark

**Logic:**

- Reaction payloads carry a label from the fixed set; unknown labels are dropped rather than rendered, so a malformed peer cannot inject arbitrary text over a tile
- Publish over `DATA_TOPIC.REACTION` and `DATA_TOPIC.HAND` with `{ reliable: false }`
- Raise-hand is toggle state and clears on leave
- Rate-limit reactions per participant so the channel cannot be flooded
- CSS-only animation — this renders inside the call, where `animejs` is not permitted

### 16 Copy invite link in call

**UI:**

- Invite control in the control bar opening a dialog with the full link
- Copy button with confirmation
- Explicit note that the link carries the chat key

**Logic:**

- Reconstruct the link from `NEXT_PUBLIC_SITE_URL`, the code, and the current fragment
- Clipboard fallback (select-and-copy) for browsers that block `navigator.clipboard`

---

## Phase 4 — Encrypted chat

### 17 Chat key handling

**UI:**

- Key-missing state on the chat panel: composer disabled, plain explanation that this link cannot read chat

**Logic:**

- `useChatKey` hook reading the fragment, importing the key non-extractable, exposing `loading | ready | missing`
- Reject a malformed key the same way as a missing one

**Verify:** Open `/room/[code]` with no fragment and confirm the explanatory state, not a crash or an empty transcript.

### 18 Message encryption

**Logic:**

- `src/lib/crypto/chat-message.ts` — `encryptChatMessage` and `decryptChatMessage` with a fresh 12-byte IV and sender identity as additional authenticated data
- `useEncryptedChat` hook wrapping `useDataChannel(DATA_TOPIC.CHAT)` with `{ reliable: true }`
- Decryption failure yields an "unreadable message" entry rather than a throw
- Enforce `MAX_CHAT_MESSAGE_LENGTH` before encrypting

**Verify:** Vitest covers round trip, wrong key, tampered ciphertext, and mismatched sender identity. With devtools recording, confirm no plaintext appears on the wire and the key appears in no request.

### 19 Chat panel

**UI:**

- Message list with sender name, relative timestamp, and own-message alignment
- Composer with Enter to send and Shift+Enter for a newline
- Unread badge on the chat control while the panel is closed
- Empty state noting that messages are end-to-end encrypted and not stored
- Auto-scroll that does not yank the view when the user has scrolled up
- `Sheet` on mobile, inline panel on desktop, sharing the participants-panel shell

**Logic:**

- Transcript held in component state only; never written to storage
- Messages from participants who have since left still render with their captured name

---

## Phase 5 — Call history

### 20 Participation recording

**Logic:**

- `src/lib/livekit/webhook.ts` with `WebhookReceiver`
- `POST /api/livekit/webhook` reading the raw body and verifying the signature before anything else
- `participant_joined` → insert a participation row, resolving `user_id` from the `user:` identity prefix
- `participant_left` → set `left_at` on the open row for that `(meeting_id, identity)`
- `room_finished` → set `meetings.ended_at`, and close every still-open participation row for that meeting (`left_at = coalesce(left_at, now())`) as reconciliation for a dropped `participant_left`
- Idempotent handling; `500` on transient failure so LiveKit retries, `200` on events deliberately ignored
- Confirm the nightly sweep from feature 03 closes meetings whose `room_finished` never arrived
- Configure the webhook URL in the LiveKit Cloud dashboard

**Verify:** Join and leave from two accounts and confirm exactly one row per join
with correct timestamps; redeliver an event and confirm no duplicate; kill a browser
tab without leaving cleanly and confirm `room_finished` still closes that row rather
than leaving `left_at` null.

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
