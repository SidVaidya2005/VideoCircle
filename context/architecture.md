# Architecture

> **Role:** How the system is built — stack, structure, boundaries, data, and the invariants that must never be violated.
> **Read after** `project-overview.md`, before writing any code.
> **Relates to:** the stack here drives `code-standards.md` and `library-docs.md`.

The invariants later in this document are rules that must always hold, regardless
of which feature is being changed.

## Stack

| Layer | Tool | Purpose |
| ----- | ---- | ------- |
| Language | TypeScript 6 (`strict`) | All application code, client and server. **Not 7** — see `constraints.md` → Tooling |
| Framework | Next.js 16 (App Router) | Routing, Server Components, route handlers, single deployable |
| UI runtime | React 19 | Component model |
| Real-time media | LiveKit Cloud (SFU) | Relays video, audio, and screen shares between participants; handles TURN, simulcast, and reconnection |
| Media client | `livekit-client` 2.21 + `@livekit/components-react` 2.9 | Room connection, track publication, React hooks and layout primitives |
| Token minting | `livekit-server-sdk` 2.17 | Server-side `AccessToken` JWTs and webhook signature verification |
| Auth | Supabase Auth (Google OAuth, PKCE) | Sign-in, session cookies, user identity |
| Auth glue | `@supabase/ssr` 0.12 | Connects Supabase session cookies to Server Components, route handlers, and the proxy |
| Database | Supabase Postgres | `profiles`, `meetings`, `meeting_participants` |
| DB client | `@supabase/supabase-js` 2.112 | Queries, and the service-role admin client |
| Encryption | Web Crypto API (`SubtleCrypto`, AES-GCM 256) | End-to-end encryption of chat messages in the browser |
| Styling | Tailwind CSS 4.3 | Utility styling; design tokens declared with `@theme` |
| Design system | VideoCircle design system (`context/Design/`) | Dark, terminal-style appearance with one monospaced typeface. Source of truth for design tokens and specimens; adapted from the MIT-licensed Anime.js kit |
| Typeface | JetBrains Mono via `next/font/google` | The single family, self-hosted at build time. Substitutes for the kit's licensed IoskeleyMono |
| UI primitives | shadcn/ui (built on Radix) | Dialog, dropdown, tooltip, popover, sheet, input, textarea, button. Source stays in the repo and uses aliases for brand tokens. **No toast**: temporary failures appear where they happened. F24 decided against adding a second place for those messages |
| Motion | CSS transitions with the kit's easing curves; `animejs` outside the call | Brand motion without competing with WebRTC encoding on the main thread |
| Validation | Zod 4 | Parses request bodies and environment values wherever data enters server code |
| Linting | ESLint 9 + `eslint-config-next` | **Not 10** — `eslint-plugin-react` breaks on it; see `constraints.md` → Tooling |
| Unit tests | Vitest 4 | Crypto, room-code, formatting, and query-shaping logic |
| E2E tests | Playwright 1.62 | Lobby → join → leave flows with faked media devices |
| Hosting | Render (Web Service, Node runtime, **free tier**) | Single service running `next start`. Free instances sleep after 15 min idle and take ~1 min to wake — see `constraints.md` → Hosting |

### How to read the versions

The versions above are the **minor families** chosen during planning. They are
not exact pins: `2.112` means "2.112.x". Once feature 01 creates `package.json`,
that file is the source of truth. The versions here are the minimum; newer patches
and minor versions within the same major are expected and allowed.

Changing a major version requires a decision. Record it in `constraints.md`.

### Why media runs on LiveKit Cloud

LiveKit Cloud is required. Render does not expose UDP, so it cannot host either an
SFU or a coturn TURN server. Render runs the Next.js app, while all media travels
through LiveKit's infrastructure.

---

## Folder Structure

Phase 0 built the foundation. The structure below describes the target shape;
each feature adds the parts it needs.

### What each feature added

Built so far:

- **F01** — root configs, `src/app/`, `src/lib/` (`env`, `env.server`, `api`, `constants`, `utils`), `tests/`

- **F02** — the `globals.css` token mirror, the `(shell)` route group, `src/components/{shell,home,ui}/`, `public/brand/`, the dev-only `/tokens` route

- **F03** — `supabase/` with seven migrations, `src/lib/supabase/`, `src/proxy.ts`, `src/types/database.ts`

- **F04** — `src/app/auth/{callback,signout}/`, `src/lib/auth/`, the header auth menu, and the `dropdown-menu` primitive

- **F05** — `src/lib/room-code.ts`, `src/lib/parse-room-code.ts`, the hero's join-by-code form, and the `input` primitive

- **F06** — `src/lib/crypto/{base64url,chat-key}.ts`, `src/app/api/meetings/`, and the hero's share panel.

  `src/middleware.ts` became `src/proxy.ts` at the Phase 1 checkpoint, per Next 16's rename

- **F07** — `src/app/room/[code]/{page,not-found}.tsx`, `src/components/room/room-experience.tsx`, `src/components/lobby/{self-preview,media-state-notice}.tsx`, `src/hooks/use-media-preview.ts`, `src/lib/media/classify-media-error.ts`, `src/lib/meetings.ts`.

  This was the first feature to use `livekit-client`

- **F08** — the rest of `src/components/lobby/`, `src/hooks/{use-media-devices,use-copy-to-clipboard}.ts`, `src/lib/media/preferences.ts`.

  `use-media-preview.ts` changed from acquiring devices once to controlling the lobby's devices. `section-overline.tsx` moved from `home/` to `ui/` when a third caller needed it

- **F09** — `src/app/api/token/`, `src/lib/env.livekit.server.ts`, `src/lib/meeting-state.ts`, `src/lib/livekit/{token,token-ttl,room-options,request-token}.ts`, `src/components/room/{room-shell,connected-panel}.tsx`, `src/components/lobby/join-failure-notice.tsx`.

  These were the first modules to use `livekit-server-sdk` and `@livekit/components-react`

- **F10** — `src/components/room/{call-stage,video-grid,participant-tile,participant-count}.tsx` and `src/lib/{room-grid,initials}.ts`.

  `connected-panel.tsx` was deleted; its status strip and Leave control moved into `call-stage.tsx`. The project implements its own grid rather than using `GridLayout`/`ParticipantTile` — see `library-docs.md` → Rendering the participant grid

- **F11** — `src/components/room/{control-bar,control-button,leave-control}.tsx`, `src/hooks/use-call-shortcuts.ts`, `src/lib/keyboard.ts`, and the `tooltip` primitive.

  This was the first feature to use `lucide-react`

- **F16** — `src/components/room/invite-dialog.tsx`, `src/lib/invite-link.ts`, and the `dialog` primitive.

  The lobby's copy button began using the shared builder

- **F15** — `src/components/room/{reactions-provider,reaction-menu}.tsx`, `src/hooks/use-raise-hand.ts`, `src/lib/reactions.ts`, and the `popover` primitive.

  The token grant gained `canUpdateOwnMetadata`, allowing a client to write its own raise-hand attribute

- **F14** — `src/components/room/{call-panel,participant-list}.tsx`, `src/hooks/use-media-query.ts`, `src/lib/participants.ts`, and the `sheet` primitive.

  `participant-count.tsx` was deleted, and the participant count moved to a badge on the participants control

- **F13** — `src/components/room/{focus-layout,tile-menu}.tsx` and `src/lib/room-focus.ts`.

  `participant-tile.tsx` gained the pin gesture, the menu, a `size` variant and the pinned marker. `video-grid.tsx` now holds the pin state and chooses between the grid and spotlight layouts

- **F12** — `src/components/room/call-status.tsx` and `src/hooks/use-is-screen-share-supported.ts`.

  The status strip moved out of `call-stage.tsx` so the sharing banner and the connection line it replaces are kept together. `video-grid.tsx` gained the `ScreenShare` source, and `room-grid.ts` gained the `orderCallTiles` sort

- **F17** — `src/hooks/use-chat-key.ts` and `src/components/chat/chat-panel.tsx`, the first file under `components/chat/`.

  `CallPanelName` expanded to `'participants' | 'chat'`. Removing `PENDING_CONTROLS` from `control-bar.tsx` left no disabled controls on the bar until F24 restricted screen share to `Connected`. `room-experience.tsx` began calling `restoreChatKeyFragment()`, which had shipped in F04 without a caller

- **F18** — `src/lib/crypto/chat-message.ts` and `src/hooks/use-encrypted-chat.ts`.

  The panel gained a plain input, a Send button and a message list. `call-stage.tsx` holds the transcript because `CallPanel` unmounts its children when closed

- **F19** — `src/lib/chat-time.ts` and the `textarea` primitive.

  `chat-panel.tsx` gained the full composer, the update tick for relative times, and scrolling that stays pinned when the reader is near the bottom. `call-stage.tsx` gained a mark of what has been seen, from which the unread count is calculated. It also gained `closePanel` alongside `togglePanel`, so dismissing the sheet itself updates that mark too

- **F20** — `src/app/api/livekit/webhook/`, `src/lib/livekit/{webhook,participation-event}.ts`, and `src/lib/participation.ts`.

  This was the first server-side work since F09 and the first use of `WebhookReceiver`. F20 made the expiry sweep's `left_at` update reachable, so a migration clamps that value. `tsconfig.json`'s `target` moved from ES2017 to ES2020 because the SDK reports event times as `bigint`, and lower targets do not allow BigInt literals

- **F21** — `src/app/(shell)/history/page.tsx`, `src/lib/history.ts`, and `src/components/history/{history-list,history-empty,history-time}.tsx`.

  The `.history-row` column widths were added to `globals.css`. `tests/e2e/support/session.ts` was added too. It lets the suite create real Supabase sessions through the admin API and test signed-in pages without Google's consent screen

- **F22** — `tests/e2e/support/viewport.ts` and `responsive.spec.ts` added the measured responsive audit.

  `tests/e2e/sign-in.spec.ts` added coverage for the one path that had none. `src/app/layout.tsx` gained the `viewport` export, which makes the project's `env(safe-area-inset-*)` values resolve. `globals.css` gained `.call-surface` and `.sheet-surface` to add padding for those insets. Moving the Supabase browser client behind a dynamic `import()` in `sign-in.ts` removed 64 kB from Home

- **F23** — `src/lib/livekit/{disconnect-reason,connection-quality}.ts` and `src/components/room/disconnect-notice.tsx`.

  `onDisconnected` now checks the disconnect reason instead of always navigating Home; `RoomShell`'s prop was expanded to carry that reason. `call-status.tsx` gained the reconnect banner and gives reconnecting priority over sharing. `participant-tile.tsx` gained the marker for a degraded connection

- **F24** — `src/app/{error,global-error}.tsx`, `src/lib/media/media-failure-copy.ts`, and `tests/support/forbidden-copy.ts`.

  Moving media failure copy out of `media-state-notice.tsx` made the three unreachable states testable. The forbidden-copy file is shared by the unit and e2e parts of the leak check. `control-bar.tsx` restricts screen share to `Connected`, and `chat-panel.tsx` gained jump-to-latest. **There is deliberately no `loading.tsx` anywhere** — see `constraints.md` → Error and loading surfaces

- **F25** — `render.yaml`, `src/app/healthz/route.ts`, `engines.node` in `package.json`, and `tests/e2e/healthz.spec.ts`.

  `src/proxy.ts`'s matcher gained a `/healthz` exclusion, covered by `tests/unit/proxy-matcher.test.ts`. The original e2e assertion **passed with the exclusion removed**: `updateSession` only sets cookies when there is a session to refresh. It was replaced by a unit test of the matcher that correctly fails without the exclusion

- **F26** — `tests/e2e/support/join.ts` and `tests/e2e/media-failures.spec.ts`, with `stubMediaFailure` added to `support/media.ts`.

  `joinAs`, `connectedStatus` and `CONNECT_TIMEOUT_MS` were extracted from 12 specs that used 7 variants. The only `src/` change was in `reactions-provider.tsx`: `toggleHand` now awaits the attribute write and reverts the control if it fails. Previously, a lost write left the person raising their hand as the only one who saw it raised

### Files that are still absent

`types/meeting.ts` has not been built. Domain types still live beside the code
that uses them, and no shared domain type has been needed yet.

Any `loading.tsx` and any toast primitive are deliberately absent.

### Post-build camera correction (10 Oct 2026)

`src/hooks/use-camera-switch.ts` cycles through the enumerated cameras using
LiveKit's room device switch. It does not reconnect the call or change audio.
The control appears only after camera permission has been granted and multiple
cameras are available. It sits inline at `sm:` and above, and under MORE below it.

While capture changes, both another switch and the camera toggle are disabled.
If acquisition fails, the previous lens is restored. Each switch or recovery has
a deadline. If capture stalls or restoration fails, the camera is stopped and
unpublished, the SDK disposes of any capture that arrives late, and the UI shows
a retry message.

Switching while the camera is off records the next lens without acquiring a
track. It uses the room's pending device rather than the stopped source.
Enumeration remains available when joining with the camera off and never prompts
for permission. A successful lens choice uses the existing lobby preferences.

`src/hooks/use-camera-mirror.ts` is shared by the lobby self-preview and the local
participant tile. It subscribes to track restart and unmute events and reads the
actual source track's facing metadata. Front cameras and desktop cameras with an
unspecified direction mirror locally. Rear cameras, remote tiles and screen
shares do not.

`tests/e2e/camera-switch.spec.ts` covers these flows using virtual capture from
`tests/e2e/support/cameras.ts` and a real LiveKit connection between two contexts.
Phone hardware support still needs a check on a real device.

### Target folder tree

```
VideoCircle/
├── CLAUDE.md                          → agent entry point
├── .github/workflows/
│   └── supabase-activity.yml           → daily read-only database activity, outside
│                                        Render; setup in docs/DEPLOYMENT.md
├── context/                           → this documentation set
│   └── Design/                        → VideoCircle design system (spec, tokens, specimens, mark)
├── docs/                              → reader-facing docs the README links to:
│   ├── DEPLOYMENT.md                  → Render setup and pre-deploy checks
│   ├── ENGINEERING-NOTES.md           → bugs worth more than their fix
│   └── screenshots/                   → README images, captured with Playwright
├── render.yaml                        → Render service + env definition
├── components.json                    → shadcn/ui config (aliases, target stylesheet)
├── (root configs)                     → package.json, tsconfig.json, next.config.ts,
│                                        eslint.config.mjs, postcss.config.mjs,
│                                        vitest.config.mts, playwright.config.ts,
│                                        .prettierrc.json, .env.example
├── public/
│   └── brand/                         → mark.svg + wordmark.svg, copied out of context/Design/assets/
├── supabase/
│   ├── config.toml                    → CLI config (supabase init)
│   └── migrations/                    → timestamped SQL migrations (schema + RLS)
├── tests/
│   ├── support/                       → shared by BOTH suites: forbidden-copy.ts, the
│   │                                    one definition of what a user-facing message
│   │                                    may never contain
│   ├── unit/                          → Vitest specs
│   └── e2e/                           → Playwright specs
│       └── support/                   → media stubs, signed webhook payloads,
│                                        session.ts (signs a context in for real),
│                                        viewport.ts (the measured responsive sweep),
│                                        reconnect.ts (peer-connection recorder), and
│                                        join.ts — joinAs plus connectedStatus and
│                                        CONNECT_TIMEOUT_MS, the ONLY way a spec may
│                                        wait on a connected room
└── src/
    ├── proxy.ts                       → Supabase session refresh on every request
    ├── app/
    │   ├── layout.tsx                 → root layout: html/body, JetBrains Mono,
    │   │                                metadata, and the viewport export that makes
    │   │                                env(safe-area-inset-*) resolve to anything
    │   ├── error.tsx                  → root error boundary; recovery is retry()
    │   ├── global-error.tsx           → boundary for the root layout itself; brings
    │   │                                its own html/body, globals.css and typeface
    │   ├── globals.css                → Tailwind import + :root token mirror + @theme
    │   │                                inline, then the few component classes whose
    │   │                                values are literals (.grid-backdrop, the
    │   │                                wordmark separator, .scope-square's drift
    │   │                                distance, .history-row, and .call-surface
    │   │                                / .sheet-surface, which pay the safe-area
    │   │                                insets the viewport export turns on)
    │   ├── (shell)/                   → route group: header + footer chrome
    │   │   ├── layout.tsx             → SiteHeader / <main> / SiteFooter
    │   │   ├── page.tsx               → Home: new meeting, join by code, sign in
    │   │   └── history/page.tsx       → call history (Server Component, auth required)
    │   ├── tokens/
    │   │   └── page.tsx               → token specimen sheet; notFound() in production
    │   ├── auth/
    │   │   ├── callback/route.ts      → OAuth PKCE code → session exchange
    │   │   └── signout/route.ts       → sign out, redirect Home
    │   ├── healthz/route.ts           → liveness only. Reads NO dependency, against
    │   │                                Render's own advice: a free Supabase project
    │   │                                pauses after ~7 days idle, and a readiness
    │   │                                check would turn that into a restart loop it
    │   │                                cannot fix. Excluded from the proxy matcher
    │   ├── room/[code]/
    │   │   ├── page.tsx               → resolves code, renders <RoomExperience/>
    │   │   └── not-found.tsx          → invalid or unknown room code
    │   └── api/
    │       ├── meetings/route.ts      → POST: create meeting row for a new code
    │       ├── token/route.ts         → POST: mint a LiveKit AccessToken
    │       └── livekit/webhook/route.ts → POST: LiveKit participant/room events
    ├── components/
    │   ├── ui/                        → shadcn primitives, added per feature (button, dialog,
    │   │                                dropdown-menu, input, popover, sheet, textarea, tooltip),
    │   │                                plus section-overline, the brand's own
    │   ├── shell/                     → wordmark, site header, site footer, auth menu
    │   ├── home/                      → hero (two-column from lg:), scope canvas, call preview,
    │   │                                how-it-works, feature grid, join-by-code form,
    │   │                                start-meeting + share panel, auth-error notice
    │   ├── lobby/                     → self-preview, media-state notice, device toggles and
    │   │                                pickers, display-name field, copy-invite, join-failure
    │   │                                notice, lobby controls
    │   ├── room/                      → room-experience (hosts lobby then call), room-shell
    │   │                                (<LiveKitRoom>), call-stage (status / grid / controls),
    │   │                                call-status, video-grid, focus-layout,
    │   │                                participant-tile, tile-menu, call-panel,
    │   │                                participant-list, control-bar, control-button,
    │   │                                leave-control, reactions-provider, reaction-menu,
    │   │                                and invite-dialog
    │   ├── chat/                      → chat-panel: transcript, composer, key-missing notice
    │   └── history/                   → history-list (cards below sm:, grid above),
    │                                    history-empty, history-time (client leaf:
    │                                    formats in the reader's timezone)
    ├── hooks/                         → use-media-preview (owns the lobby's tracks),
    │                                    use-media-devices, use-copy-to-clipboard,
    │                                    use-call-shortcuts, use-is-screen-share-supported,
    │                                    use-media-query, use-chat-key, use-encrypted-chat, …
    ├── lib/
    │   ├── auth/
    │   │   ├── sign-in.ts             → signInWithGoogle + the chat-key fragment stash
    │   │   └── safe-next.ts           → origin-compared validation of the callback's `next`
    │   ├── supabase/
    │   │   ├── client.ts              → createBrowserClient (browser only)
    │   │   ├── server.ts              → createServerClient over next/headers cookies
    │   │   ├── proxy.ts               → session-refresh helper used by src/proxy.ts
    │   │   └── admin.ts               → service-role client, server-only
    │   ├── livekit/
    │   │   ├── token.ts               → AccessToken construction, server-only
    │   │   ├── token-ttl.ts           → pure min(1h, expires_at − now) cap
    │   │   ├── room-options.ts        → adaptiveStream/dynacast + chosen devices
    │   │   ├── disconnect-reason.ts    → pure: deliberate-leave test, and the reason
    │   │   │                            → copy map, exhaustive over all 17 members
    │   │   ├── connection-quality.ts   → pure: quality → a label, degraded only
    │   │   ├── request-token.ts       → browser-side POST /api/token, parsed
    │   │   ├── participation-event.ts → pure identity → user id, and bigint
    │   │   │                            event seconds → ISO
    │   │   └── webhook.ts             → WebhookReceiver setup
    │   ├── crypto/
    │   │   ├── base64url.ts           → byte ⇄ base64url helpers
    │   │   ├── chat-key.ts            → key generation, export, import, hash parsing
    │   │   └── chat-message.ts        → encrypt/decrypt the message envelope
    │   ├── media/
    │   │   ├── classify-media-error.ts → getUserMedia rejection → a renderable state
    │   │   ├── media-failure-copy.ts  → the copy for each failure. Pure, because
    │   │   │                            three of the five states are unreachable
    │   │   │                            from the e2e suite
    │   │   └── preferences.ts         → validated localStorage for device choices
    │   ├── room-grid.ts               → pure headcount → column classes, tile ordering
    │   │                                (shares first), and the visible/overflow split
    │   │                                against MAX_VISIBLE_TILES
    │   ├── keyboard.ts                → pure typing-target and bare-keypress predicates
    │   ├── chat-time.ts               → pure elapsed → `just now` / `2m` / `3h` / `2d`
    │   ├── room-focus.ts              → pure focus resolution (pin, then share, then grid)
    │   │                                and the focused/filmstrip split
    │   ├── room-tile.ts               → pure tile captions: the person's own name for
    │   │                                the initials, `You` / `— screen` for the label
    │   ├── participants.ts            → pure roster ordering: you first, then join order
    │   ├── reactions.ts               → the fixed label set, the Zod-validated wire
    │   │                                payload, and the pure rate-limit decision
    │   ├── invite-link.ts             → pure share-link construction, fragment verbatim
    │   ├── initials.ts                 → pure display name → up to two characters
    │   ├── meeting-state.ts           → pure joinability decision (open/ended/expired)
    │   ├── env.livekit.server.ts      → Zod-parsed LiveKit secrets, server-only
    │   ├── meetings.ts                → meeting lookup by code, server-only
    │   ├── participation.ts           → idempotent participation writes, server-only
    │   ├── history.ts                 → pure grouping into one entry per meeting,
    │   │                                the three duration states, and HH:MM:SS
    │   ├── room-code.ts               → generation and validation of meeting codes
    │   ├── parse-room-code.ts         → pulls a code + opaque fragment out of a pasted code or link
    │   ├── api.ts                     → apiOk / apiError response helpers
    │   ├── constants.ts               → shared literals: data topics, caps, footer links
    │   ├── env.ts                     → Zod-parsed NEXT_PUBLIC_* access (safe anywhere)
    │   ├── env.server.ts              → Zod-parsed secrets, server-only
    │   └── utils.ts                   → cn() and small shared helpers
    └── types/
        ├── database.ts                → generated Supabase types
        └── meeting.ts                 → domain types shared across layers
```

---

## System Boundaries

Each folder or module has a defined responsibility. These boundaries keep
presentation, server privileges, and shared logic from becoming mixed together.

| Folder | Owns |
| ------ | ---- |
| `src/app/(pages)` | Defines routes, assembles layouts, and fetches data in Server Components. Contains no business logic and makes no direct third-party SDK calls except through the Supabase server client. |
| `src/app/api` | Handles incoming HTTP requests: parses input, checks authorization, delegates to `src/lib`, and shapes the response. Contains no React or rendering logic. |
| `src/components` | Renders the UI and holds local interaction state. Never reads `process.env` secrets, constructs a Supabase admin client, mints tokens, or talks directly to Postgres. |
| `src/components/ui` | Reusable presentation elements with no product knowledge: the shadcn-generated set and the brand's own `section-overline`. Nothing here may know what a meeting is. |
| `src/components/shell` | Header, footer, and wordmark rendered by the `(shell)` route group. Has no auth knowledge; the header receives a sign-in slot as a prop. |
| `src/hooks` | Reusable client-side logic that holds state and connects LiveKit/Web Crypto to React. Contains no JSX. |
| `src/lib` | Logic independent of the framework, plus construction of third-party clients. Never imports from `src/components` or `src/app`. |
| `src/lib/auth` | Starts sign-in and validates the callback's redirect. `sign-in.ts` is `'use client'` and is the only module that touches the stored chat-key fragment. |
| `src/lib/crypto` | All Web Crypto usage. No other folder may call `crypto.subtle` directly. |
| `src/lib/meetings.ts` | Looks up meetings by code and is `server-only`. It deliberately uses `supabaseAdmin`: row-level security (RLS) controls which database rows a caller can read and hides the meeting from a guest opening its link. An anon client would therefore make valid codes look unknown. Keeping the lookup here keeps the service-role client out of `src/app`. |
| `src/lib/participation.ts` | Writes participation data and is `server-only`. Every function is idempotent: repeating an event does not duplicate its effect. This lets the webhook return `500` so LiveKit can redeliver it. Functions take a meeting id rather than a room code, allowing one lookup per event instead of per write. They do not decide whether a join should have been allowed; LiveKit reports what already happened. |
| `src/lib/media` | Turns device failures into states the UI can render. Contains no React and does not manage track lifecycles; that belongs in `src/hooks`. |
| `src/lib/meeting-state.ts` | Decides whether a meeting can be joined. It is pure and has no `server-only` dependency, so every branch can be tested without a database. The route handler performs the input/output work and passes the row here. |
| `src/lib/livekit/token-ttl.ts` | Caps the token's time to live (TTL). It is separate for the same testing reason: importing `token.ts` requires LiveKit secrets. |
| `src/lib/env.*.server` modules | The only modules that read secrets from `process.env`. Each service has its own module so a missing credential affects only that service's consumers. Begin with `import 'server-only'` on line one. Supabase uses `env.server.ts`; LiveKit uses `env.livekit.server.ts`. |
| `src/lib/supabase/admin.ts` | The only consumer of `serverEnv.SUPABASE_SERVICE_ROLE_KEY`. `import 'server-only'` on line one. |
| `src/lib/livekit/token.ts` | The only place `serverEnv.LIVEKIT_API_SECRET` is used for signing. |
| `src/types` | Shared type declarations only. No runtime values, no logic. |
| `supabase/migrations` | Defines the schema, indexes, and RLS policies in SQL. Application code must never change the schema. |
| `private` (DB schema) | Contains every `security definer` function. PostgREST does not expose this schema, so these functions cannot be called through its RPC interface. |
| `tests` | Vitest and Playwright specs. No production code imports anything from here. |
| `.github/workflows/supabase-activity.yml` | Checks database activity externally using the publishable API key as `anon`; existing RLS hides every row. Makes no application request or database write and uses no privileged credential. See `docs/DEPLOYMENT.md` for configuration and scheduling limits. |

---

## Data Flow

### Creating a meeting

```
Home page · "New meeting" (client)
  → generateChatKey() + exportChatKey()  (Web Crypto, browser — key never leaves)
  → POST /api/meetings {}
      → reads session via createServerClient (may be null for a guest)
      → generateRoomCode()             (crypto.getRandomValues, server)
      → supabaseAdmin.insert into meetings { code, created_by }
        expires_at comes from the column default, never the payload — the 24-hour
        window is declared once, in the migration.
      → on 23505 (unique violation on code): regenerate and retry once, then 409.
        A real collision needs ~33M meetings at 50 bits, so a second failure means
        a bug, not bad luck — fail loudly rather than looping.
      → 201 { code }
  → share panel renders `${NEXT_PUBLIC_SITE_URL}/room/${code}#k=${exportedKey}`
  → "Join now" → router.push(`/room/${code}#k=${exportedKey}`)

The server is the only generator, and the browser uses the code it is given. If the
client generated the code and the server regenerated it on a collision, the client
would navigate to a room it does not own — a bug that appears only on a collision,
and so would not appear until it mattered.
```

### Joining a call

```
/room/[code] · page (server)
  → isValidRoomCode(code)          → notFound() on a malformed code, before any query
  → findMeetingByCode(code)        → notFound() when the code names no meeting
    Both checks run before the lobby mounts, so a dead link fails before anyone is
    asked for a camera. Joinability (ended / expired) is NOT decided here — it is
    re-read at join time, because a meeting can expire while someone sits in the lobby.

/room/[code] · lobby (client)
  → permission state known-granted?
      yes → camera and microphone requested separately, in parallel, each timed
      no  → one combined request, untimed, so the browser raises a single prompt
            and the person answers at their own pace
  → createLocalTracks()  → self-preview, device enumeration
  → user sets mic/camera state and display name, presses Join
  → POST /api/token { code, displayName }
      → validate code shape + display name (Zod)
      → supabaseAdmin: load the meeting by code
          not found            → 404  (the code is not self-authorizing)
          ended_at is not null → 410  "This meeting has ended."
          now() >= expires_at  → 410  "This link has expired."
      → resolve identity: session user → `user:<uuid>`, else `guest:<random>`
        Generated server-side and never accepted from the client — it is what the
        participation webhook later reads a user id back out of.
      → mintAccessToken() signs a JWT scoped to that room only
      → 200 { serverUrl, token, identity }
  → stopPreview()  → every lobby track released BEFORE connecting. A live preview
                     track holds the camera the room is about to ask for, and on
                     some devices that blocks the room acquiring it at all.
  → <LiveKitRoom serverUrl token connect audio={micOn} video={cameraOn}
                 options={memoised roomOptions(chosen device ids)}>
      The options object must be memoised: <LiveKitRoom> re-creates its Room
      whenever that object's identity changes, so a fresh literal per render
      reconnects the call continuously and presents as a network fault.
  → WebRTC to LiveKit Cloud SFU
```

### Encrypted chat message

```
Chat composer (client)
  → key = importChatKey(readChatKeyFromHash(location.hash))   (useChatKey, at CallStage)
  → encryptChatMessage(key, localIdentity, { body, sentAt })   → Uint8Array
  → room.localParticipant.publishData(bytes, { topic: 'vc.chat', reliable })
        ⇣  LiveKit SFU relays opaque bytes — cannot decrypt
  → useDataChannel('vc.chat') on every peer
  → decryptChatMessage(key, message.from.identity, bytes)      → rendered
        a rejection here is an "unreadable message" entry, never a throw

The sender appends its own copy after publishData resolves — LiveKit does not
deliver your own data messages back to you — and a rejection is kept as a failed
entry rather than vanishing. Incoming decryptions are chained through a tail
promise, because async resolution order is not arrival order.

The transcript lives in CallStage, not the panel: CallPanel unmounts its children
when closed, and a transcript that stops receiving when someone closes chat is not
a transcript. It exists in component state only and is never written anywhere.
```

### Recording participation for history

```
LiveKit Cloud  ── webhook POST ──▶  /api/livekit/webhook
  → WebhookReceiver.receive(rawBody, authHeader)   (signature verified)
  → participant_joined  → insert meeting_participants
                            { meeting, identity, user_id|null, display_name, joined_at }
                          identity is not null and is the join↔leave correlation key;
                          user_id is parsed from the `user:<uuid>` identity prefix,
                          and is null for a `guest:<uuid>` identity.
                          A 23505 here means the event was redelivered — the partial
                          unique index IS the idempotency, so it is not an error.
  → participant_left    → set left_at on the open row matched by (meeting, identity),
                          scoped `left_at is null` so a redelivery matches nothing.
  → room_finished       → close every still-open participation row for that meeting,
                          scoped `left_at is null` so re-running is a no-op. This is
                          the reconciliation for a dropped participant_left — what a
                          killed browser tab produces. It does NOT set ended_at: an
                          emptied room is not an ended meeting (see Lifecycle), and
                          the link stays joinable until expires_at.

BOTH TIMESTAMPS COME FROM LIVEKIT'S CLOCK, never now(): joined_at from
participant.joinedAt, left_at from the event's own createdAt. A
delivery that arrives late, or succeeds only on its third retry, still records when
the thing happened rather than when we heard about it. One clock source is also what
keeps the `left_at >= joined_at` CHECK unreachable.

An event naming a room code with no meeting answers 200, not an error: LiveKit
retries non-2xx, and no retry conjures a meeting that never existed.

Nightly pg_cron sweep (the only writer of meetings.ended_at), 03:17 UTC:
  → meetings where ended_at is null and expires_at < now() - interval '2 hours'
      → close any participation rows still open,
        left_at = greatest(joined_at, expires_at)
      → then ended_at = expires_at
    The 2-hour grace is what lets it close open rows safely — see Expiry policy.
    The greatest() is not decoration: /api/token only checks expiry when it MINTS,
    so a token issued a second before expires_at produces a join after it, and an
    unclamped left_at would violate the row's CHECK. Both statements share one
    plpgsql call, so that one row would abort the sweep for every meeting.
```

### Reading call history

```
/history (Server Component)
  → createServerClient() → supabase.auth.getUser()
  → null user → redirect('/')
  → [1] meeting_participants embedding meetings, where user_id = auth.uid(),
        newest first, limit 50   (RLS independently enforces the same scope)
  → [2] meeting_participants where meeting_id in (those meetings)
        The co-participant names. Two queries rather than one nested embed, so the
        grouping below is a pure function unit tests can reach.
  → buildHistoryEntries(): ONE ENTRY PER MEETING, not per row. A rejoin — which a
        dropped connection produces routinely — contributes two rows to one entry,
        whose span runs from the user's first join to their last leave.
  → duration is one of three states, never a single fallback chain:
        row closed                        → recorded
        row open, meeting still joinable  → in-progress   (a live call)
        row open, meeting over            → estimated from ended_at ?? expires_at
  → render; timestamps are formatted in the BROWSER — see the invariant below

The session client throughout, never supabaseAdmin. `read participation in
meetings you joined` admits exactly these rows, so RLS enforces the scope a second
time underneath the explicit .eq(). This is the only surface where that holds:
every other read serves guests, who have no session at all.
```

---

## Data Model

All tables live in the `public` schema with row-level security (RLS) enabled.
Writes go exclusively through the service-role client inside route handlers.
Guests have no Supabase session and therefore no JWT they could use to write.

### `profiles`

This table mirrors `auth.users`. A trigger populates it when a user is created.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` | PK, references `auth.users(id)` on delete cascade |
| `display_name` | `text` | From the Google profile. Not user-editable — profile editing is out of scope |
| `avatar_url` | `text` | Nullable, from the Google profile |
| `created_at` | `timestamptz` | Default `now()` |

RLS permits `select` where `id = auth.uid()`. There is **no `update` policy**,
and none is needed. The `auth.users` trigger writes the row once, and profile
editing is out of scope. All application writes also use the service-role client,
which bypasses RLS.

An `update` policy would be unused code suggesting a feature that does not exist.
If profile editing is ever built, add the policy in that feature's migration.

### `meetings`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `code` | `text` | Unique, not null, matches the `xxx-xxxx-xxx` room-code shape |
| `created_by` | `uuid` | Nullable, references `profiles(id)` on delete set null — null means a guest created it |
| `created_at` | `timestamptz` | Default `now()` |
| `expires_at` | `timestamptz` | Not null, default `now() + interval '24 hours'`. After this, the code no longer mints tokens |
| `ended_at` | `timestamptz` | Nullable; set only by the expiry sweep, to `expires_at` — never by `room_finished` |

Indexes: unique on `code`; `(expires_at) where ended_at is null` for the sweep.

#### When a meeting can be joined

A meeting is joinable when `ended_at is null and now() < expires_at`.
`/api/token` checks this condition and refuses otherwise. Possessing a room code
does not, by itself, authorize a join.

#### Expiry policy

Expiry prevents new joins. It does not disconnect people already in the room.

- **No new joins after `expires_at`.** `/api/token` returns `410`.
- **No token outlives the meeting.** TTL is `min(1h, expires_at − now)`, so a token minted at hour 23 of a 24-hour window is valid for one hour, not four.
- **A call already in progress is allowed to finish.** LiveKit automatically refreshes connected clients' session tokens, so expiry does not eject participants. Letting a conversation finish is preferable to cutting it off mid-sentence for a 24-hour bookkeeping limit.
- **The nightly sweep waits 2 hours past `expires_at`, then closes everything, including open participation rows.** This ends every meeting and provides a fallback when `room_finished` is dropped.

The grace period resolves a conflict. A dropped `room_finished` usually means
`participant_left` was dropped too. Skipping meetings with open rows would leave
exactly those missed events unreconciled. Closing a meeting while people are
still in it, however, would assign `left_at` to people who have not left.
Two hours after a 24-hour expiry, a still-running call is implausible; remaining
open rows are treated as stale bookkeeping.

#### Lifecycle

Pressing "New meeting" creates a meeting. It stays joinable until `expires_at`,
regardless of how often the room empties in between.

A LiveKit room has a separate lifetime. LiveKit creates it on the first join and
closes it when the departure timeout passes after the last person leaves. A later
join under the same code creates a fresh room. `room_finished` closes only the
participation rows for that room session.

The original design also ended the meeting on `room_finished`, which broke a
common invitation flow. A host could join, wait, and leave before the guest
arrived. The empty room would end the meeting, so the guest's link would answer
`410 This meeting has ended`.

Only the nightly `pg_cron` sweep closes a meeting, 2 hours past `expires_at`.
It also handles meetings that were created but never joined, such as when someone
presses "New meeting" and then closes the tab. Those meetings appear in nobody's
history because history is based on participation rows, not meeting rows.

### `meeting_participants`

Each join creates one row. If a participant rejoins, that creates a second row.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `meeting_id` | `uuid` | References `meetings(id)` on delete cascade, not null |
| `user_id` | `uuid` | Nullable, references `profiles(id)` on delete cascade — null for guests |
| `identity` | `text` | The LiveKit participant identity, not null; how webhooks match join to leave |
| `display_name` | `text` | Snapshot at join time, not null |
| `is_guest` | `boolean` | **Generated**: `generated always as (user_id is null) stored`. Never written by application code, so it cannot drift from `user_id` |
| `joined_at` | `timestamptz` | Not null, default `now()` |
| `left_at` | `timestamptz` | Nullable; set by the `participant_left` webhook, by `room_finished`, or by the expiry sweep |

Indexes: `(user_id, joined_at desc)` for the history query, `(meeting_id)` for
co-participant lookup, and a partial unique index on `(meeting_id, identity)
where left_at is null` so a leave event resolves to exactly one open row.

### RLS and the recursion trap

The intended policy lets you read a participation row if you have a participation
row in the same meeting. Written directly, that makes a `meeting_participants`
policy query `meeting_participants`. Postgres applies RLS to the inner query too,
causing infinite recursion. The failure happens at migration time.

A `security definer` function avoids this recursion by running with its owner's
rights, without re-entering the policy. Because it bypasses RLS on the tables it
uses, the `auth.uid()` check must be **inside the body**. Otherwise, the function
would answer whether anyone is a participant, rather than whether the caller is:

```sql
-- The helper lives in `private`, NOT `public`. A security definer function in an
-- API-exposed schema is callable as RPC by any authenticated user; `private` is
-- not in PostgREST's exposed schemas, so it has no HTTP surface at all.
create schema if not exists private;

create or replace function private.is_meeting_participant(target_meeting uuid)
returns boolean
language sql
security definer
stable
set search_path = ''       -- empty, so every relation below must be fully qualified
as $$
  select exists (
    select 1 from public.meeting_participants
    where meeting_id = target_meeting
      and user_id = (select auth.uid())
  );
$$;

-- `authenticated` MUST keep EXECUTE. Postgres evaluates a policy expression as
-- the calling user, so revoking it makes every read fail with
-- "permission denied for function is_meeting_participant". Granting costs
-- nothing: the schema is what hides it, and the function only ever answers about
-- its own caller.
grant execute on function private.is_meeting_participant(uuid) to authenticated;

-- meeting_participants: every row in a meeting you took part in — which already
-- includes your own rows, since a row of yours IS proof you were in that meeting.
-- A separate "read own participation" policy would be a strict subset, and
-- Postgres evaluates every permissive policy on every candidate row.
create policy "read participation in meetings you joined" on public.meeting_participants
  for select to authenticated
  using ((select private.is_meeting_participant(meeting_id)));

-- meetings: only those you took part in.
create policy "read joined meetings" on public.meetings
  for select to authenticated
  using ((select private.is_meeting_participant(id)));

-- profiles: your own.
create policy "read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
```

Always wrap `auth.uid()` in a subselect. Without the wrapper, Postgres evaluates
it once per candidate row. With the wrapper, it evaluates once for the query.

Neither table has `insert`, `update`, or `delete` policies. All writes use
`supabaseAdmin`, which bypasses RLS. Guests have no JWT for writing, so there is
no client-side write path for these policies to authorize.

#### Why chat has no table

Chat messages are not part of the data model. There is no table for them and there
must never be one. The server cannot decrypt them; keeping ciphertext it could
never read would serve no purpose.

---

## Authentication

- Provider: Supabase Auth
- Methods: Google OAuth (PKCE flow) — the only sign-in method. Guests are unauthenticated and have no Supabase session at all.
- Protected: `/history` (redirects to `/` when there is no session)
- Public: `/`, `/room/[code]`, `/auth/callback`, `/auth/signout`, `/api/token`, `/api/meetings`, `/api/livekit/webhook`, `/healthz`
- `/healthz` is public and **excluded from the proxy matcher**, so it never contacts Supabase. Refreshing a session in a liveness probe would make the platform's own health check a dependency of the auth service.

  `tests/unit/proxy-matcher.test.ts` verifies the exclusion. The original e2e
  assertion passed even without it: `updateSession` only sets cookies when a
  session needs refreshing, so an anonymous request sets no cookies either way.
- `src/proxy.ts` refreshes the Supabase session cookie on every non-static request, preventing pages from rendering with a stale token. Next 16 renamed the file convention from `middleware`; this was only a rename. Keeping the old name produced a deprecation notice on every build.
- Always read server-side sessions with `supabase.auth.getUser()`. The `getUser()` call checks with the auth server again. Never use `getSession()` here: `getSession()` trusts the cookie.
- Sign-in must never block a call. Every public route works when the user is null, and the auth callback returns people to the path they came from.
- `/auth/signout` accepts only `POST`. A GET signout could be triggered by link prefetch, speculative loading, or a third-party `<img>`, ending a session without the user choosing to sign out. The handler returns `303` so the browser follows it with `GET` rather than POSTing again to Home.
- Resolve the callback's `next` parameter against `NEXT_PUBLIC_SITE_URL` and compare origins. Never use prefix matching. Both auth redirects use that environment value rather than the request's origin, which is unreliable behind Render's proxy that terminates TLS.
- Read the session on the server in `src/app/(shell)/layout.tsx`; this makes the shell routes dynamic. The header has no auth knowledge. It receives a rendered node through its `actions` prop.
- `/api/livekit/webhook` authenticates the sender rather than a user. It verifies LiveKit's signature over the raw request body.

---

## Key Patterns

### Supabase server client (Server Components and route handlers)

```ts
// src/lib/supabase/server.ts
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; the proxy already refreshed the session.
        }
      },
    },
  });
}
```

### Supabase browser client

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
```

### Supabase admin client — the only holder of the service-role key

```ts
// src/lib/supabase/admin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';

export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
```

### Minting a LiveKit access token

```ts
// src/lib/livekit/token.ts
import 'server-only';
import { AccessToken, type VideoGrant } from 'livekit-server-sdk';
import { serverEnv } from '@/lib/env.server';

/**
 * A token may never outlive the meeting it opens. Capped at one hour, or the
 * time left before `expires_at`, whichever is smaller.
 *
 * One hour is safe despite calls running longer: LiveKit refreshes the session
 * token of a *connected* client automatically, so this TTL governs how long the
 * token can be used to JOIN, not how long a call may last. A blip mid-call
 * reconnects on the server-refreshed token, not this one.
 */
const MAX_TOKEN_TTL_SECONDS = 60 * 60;

function tokenTtlSeconds(expiresAt: Date): number {
  const remaining = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return Math.min(MAX_TOKEN_TTL_SECONDS, remaining);
}

export async function mintAccessToken(params: {
  roomCode: string;
  identity: string;
  displayName: string;
  expiresAt: Date; // meetings.expires_at, already checked to be in the future
}): Promise<string> {
  const at = new AccessToken(serverEnv.LIVEKIT_API_KEY, serverEnv.LIVEKIT_API_SECRET, {
    identity: params.identity,
    name: params.displayName,
    ttl: tokenTtlSeconds(params.expiresAt),
  });

  const grant: VideoGrant = {
    room: params.roomCode,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };
  at.addGrant(grant);

  return at.toJwt();
}
```

The grant specifies exactly one room. Never issue a token with `roomAdmin`,
`roomCreate`, or a wildcard room. Only return a token to a caller who supplied
a syntactically valid room code.

### Room code generation

```ts
// src/lib/room-code.ts

// 32 unambiguous characters: no i, l, 0, or 1. A 32-char alphabet divides 256
// evenly, so byte % length introduces no modulo bias.
const ALPHABET = 'abcdefghjkmnopqrstuvwxyz23456789';
const GROUPS = [3, 4, 3] as const;

export const ROOM_CODE_PATTERN = /^[a-hj-km-z2-9]{3}-[a-hj-km-z2-9]{4}-[a-hj-km-z2-9]{3}$/;

/** 10 characters from a 32-symbol alphabet = 50 bits of entropy. */
export function generateRoomCode(): string {
  const length = GROUPS.reduce((sum, n) => sum + n, 0);
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);

  let cursor = 0;
  return GROUPS.map((size) => chars.slice(cursor, (cursor += size)).join('')).join('-');
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_PATTERN.test(code);
}
```

### End-to-end encrypted chat envelope

```ts
// src/lib/crypto/chat-message.ts
import { z } from 'zod';

import { MAX_CHAT_MESSAGE_LENGTH } from '@/lib/constants';

// Nothing here is base64: the packed bytes go raw onto the data channel. Only the
// key is encoded, and that belongs to `chat-key.ts`.
const IV_BYTES = 12; // AES-GCM standard nonce length.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Decrypted bytes are still untrusted input: any participant holding the link key
// can encrypt an arbitrary payload. A valid GCM tag proves the sender had the key,
// not that they sent well-formed data.
const ChatPlaintextSchema = z.object({
  body: z.string().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
  sentAt: z.number().int().positive(),
});

export type ChatPlaintext = z.infer<typeof ChatPlaintextSchema>;

/**
 * Returns `iv || ciphertext`. The sender identity is authenticated but not encrypted.
 *
 * Validates on the way out too, which is where MAX_CHAT_MESSAGE_LENGTH is actually
 * enforced — an input's `maxLength` is a courtesy, not a rule. The return type is
 * pinned to `Uint8Array<ArrayBuffer>` because `publishData` will not take the
 * `ArrayBufferLike` default, which admits a `SharedArrayBuffer`.
 */
export async function encryptChatMessage(
  key: CryptoKey,
  senderIdentity: string,
  message: ChatPlaintext,
): Promise<Uint8Array<ArrayBuffer>> {
  const validated = ChatPlaintextSchema.parse(message);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(senderIdentity) },
    key,
    encoder.encode(JSON.stringify(validated)),
  );

  const packed = new Uint8Array(new ArrayBuffer(IV_BYTES + ciphertext.byteLength));
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), IV_BYTES);
  return packed;
}

/** Throws if the payload was tampered with, the sender identity does not match, or
 *  the decrypted body is not a well-formed message. */
export async function decryptChatMessage(
  key: CryptoKey,
  senderIdentity: string,
  packed: Uint8Array,
): Promise<ChatPlaintext> {
  // What arrives from the data channel is typed `Uint8Array<ArrayBufferLike>`,
  // which admits a `SharedArrayBuffer`; Web Crypto's `BufferSource` excludes one.
  // The copy keeps a cast out of the codebase, as `encodeReaction` does going out.
  const bytes = Uint8Array.from(packed);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: bytes.subarray(0, IV_BYTES),
      additionalData: encoder.encode(senderIdentity),
    },
    key,
    bytes.subarray(IV_BYTES),
  );

  // parse throws on malformed JSON; ChatPlaintextSchema.parse throws on a valid
  // JSON value of the wrong shape. Both surface as the same "unreadable message".
  return ChatPlaintextSchema.parse(JSON.parse(decoder.decode(plaintext)));
}
```

AES-GCM authenticates `senderIdentity` as additional authenticated data. If a
participant replays someone else's ciphertext under their own name, the tag check
fails and `decrypt` throws.

### Reading the chat key from the URL fragment

```ts
// src/lib/crypto/chat-key.ts
import { fromBase64Url, toBase64Url } from '@/lib/crypto/base64url';

const KEY_PARAM = 'k';

export async function generateChatKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportChatKey(key: CryptoKey): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
}

export async function importChatKey(encoded: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64Url(encoded), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Fragments are never sent to a server, which is the entire point of storing the key here. */
export function readChatKeyFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get(KEY_PARAM);
}
```

### Route handler response shape

```ts
// src/lib/api.ts
import { NextResponse } from 'next/server';

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
```

---

## Invariants

### Secrets and privilege

- Read secrets from `process.env` only inside a `server-only` env module under `src/lib`, with **one module per service**. `env.server.ts` holds Supabase's service-role key, and `env.livekit.server.ts` holds LiveKit's pair. No other module reads `process.env.SUPABASE_SERVICE_ROLE_KEY`, `process.env.LIVEKIT_API_KEY`, or `process.env.LIVEKIT_API_SECRET`.
- **Give each service its own secret schema.** Parse each module when it is imported, so a misconfigured deployment fails at boot rather than on the first request.

  A shared schema for all secrets would make every consumer fail when any
  service's credential was missing. `/api/meetings` never calls LiveKit and must
  still build when LiveKit is unconfigured. The same coupling in production
  would stop meeting creation during a LiveKit key rotation.
- `serverEnv.SUPABASE_SERVICE_ROLE_KEY` is consumed in exactly one file, `src/lib/supabase/admin.ts`, which also begins with `import 'server-only'`.
- The LiveKit API secret is consumed only in `src/lib/livekit/token.ts` and `src/lib/livekit/webhook.ts`, both `server-only`.
- Keep only `NEXT_PUBLIC_*` values in `src/lib/env.ts`. It is safe to import from a Client Component only because it contains no secrets. Adding one would send it to every visitor.
- Files with the `'use client'` directive and files under `src/components/` or `src/hooks/` may read only environment variables prefixed `NEXT_PUBLIC_`.
- Mint LiveKit access tokens only inside `src/app/api/token/route.ts`. The browser must never construct, sign, or extend a token.
- Limit every LiveKit grant to exactly one room. Never set `roomAdmin`, `roomCreate`, or `roomList`.

  Include `canUpdateOwnMetadata` so a client can write its own raise-hand
  attribute. This gives it a claim only over itself and is the sole capability
  beyond joining, publishing, and subscribing. `tests/e2e/token-api.spec.ts`
  verifies all of these restrictions.

### Encryption

- Read the chat encryption key only through `readChatKeyFromHash(window.location.hash)`. Never include it in a fetch body, query string, request header, `console` call, analytics payload, or database write.
- The sign-in round trip is the only exception to reading the key from the hash alone. Hold the fragment in `sessionStorage`, which stays in the same origin and tab and is never transmitted. Restore it to the URL with `history.replaceState` before any read. Never put it in `next`, OAuth `state`, or any other parameter sent to Google or our server.
- Publish only the `Uint8Array` returned by `encryptChatMessage()` on the `vc.chat` data-channel topic. Never pass plaintext to `publishData`.
- Validate every payload received on `vc.reaction` against the fixed label set before rendering anything. The topic shows that the sender is in the room; it does not prove the data is well-formed. This check matters because reactions appear as text over someone's video.
- Never persist chat message contents in Postgres, `localStorage`, or `sessionStorage`.
- Never order or display a chat message using the sender's `sentAt`. The envelope includes this field and the schema validates it, but local arrival determines the transcript's order and timestamps. A peer's clock may be inaccurate or untrustworthy; sorting by it would let one client reorder everyone's transcript. `tests/e2e/chat.spec.ts` verifies the wire format. The ordering rule is enforced by having no sort at all.
- Never change a fragment's letter case. Its base64url key is case-sensitive. Any code that lowercases or uppercases an input must split off the fragment first.

  `parseRoomCodeInput` normalises the room code while leaving the fragment
  untouched; `buildInviteLink` carries it verbatim. A mistake here is silent:
  the call still works, but chat becomes unreadable.

  `tests/unit/lib/invite-link.test.ts` and `tests/e2e/invite.spec.ts` verify this.
  The latter also checks that the key appears in no request URL or body while
  the invite dialog is open and copying.
- `crypto.subtle` is called only from files under `src/lib/crypto/`.
- Use `crypto.getRandomValues` or `crypto.randomUUID` for cryptographic and room-code randomness. Never generate a code, key, nonce, or identity with `Math.random()`.

### Data access

- Load the meeting by code in `/api/token` and refuse a token unless `ended_at is null and now() < expires_at`. A syntactically valid code is insufficient.
- Write to `meetings` and `meeting_participants` only inside a route handler using `supabaseAdmin`. Browser code must never write to Postgres.
- Never include `meeting_participants.is_guest` in an insert or update. It is a generated column.
- Use LiveKit's clock for every participation timestamp: `participant.joinedAt` for `joined_at`, and the event's `createdAt` for `left_at`.

  No webhook path may use `now()` or a column default for time. A retried delivery
  would otherwise record a duration that never happened. To catch that mistake,
  `tests/e2e/livekit-webhook.spec.ts` checks event times deliberately set in the
  past; a handler using `now()` fails the test.
- Never write `meetings.ended_at` from a webhook. An empty LiveKit room does not end the meeting. Its link stays joinable until `expires_at`, and only the nightly sweep closes it. `tests/e2e/livekit-webhook.spec.ts` verifies this by minting a token after `room_finished`.
- Make every webhook-driven write idempotent, so returning `500` safely permits redelivery. For `participant_joined`, use the partial unique index and treat `23505` as already recorded. Scope `participant_left` and `room_finished` updates so redelivery matches no rows. Never add a webhook write that would duplicate data on redelivery.
- Never query a table from a subquery in that same table's RLS policy. Use the `private.is_meeting_participant` `security definer` function for co-participant checks.
- Put every `security definer` function in the `private` schema, never `public`. Set `search_path = ''` and fully qualify relations. PostgREST does not expose `private`, so it has no HTTP surface.
- Wrap `auth.uid()` in a subselect in every RLS policy, and specify the role with `to authenticated`.
- Validate every decrypted chat payload with `ChatPlaintextSchema` before use. Never treat a bare `JSON.parse` result as a message.
- Enable RLS on every table in the `public` schema. Each table must have an explicit `select` policy scoped through `auth.uid()`.
- Limit every history query to the current user's `auth.uid()` in the query itself, as well as through RLS.
- **Format every timestamp shown to a person in the browser.** Never format it on the server. Server-side `Intl` uses the server's timezone, which is UTC on Render, so its times are wrong for users outside that zone.

  The client must actually render the time again. `suppressHydrationWarning`
  keeps the server's text while hiding the warning, leaving the bug in place.
  Use a hydration flag through `useSyncExternalStore`, as `history-time.tsx`
  does. `tests/e2e/history.spec.ts` verifies this from a UTC+14 browser.
- Use `supabase.auth.getUser()` for server-side session reads. Never use `supabase.auth.getSession()` to authorize anything.
- Get display names from `profiles`, never `user_metadata`. Supabase's `raw_user_meta_data` is editable by the user and appears in `auth.jwt()`, so it is unsafe for authorization decisions. Using it for names would also create a second derivation alongside the `auth.users` trigger, which could drift from the names shown in call history.
- Change the database schema only by adding a file to `supabase/migrations/`. Never change it from application code at runtime.

### Media

- Acquire local camera and microphone tracks only through LiveKit APIs (`createLocalTracks`, `Room`, `setCameraEnabled`, `setMicrophoneEnabled`). Application code must never call `navigator.mediaDevices.getUserMedia` directly.
- Mirror only the local display, never the transmitted frames. Use the active source track's facing direction rather than a device label. A front-camera self-view may mirror; a rear-camera view must not. The post-build camera correction above explains the desktop fallback when direction is unspecified and the track restart subscription.
- Stop lobby preview tracks before connecting, or hand them to the room connection. Never leave a preview track running after joining.
- **Release a device when it is turned off in the lobby.** Call `track.stop()` and drop the reference. Muting would leave the hardware light on while the UI says off. The SDK also defers `setDeviceId` on a muted track, which would silently stop the device picker from working.
- Pass `requestPermissions: false` when enumerating devices. Otherwise, `Room.getLocalDevices` raises its own permission prompt. The lobby must own the product's only prompt.
- Never leave a surface waiting indefinitely for device acquisition. `getUserMedia` is not guaranteed to settle, so bound any request that cannot be waiting on a person with a timeout and resolve it to a rendered state.

  Never time out a request that may still be waiting on a permission prompt.
  A person taking time to answer is not a failure.
- Stop tracks as soon as they arrive if the code that requested them has already moved on. An abandoned request can still open a device, with no downstream reference left to close it.
- Hide the screen-share control when `navigator.mediaDevices.getDisplayMedia` is undefined, as it is in iOS and Android browsers.
- Keep mic and camera controls reachable in every call state, including reconnection. Only starting a screen share may be restricted by state. Stopping one must remain available throughout; reconnection is exactly when someone may want to stop broadcasting their screen.

### Design

- Keep literal colour, radius, type-size, and easing values only in the `:root` and `@theme inline` blocks of `src/app/globals.css`. Every other file uses Tailwind utilities.
- Mirror `context/Design/colors_and_type.css` in the `:root` block. Change brand values by copying them again from the kit, never by hand-editing `globals.css`. `_verify.mjs` compares the kit, `library-docs.md`, and `globals.css`, failing `npm run lint` if any two differ.
- Keep `@import 'tailwindcss'` above `:root` in `globals.css`. Some kit tokens share Tailwind theme namespace names (`--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--ease-*`). They resolve correctly only because `:root` comes after the generated theme block in the cascade. `_verify.mjs` checks this.
- Render the footer only through the `(shell)` route group. `/room/[code]` sits outside that group, preventing call surfaces from inheriting the shell's header and footer.
- Use exactly one typeface family throughout the application. No file may set a `font-family` outside the `--font-mono` stack.
- Never include emoji in a component, string constant, or user-facing copy.
- Keep the application dark-only, without `dark:` variants or a theme toggle.
- Never add a drop shadow to a card, dialog, popover, or dropdown. Express elevation through the `bg-1`…`bg-5` ladder.
- Reserve `signal` (red) for Leave and the local participant's own muted state. Mark degraded connections with text in the tile's label row, never a coloured dot. Connection quality must not give red a third meaning. `code-standards.md` previously allowed green/yellow/red here; F23 corrected it.
- Never render the grid backdrop behind or over a video tile.
- Never import from `context/Design/` anywhere under `src/`. Copy assets into `public/brand/` and mirror tokens into `globals.css`.
- Never import `animejs` into a component rendered inside `<LiveKitRoom>`.
- Disable or reduce every animation and transition under `prefers-reduced-motion: reduce`.

### Structure

- Never import from `src/components/` or `src/app/` anywhere under `src/lib/`.
- Keep product concepts such as meetings, participants, and rooms out of `src/components/ui/`.
- Validate request bodies with a Zod schema before doing any other work in route handlers under `src/app/api/`. If a handler takes no input, say so in a comment instead of parsing an empty schema for appearances. `/api/meetings` is the one such handler.
- Return either `apiOk(data)` or `apiError(code, message, status)` from route handlers under `src/app/api/`. Never return a bare `Response` or an object outside that shape.

  The `/auth/*` handlers are the sole, deliberate exception. The browser
  navigates to them rather than fetching them, so they return redirects.
  A JSON response would appear to the user as text.
- Make every page and panel usable without horizontal scrolling at a 360px viewport width and at all seven widths covered by `tests/e2e/responsive.spec.ts`.
- **Never add `loading.tsx` to a route that gates access.** Next flushes the loading shell before the route body runs, sending the HTTP status with it. After that, `notFound()` can only replace the UI and `redirect()` becomes client-side navigation.

  Both `/room/[code]` and `/history` gate access. F24 removed their skeletons
  for this reason. A skeleton is safe only where the server work is purely
  fetching data.
- **Treat `viewport-fit=cover` and safe-area padding as one decision.** The `viewport` export makes `env(safe-area-inset-*)` resolve, but also extends content under display cutouts. `.call-surface` and `.sheet-surface` must add padding for every inset. Applying only one half makes a notched phone worse than applying neither.
