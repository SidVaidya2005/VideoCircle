# Architecture

> **Role:** How the system is built — stack, structure, boundaries, data, and the invariants that must never be violated.
> **Read after** `project-overview.md`, before writing any code.
> **Relates to:** the stack here drives `code-standards.md` and `library-docs.md`.

## Stack

| Layer | Tool | Purpose |
| ----- | ---- | ------- |
| Language | TypeScript 6 (`strict`) | All application code, client and server. **Not 7** — see `constraints.md` → Tooling |
| Framework | Next.js 16 (App Router) | Routing, Server Components, route handlers, single deployable |
| UI runtime | React 19 | Component model |
| Real-time media | LiveKit Cloud (SFU) | Video/audio transport, screen share, TURN, simulcast, reconnection |
| Media client | `livekit-client` 2.21 + `@livekit/components-react` 2.9 | Room connection, track publication, React hooks and layout primitives |
| Token minting | `livekit-server-sdk` 2.17 | Server-side `AccessToken` JWTs and webhook signature verification |
| Auth | Supabase Auth (Google OAuth, PKCE) | Sign-in, session cookies, user identity |
| Auth glue | `@supabase/ssr` 0.12 | Cookie-based Supabase clients for Server Components, route handlers, the proxy |
| Database | Supabase Postgres | `profiles`, `meetings`, `meeting_participants` |
| DB client | `@supabase/supabase-js` 2.112 | Queries, and the service-role admin client |
| Encryption | Web Crypto API (`SubtleCrypto`, AES-GCM 256) | End-to-end encryption of chat messages in the browser |
| Styling | Tailwind CSS 4.3 | Utility styling; design tokens declared with `@theme` |
| Design system | VideoCircle design system (`context/Design/`) | Terminal-dark, mono-only visual language; token and specimen source of truth. Adapted from the MIT-licensed Anime.js kit |
| Typeface | JetBrains Mono via `next/font/google` | The single family, self-hosted at build time. Substitutes for the kit's licensed IoskeleyMono |
| UI primitives | shadcn/ui (Radix under the hood) | Dialog, dropdown, tooltip, popover, sheet, input, textarea, button — source lives in the repo, aliased to brand tokens. **No toast**: every transient failure is surfaced on the surface it happened on, and F24 decided against adding a second home for those messages |
| Motion | CSS transitions with the kit's easing curves; `animejs` outside the call | Brand motion without competing with WebRTC encoding on the main thread |
| Validation | Zod 4 | Request-body and env parsing at every server boundary |
| Linting | ESLint 9 + `eslint-config-next` | **Not 10** — `eslint-plugin-react` breaks on it; see `constraints.md` → Tooling |
| Unit tests | Vitest 4 | Crypto, room-code, formatting, and query-shaping logic |
| E2E tests | Playwright 1.62 | Lobby → join → leave flows with faked media devices |
| Hosting | Render (Web Service, Node runtime, **free tier**) | Single service running `next start`. Free instances sleep after 15 min idle and take ~1 min to wake — see `constraints.md` → Hosting |

Versions above name the **minor family** intended at planning time, not exact
pins — `2.112` means "2.112.x". `package.json` is the source of truth once feature
01 creates it; these are the floor, and a newer patch or minor within the same
major is expected and fine. A major-version bump is a decision, not an upgrade:
record it in `constraints.md`.

LiveKit Cloud is a hard requirement rather than a preference: Render does not
expose UDP, so neither an SFU nor a coturn TURN server can be self-hosted there.
Render runs the Next.js app; all media traverses LiveKit's infrastructure.

---

## Folder Structure

**Phase 0 built the foundation; everything else below is the target shape,**
filled in by the feature that needs it. Built so far:

- **F01** — root configs, `src/app/`, `src/lib/` (`env`, `env.server`, `api`, `constants`, `utils`), `tests/`
- **F02** — the `globals.css` token mirror, the `(shell)` route group, `src/components/{shell,home,ui}/`, `public/brand/`, the dev-only `/tokens` route
- **F03** — `supabase/` with seven migrations, `src/lib/supabase/`, `src/proxy.ts`, `src/types/database.ts`
- **F04** — `src/app/auth/{callback,signout}/`, `src/lib/auth/`, the header auth menu, and the `dropdown-menu` primitive
- **F05** — `src/lib/room-code.ts`, `src/lib/parse-room-code.ts`, the hero's join-by-code form, and the `input` primitive
- **F06** — `src/lib/crypto/{base64url,chat-key}.ts`, `src/app/api/meetings/`, and the hero's share panel. `src/middleware.ts` became `src/proxy.ts` at the Phase 1 checkpoint, per Next 16's rename
- **F07** — `src/app/room/[code]/{page,not-found}.tsx`, `src/components/room/room-experience.tsx`, `src/components/lobby/{self-preview,media-state-notice}.tsx`, `src/hooks/use-media-preview.ts`, `src/lib/media/classify-media-error.ts`, `src/lib/meetings.ts`. First consumer of `livekit-client`
- **F08** — the rest of `src/components/lobby/`, `src/hooks/{use-media-devices,use-copy-to-clipboard}.ts`, `src/lib/media/preferences.ts`. `use-media-preview.ts` grew from one-shot acquisition into the lobby's device controller, and `section-overline.tsx` moved from `home/` to `ui/` at its third caller
- **F09** — `src/app/api/token/`, `src/lib/env.livekit.server.ts`, `src/lib/meeting-state.ts`, `src/lib/livekit/{token,token-ttl,room-options,request-token}.ts`, `src/components/room/{room-shell,connected-panel}.tsx`, `src/components/lobby/join-failure-notice.tsx`. First consumers of `livekit-server-sdk` and `@livekit/components-react`
- **F10** — `src/components/room/{call-stage,video-grid,participant-tile,participant-count}.tsx` and `src/lib/{room-grid,initials}.ts`. `connected-panel.tsx` was deleted, its status strip and Leave absorbed into `call-stage.tsx`. The grid is ours rather than `GridLayout`/`ParticipantTile` — see `library-docs.md` → Rendering the participant grid
- **F11** — `src/components/room/{control-bar,control-button,leave-control}.tsx`, `src/hooks/use-call-shortcuts.ts`, `src/lib/keyboard.ts`, and the `tooltip` primitive. First consumer of `lucide-react`
- **F16** — `src/components/room/invite-dialog.tsx`, `src/lib/invite-link.ts`, and the `dialog` primitive. The lobby's copy button adopted the shared builder
- **F15** — `src/components/room/{reactions-provider,reaction-menu}.tsx`, `src/hooks/use-raise-hand.ts`, `src/lib/reactions.ts`, and the `popover` primitive. The token grant gained `canUpdateOwnMetadata`, which is what lets a client write its own raise-hand attribute
- **F14** — `src/components/room/{call-panel,participant-list}.tsx`, `src/hooks/use-media-query.ts`, `src/lib/participants.ts`, and the `sheet` primitive. `participant-count.tsx` was deleted — the headcount moved onto the participants control as a badge
- **F13** — `src/components/room/{focus-layout,tile-menu}.tsx` and `src/lib/room-focus.ts`. `participant-tile.tsx` gained the pin gesture, the menu, a `size` variant and the pinned marker; `video-grid.tsx` now chooses between grid and spotlight and owns the pin
- **F12** — `src/components/room/call-status.tsx` (the status strip, moved out of `call-stage.tsx` so the sharing banner and the connection line it replaces sit together) and `src/hooks/use-is-screen-share-supported.ts`. `video-grid.tsx` gained the `ScreenShare` source and `room-grid.ts` the `orderCallTiles` sort
- **F17** — `src/hooks/use-chat-key.ts` and `src/components/chat/chat-panel.tsx`, the first file under `components/chat/`. `CallPanelName` widened to `'participants' | 'chat'` and `control-bar.tsx` lost `PENDING_CONTROLS`, leaving no disabled control on the bar until F24 gated screen share on `Connected`. `room-experience.tsx` became the caller of `restoreChatKeyFragment()`, which had shipped uncalled since F04
- **F18** — `src/lib/crypto/chat-message.ts` and `src/hooks/use-encrypted-chat.ts`. The panel gained a plain input, a Send button and a message list; `call-stage.tsx` owns the transcript, because `CallPanel` unmounts its children when closed
- **F19** — `src/lib/chat-time.ts` and the `textarea` primitive. `chat-panel.tsx` grew the real composer, the relative-time tick and the near-bottom scroll pin; `call-stage.tsx` gained the seen mark the unread count derives from, and `closePanel` beside `togglePanel` so the sheet's own dismiss stamps it too

- **F20** — `src/app/api/livekit/webhook/`, `src/lib/livekit/{webhook,participation-event}.ts`, and `src/lib/participation.ts`. First server-side work since F09, and the first consumer of `WebhookReceiver`. A migration clamps the expiry sweep's `left_at`, which F20 is what makes reachable. `tsconfig.json`'s `target` moved ES2017 → ES2020: the SDK reports event times as `bigint`, and BigInt literals are illegal below that

- **F21** — `src/app/(shell)/history/page.tsx`, `src/lib/history.ts`, and `src/components/history/{history-list,history-empty,history-time}.tsx`. The `.history-row` column widths join `globals.css`. `tests/e2e/support/session.ts` arrived with it: the suite mints real Supabase sessions through the admin API, so signed-in pages are testable without Google's consent screen

- **F22** — `tests/e2e/support/viewport.ts` and `responsive.spec.ts`, the measured audit; `tests/e2e/sign-in.spec.ts`, which covers the one path that had none. `src/app/layout.tsx` gained the `viewport` export — the thing that makes every `env(safe-area-inset-*)` in the project resolve to anything at all — and `globals.css` gained `.call-surface` and `.sheet-surface` to pay those insets back. `sign-in.ts` moved the Supabase browser client behind a dynamic `import()`, taking 64 kB off Home

- **F23** — `src/lib/livekit/{disconnect-reason,connection-quality}.ts` and `src/components/room/disconnect-notice.tsx`. `onDisconnected` stopped pushing Home for every disconnect and now branches on the reason, which meant widening `RoomShell`'s prop to carry it; `call-status.tsx` gained the reconnect banner and put reconnecting above sharing; `participant-tile.tsx` gained the degraded-connection marker

- **F24** — `src/app/{error,global-error}.tsx`, `src/lib/media/media-failure-copy.ts` (moved out of `media-state-notice.tsx` so the three unreachable states are testable), and `tests/support/forbidden-copy.ts`, shared by the unit and e2e halves of the leak check. `control-bar.tsx` gates screen share on `Connected`; `chat-panel.tsx` gained jump-to-latest. **No `loading.tsx` anywhere, deliberately** — see `constraints.md` → Error and loading surfaces

- **F25** — `render.yaml`, `src/app/healthz/route.ts`, `engines.node` in `package.json`, and `tests/e2e/healthz.spec.ts`. `src/proxy.ts`'s matcher gained a `/healthz` exclusion, pinned by `tests/unit/proxy-matcher.test.ts` — the e2e assertion written for it **passed with the exclusion removed**, because `updateSession` only sets cookies when there is a session to refresh, so it was replaced by a unit test on the matcher that fails correctly

- **F26** — `tests/e2e/support/join.ts` (`joinAs`, `connectedStatus` and `CONNECT_TIMEOUT_MS`, lifted out of 12 specs in 7 variants) and `tests/e2e/media-failures.spec.ts`, with `stubMediaFailure` added to `support/media.ts`. The only `src/` change was `reactions-provider.tsx`: `toggleHand` now awaits the attribute write and reverts the control when it fails, because a lost write left the raiser as the only person who thought their hand was up

Not yet built: `types/meeting.ts` — domain types still live beside their consumers,
and nothing has yet needed a shared one. Deliberately absent: any `loading.tsx`,
and any toast primitive.

```
VideoCircle/
├── CLAUDE.md                          → agent entry point
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

| Folder | Owns |
| ------ | ---- |
| `src/app/(pages)` | Routing, layout composition, and Server Component data fetching. Owns no business logic and no direct third-party SDK calls beyond the Supabase server client. |
| `src/app/api` | HTTP boundary: parse, authorize, delegate to `src/lib`, shape the response. Contains no React and no rendering logic. |
| `src/components` | Presentation and local interaction state. Never reads `process.env` secrets, never constructs a Supabase admin client, never mints tokens, never talks to Postgres directly. |
| `src/components/ui` | Presentational primitives with no product knowledge — the shadcn-generated set plus the brand's own `section-overline`. Nothing here may know what a meeting is. |
| `src/components/shell` | The header/footer chrome rendered by the `(shell)` route group, plus the wordmark. Knows nothing about auth — the header takes a sign-in slot as a prop. |
| `src/hooks` | Reusable client-side stateful logic bridging LiveKit/Web Crypto to React. No JSX. |
| `src/lib` | Framework-agnostic logic and third-party client construction. Imports nothing from `src/components` or `src/app`. |
| `src/lib/auth` | Sign-in entry points and the redirect validation the callback depends on. `sign-in.ts` is `'use client'` — it is the only module that touches the chat-key stash. |
| `src/lib/crypto` | All Web Crypto usage. No other folder may call `crypto.subtle` directly. |
| `src/lib/meetings.ts` | Meeting lookup by code, `server-only`. Uses `supabaseAdmin` deliberately: RLS hides a meeting from the very guest opening its link, so the anon client would make every valid code look unknown. Existing here rather than in the page is what keeps the service-role client out of `src/app`. |
| `src/lib/participation.ts` | The participation writes, `server-only`. Every function is idempotent, which is what lets the webhook route answer `500` and let LiveKit redeliver. Takes a meeting id rather than a room code, so the lookup happens once per event instead of once per write, and decides nothing about whether the meeting *should* have been joined — LiveKit is reporting what already happened. |
| `src/lib/media` | Turns media-device failures into states the UI can render. Holds no React and no track lifecycle — that belongs to `src/hooks`. |
| `src/lib/meeting-state.ts` | The joinability decision, pure and free of `server-only` so every branch is testable without a database. The route handler does the IO and hands the row here. |
| `src/lib/livekit/token-ttl.ts` | The TTL cap, split out for the same reason: `token.ts` cannot be imported without the LiveKit secrets present. |
| `src/lib/env.*.server` modules | The only place secrets are read out of `process.env`, one module per service so an absent credential fails only its own consumers. `import 'server-only'` on line one. `env.server.ts` is Supabase's; `env.livekit.server.ts` is LiveKit's. |
| `src/lib/supabase/admin.ts` | The only consumer of `serverEnv.SUPABASE_SERVICE_ROLE_KEY`. `import 'server-only'` on line one. |
| `src/lib/livekit/token.ts` | The only place `serverEnv.LIVEKIT_API_SECRET` is used for signing. |
| `src/types` | Shared type declarations only. No runtime values, no logic. |
| `supabase/migrations` | Schema, indexes, and RLS policies as SQL. Schema is never mutated from application code. |
| `private` (DB schema) | Every `security definer` function. Not exposed by PostgREST, so nothing in it is reachable as RPC. |
| `tests` | Vitest and Playwright specs. No production code imports anything from here. |

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
    re-read at join time, because a meeting can close while someone sits in the lobby.

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
                          then set meetings.ended_at. Both scoped so re-running is a
                          no-op, which is why they need no transaction. Closing the
                          open rows is the reconciliation for a dropped
                          participant_left — what a killed browser tab produces.

ALL THREE TIMESTAMPS COME FROM LIVEKIT'S CLOCK, never now(): joined_at from
participant.joinedAt, left_at and ended_at from the event's own createdAt. A
delivery that arrives late, or succeeds only on its third retry, still records when
the thing happened rather than when we heard about it. One clock source is also what
keeps the `left_at >= joined_at` CHECK unreachable.

An event naming a room code with no meeting answers 200, not an error: LiveKit
retries non-2xx, and no retry conjures a meeting that never existed.

Nightly pg_cron sweep (backstop for a dropped room_finished), 03:17 UTC:
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

All tables live in the `public` schema with RLS enabled. Writes happen exclusively
through the service-role client inside route handlers, because guests have no
Supabase session and therefore no JWT to write with.

### `profiles`

Mirrors `auth.users`; populated by a trigger on user creation.

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` | PK, references `auth.users(id)` on delete cascade |
| `display_name` | `text` | From the Google profile. Not user-editable — profile editing is out of scope |
| `avatar_url` | `text` | Nullable, from the Google profile |
| `created_at` | `timestamptz` | Default `now()` |

RLS: `select` where `id = auth.uid()`. **No `update` policy**, and none is needed:
the row is written once by the `auth.users` trigger, nothing in scope edits a
profile, and every application write goes through the service-role client, which
bypasses RLS anyway. An `update` policy here would be dead code implying a feature
that does not exist. Add it in the same migration as profile editing, if that is
ever built.

### `meetings`

| Column | Type | Notes |
| ------ | ---- | ----- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `code` | `text` | Unique, not null, matches the `xxx-xxxx-xxx` room-code shape |
| `created_by` | `uuid` | Nullable, references `profiles(id)` on delete set null — null means a guest created it |
| `created_at` | `timestamptz` | Default `now()` |
| `expires_at` | `timestamptz` | Not null, default `now() + interval '24 hours'`. After this, the code no longer mints tokens |
| `ended_at` | `timestamptz` | Nullable; set by the `room_finished` webhook or by the expiry sweep |

Indexes: unique on `code`; `(expires_at) where ended_at is null` for the sweep.

**Joinability.** A meeting is joinable when `ended_at is null and now() < expires_at`.
`/api/token` enforces this and refuses otherwise — codes are not self-authorizing.

**Expiry policy.** Expiry closes the door; it does not clear the room.

- **No new joins after `expires_at`.** `/api/token` returns `410`.
- **No token outlives the meeting.** TTL is `min(1h, expires_at − now)`, so a token minted at hour 23 of a 24-hour window is valid for one hour, not four.
- **A call already in progress is allowed to finish.** LiveKit refreshes the session tokens of connected clients on its own, so participants are not ejected at the boundary. Cutting a live conversation mid-sentence to enforce a 24-hour bookkeeping limit would be worse than letting it drain, and `room_finished` sets `ended_at` when the last person leaves.
- **The nightly sweep waits 2 hours past `expires_at`, then closes everything — including open participation rows.** It is a backstop for a dropped `room_finished`, not a reaper. The grace period is what reconciles two things that would otherwise conflict: a dropped `room_finished` usually means `participant_left` was dropped too, so a sweep that skipped meetings with open rows would never fix the case it exists for; but closing a meeting people are still sitting in would write a `left_at` for participants who have not left. Two hours past a 24-hour expiry is long enough that a still-running call is implausible and anything remaining is stale bookkeeping.

**Lifecycle.** Meetings are created on "New meeting" and closed one of two ways: the
`room_finished` webhook sets `ended_at` when the LiveKit room empties, or a nightly
`pg_cron` sweep closes anything past `expires_at` that the webhook never closed. The
sweep is what handles a meeting that was created and never joined — common, since
pressing "New meeting" and then closing the tab produces exactly that. Such a meeting
appears in nobody's history, because history is driven by participation rows, not
meeting rows.

### `meeting_participants`

One row per join. A participant who rejoins produces a second row.

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

The natural policy — "you may read a participation row if you have a participation
row in the same meeting" — is a `meeting_participants` policy that queries
`meeting_participants`. Postgres re-applies RLS to that inner query and recurses
infinitely. It fails at migration time, not gradually.

The fix is a `security definer` function, which runs with the owner's rights and so
does not re-enter the policy. Because it bypasses RLS on what it touches, the
`auth.uid()` check must live **inside the body** — otherwise it answers "is anyone
a participant" rather than "am I":

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

`auth.uid()` is wrapped in a subselect everywhere. Bare, Postgres re-evaluates it
once per candidate row; wrapped, it evaluates once for the whole query.

There are no `insert`, `update`, or `delete` policies on either table. All writes go
through `supabaseAdmin`, which bypasses RLS — guests have no JWT to write with, so
there is no client-side write path to authorize.

**Chat messages are not modelled.** There is no table for them and there must
never be one — the server cannot decrypt them, and storing ciphertext it can never
read would be storage without purpose.

---

## Authentication

- Provider: Supabase Auth
- Methods: Google OAuth (PKCE flow) — the only sign-in method. Guests are unauthenticated and have no Supabase session at all.
- Protected: `/history` (redirects to `/` when there is no session)
- Public: `/`, `/room/[code]`, `/auth/callback`, `/auth/signout`, `/api/token`, `/api/meetings`, `/api/livekit/webhook`, `/healthz`
- `/healthz` is public **and excluded from the proxy matcher**, so it never touches Supabase — a liveness probe that refreshed a session would make the platform's own health check a dependency of the auth service. The exclusion is pinned by `tests/unit/proxy-matcher.test.ts`, not by an e2e assertion: the e2e written for it passed with the exclusion removed, because `updateSession` only sets cookies when there is a session to refresh, so an anonymous request sets none either way.
- `src/proxy.ts` runs on every non-static request and refreshes the Supabase session cookie so pages never render against a stale token. Next 16 renamed this file convention from `middleware`; it is a pure rename, and the old name printed a deprecation notice on every build.
- Session reads on the server always use `supabase.auth.getUser()`, never `getSession()` — `getUser()` revalidates against the auth server, `getSession()` trusts the cookie.
- Sign-in never blocks a call. Every public route works with a null user, and the auth callback returns the user to the path they came from.
- `/auth/signout` accepts `POST` only. A GET signout is fetched by link prefetch, by speculative loading, and by any third-party `<img>`, all of which would end a session without the user acting. It answers `303` so the browser follows with `GET` rather than re-POSTing to Home.
- The callback's `next` parameter is resolved against `NEXT_PUBLIC_SITE_URL` and origin-compared, never prefix-matched. Both auth redirects resolve against that env value rather than the request's own origin, which is not reliable behind Render's TLS-terminating proxy.
- The session is read server-side in `src/app/(shell)/layout.tsx`, which is what makes the shell routes dynamic. The header itself knows nothing about auth — it takes a rendered node as its `actions` prop.
- `/api/livekit/webhook` is not user-authenticated; it authenticates the *sender* by verifying LiveKit's signature over the raw request body.

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

The grant names exactly one room. A token is never issued with `roomAdmin`,
`roomCreate`, or a wildcard room, and never returned to a caller who did not supply
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

Binding `senderIdentity` as AES-GCM additional authenticated data means a
participant cannot replay someone else's ciphertext under their own name — the tag
check fails and `decrypt` throws.

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

**Secrets and privilege**

- Secrets leave `process.env` only inside a `server-only` env module under `src/lib`, **one per service**: `env.server.ts` holds Supabase's service-role key, `env.livekit.server.ts` holds LiveKit's pair. Nothing outside those modules reads `process.env.SUPABASE_SERVICE_ROLE_KEY`, `process.env.LIVEKIT_API_KEY`, or `process.env.LIVEKIT_API_SECRET`.
- **One schema per service, not one for all secrets.** Each module parses at import so a misconfigured deploy fails at boot rather than at first request — but a single shared schema makes every consumer fail on every other service's absent credential. `/api/meetings` does not call LiveKit and must not fail to build because LiveKit is unconfigured; in production the same coupling would take meeting creation down during a LiveKit key rotation.
- `serverEnv.SUPABASE_SERVICE_ROLE_KEY` is consumed in exactly one file, `src/lib/supabase/admin.ts`, which also begins with `import 'server-only'`.
- The LiveKit API secret is consumed only in `src/lib/livekit/token.ts` and `src/lib/livekit/webhook.ts`, both `server-only`.
- `src/lib/env.ts` holds `NEXT_PUBLIC_*` values only and never a secret, which is what makes it safe to import from a Client Component. Adding a secret to it would ship that secret to every visitor.
- No file containing the `'use client'` directive, and no file under `src/components/` or `src/hooks/`, reads any environment variable that is not prefixed `NEXT_PUBLIC_`.
- LiveKit access tokens are minted only inside `src/app/api/token/route.ts`; the browser never constructs, signs, or extends a token.
- Every LiveKit grant names exactly one room and never sets `roomAdmin`, `roomCreate`, or `roomList`. It carries `canUpdateOwnMetadata` so a client can write its own raise-hand attribute — a claim over itself and nothing else — and that is the only capability beyond joining, publishing and subscribing. `tests/e2e/token-api.spec.ts` pins all of it.

**Encryption**

- The chat encryption key is read only via `readChatKeyFromHash(window.location.hash)` and never appears in a fetch body, query string, request header, `console` call, analytics payload, or database write.
- The sole exception to "hash only" is the sign-in round trip, where the fragment is held in `sessionStorage` — same-origin, same-tab, never transmitted — and restored onto the URL with `history.replaceState` before any read. It is never placed in `next`, in OAuth `state`, or in any other parameter that reaches Google or our own server.
- Every payload published to the `vc.chat` data-channel topic is the `Uint8Array` returned by `encryptChatMessage()`; plaintext is never passed to `publishData`.
- Every payload received on `vc.reaction` is validated against the fixed label set before anything is rendered. Arriving over our own topic proves the sender is in the room, not that they sent something well-formed, and a reaction is drawn as text over someone's video.
- Chat message contents are never persisted — not to Postgres, not to `localStorage`, not to `sessionStorage`.
- Nothing orders or displays a chat message by the sender's `sentAt`. The envelope carries it and the schema validates it, but the transcript is ordered and timestamped by local arrival — a peer's clock is neither accurate nor trustworthy, and sorting by it lets one client reorder everyone's transcript. `tests/e2e/chat.spec.ts` pins the wire; the ordering rule is pinned by there being no sort at all.
- A fragment is never case-normalised. The key is base64url and case-sensitive, so any code that lowercases or uppercases a string is responsible for splitting the fragment off first — see `parseRoomCodeInput`, which normalises the room code and leaves the fragment untouched, and `buildInviteLink`, which carries it verbatim. This failure is silent: the call still works and only chat is unreadable. `tests/unit/lib/invite-link.test.ts` and `tests/e2e/invite.spec.ts` pin it, the latter also asserting the key appears in no request URL or body while the invite dialog is open and copying.
- `crypto.subtle` is called only from files under `src/lib/crypto/`.
- Cryptographic and room-code randomness comes from `crypto.getRandomValues` or `crypto.randomUUID`; `Math.random()` is never used to produce a code, key, nonce, or identity.

**Data access**

- `/api/token` loads the meeting by code and refuses unless `ended_at is null and now() < expires_at`; a syntactically valid code is never sufficient to mint a token.
- Every write to `meetings` and `meeting_participants` happens inside a route handler using `supabaseAdmin`; no browser code writes to Postgres.
- `meeting_participants.is_guest` is a generated column and is never included in an insert or update.
- Every participation timestamp is LiveKit's, never ours: `joined_at` from `participant.joinedAt`, `left_at` and `ended_at` from the event's `createdAt`. Nothing in the webhook path writes `now()` or relies on a column default for a time, because a retried delivery would then record a duration that never happened — and `tests/e2e/livekit-webhook.spec.ts` asserts against event times deliberately in the past, so a handler that used `now()` fails rather than merely being wrong.
- Every webhook-driven write is idempotent, and that is what makes answering `500` safe. `participant_joined` relies on the partial unique index and treats `23505` as already-recorded; `participant_left` and `room_finished` scope their updates so a redelivery matches no rows. Never add a webhook write that a redelivery would duplicate.
- No RLS policy on a table contains a subquery against that same table; co-participant checks go through the `private.is_meeting_participant` `security definer` function.
- Every `security definer` function lives in the `private` schema, never `public`, and sets `search_path = ''` with fully-qualified relations. `private` is not exposed by PostgREST, so nothing in it has an HTTP surface.
- Every RLS policy wraps `auth.uid()` in a subselect and names its role with `to authenticated`.
- Every decrypted chat payload is validated with `ChatPlaintextSchema` before use; a bare `JSON.parse` result is never treated as a message.
- RLS is enabled on every table in the `public` schema, and every table has an explicit `select` policy scoped through `auth.uid()`.
- Every history query is scoped to the current user's `auth.uid()` in the query itself, not only by RLS.
- **A timestamp shown to a person is formatted in the browser, never on the server.** `Intl` on the server uses the *server's* zone, which is UTC on Render — a server-rendered time is wrong for everyone outside it. The client must genuinely re-render: `suppressHydrationWarning` does not work here, because suppressing the warning means keeping the server's text, and the bug survives silently. Use a hydration flag through `useSyncExternalStore`, as `history-time.tsx` does. `tests/e2e/history.spec.ts` pins it from a UTC+14 browser.
- Server-side session reads use `supabase.auth.getUser()`; `supabase.auth.getSession()` is never used to authorize anything.
- A display name comes from `profiles`, never from `user_metadata`. Supabase's `raw_user_meta_data` is user-editable and surfaces in `auth.jwt()`, so it is unsafe for any authorization decision, and using it for a name would put a second derivation next to the `auth.users` trigger's, free to drift from what call history shows.
- Database schema changes are made only by adding a file to `supabase/migrations/`, never by application code at runtime.

**Media**

- Local camera and microphone tracks are acquired only through LiveKit APIs (`createLocalTracks`, `Room`, `setCameraEnabled`, `setMicrophoneEnabled`); `navigator.mediaDevices.getUserMedia` is never called directly in application code.
- Lobby preview tracks are stopped before, or handed to, the room connection — a preview track is never left running after join.
- A device turned off in the lobby is **released, not muted**. `track.stop()`, and the reference dropped. Muting leaves the hardware light on under a UI that says off, and the SDK defers `setDeviceId` on a muted track, so a device picker would silently stop working.
- Device enumeration passes `requestPermissions: false`. `Room.getLocalDevices` will otherwise raise a permission prompt of its own, and the lobby owns the only prompt in the product.
- Device acquisition never leaves a surface waiting indefinitely. `getUserMedia` is not guaranteed to settle, so any request that cannot be waiting on a person is bounded by a timeout and resolves to a rendered state. A request that *may* still be waiting on a permission prompt is never timed out — the person is not a fault condition.
- Tracks that arrive after the code that asked for them has moved on are stopped at the point they arrive. An abandoned request still opens the device, and nothing downstream holds a reference to close it.
- The screen-share control is not rendered when `navigator.mediaDevices.getDisplayMedia` is undefined, which is the case on iOS and Android browsers.
- Mic and camera controls are reachable in every call state, including while reconnecting. Screen share is the one control that may be gated, and only against *starting* one: stopping a share stays available in every state, because a reconnect is exactly when someone wants their screen to stop being broadcast.

**Design**

- Literal colour, radius, type-size, and easing values appear only in the `:root` and `@theme inline` blocks of `src/app/globals.css`; every other file uses Tailwind utilities.
- The `:root` block is a mirror of `context/Design/colors_and_type.css` — brand values change by re-copying from the kit, never by hand-editing `globals.css`. `_verify.mjs` compares three copies (kit, `library-docs.md`, `globals.css`) and fails `npm run lint` if any two disagree.
- `@import 'tailwindcss'` stays above `:root` in `globals.css`. Kit tokens whose names collide with a Tailwind theme namespace (`--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--ease-*`) resolve only because `:root` cascades after the generated theme block. Asserted by `_verify.mjs`.
- The footer renders from the `(shell)` route group only. `/room/[code]` sits outside it, so no call surface can inherit chrome.
- The application uses exactly one typeface family. No file sets a `font-family` other than the `--font-mono` stack.
- No emoji appear in any component, string constant, or piece of user-facing copy.
- No `dark:` variants and no theme toggle exist — the application is dark-only.
- No card, dialog, popover, or dropdown carries a drop shadow; elevation is expressed through the `bg-1`…`bg-5` ladder.
- `signal` (red) is used only for the Leave control and the local participant's own muted state. **Connection quality is not a third use** — a degraded connection is marked typographically in the tile's label row, never with a coloured dot. `code-standards.md` once offered green/yellow/red here and was corrected at F23.
- The grid backdrop is never rendered behind or over a video tile.
- Nothing under `src/` imports from `context/Design/`; assets are copied into `public/brand/` and tokens are mirrored into `globals.css`.
- `animejs` is never imported into any component rendered inside `<LiveKitRoom>`.
- Every animation and transition is disabled or reduced under `prefers-reduced-motion: reduce`.

**Structure**

- Nothing under `src/lib/` imports from `src/components/` or `src/app/`.
- Nothing under `src/components/ui/` references a product concept such as a meeting, participant, or room.
- Route handlers under `src/app/api/` that accept a request body validate it with a Zod schema before touching any other code. A handler that takes no input says so in a comment rather than parsing an empty schema for the look of it — `/api/meetings` is the one such handler.
- Route handlers under `src/app/api/` return either `apiOk(data)` or `apiError(code, message, status)` and never a bare `Response` or an unshaped object. The `/auth/*` handlers are the deliberate exception and the only one: they are navigated to by the browser rather than fetched, so they answer with a redirect — a JSON body would render to the user as text.
- Every page and panel is usable at a 360px viewport width with no horizontal scroll, and at the seven widths `tests/e2e/responsive.spec.ts` sweeps.
- **No `loading.tsx` on a route that gates.** Next flushes the loading shell before the route body runs, which sends the HTTP status — so `notFound()` can then only swap the UI and `redirect()` degrades to a client-side navigation. `/room/[code]` and `/history` both gate, and both lost a skeleton at F24 for exactly this. A skeleton is only safe where the server work is pure data fetching.
- **`viewport-fit=cover` and the safe-area padding are one decision, not two.** The `viewport` export is what makes `env(safe-area-inset-*)` resolve to anything, and it also puts content under the display's cutouts — so `.call-surface` and `.sheet-surface` must pay every inset back. Setting one without the other makes a notched phone worse than setting neither.
