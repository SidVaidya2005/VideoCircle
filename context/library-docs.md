# Library Docs

> **Role:** Project-specific usage patterns for each third-party library.
> **Read the relevant section** before using a library.
> **Relates to:** covers the integrations in `architecture.md`; defers to MCP servers and skills first.

Project-specific usage patterns for every third party library in this project.
This file only covers how we use each library in **this** specific project —
rules, patterns, and constraints specific to VideoCircle.

Read the relevant section before implementing any feature that touches these
libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check the project instruction file** (`CLAUDE.md`) at the project root — it lists installed skills and how to use them. Skills contain up-to-date API docs and patterns specific to this codebase.
2. **Check whether an MCP server is available** for that library in your environment. **Context7** covers every library in the stack. A **Supabase MCP server** may also be present (schema, migrations, advisors, logs) — it is deferred, so fetch its tools by name with `ToolSearch` before assuming it is there, and fall back to the `supabase` CLI if it is not. Never treat an MCP server as guaranteed; verify, then use it in preference to general knowledge.
3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via CLAUDE.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change
frequently and training data may be outdated.

---

## livekit-server-sdk (v2.17)

**Check first:** Context7 `/llmstxt/livekit_io_llms-full_txt`, then <https://docs.livekit.io>.

Server-only. This package must never appear in a client bundle — every module that
imports it starts with `import 'server-only'`.

### Setup

```ts
// src/lib/livekit/webhook.ts
import 'server-only';
import { WebhookReceiver } from 'livekit-server-sdk';
import { env } from '@/lib/env';

export const webhookReceiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
```

### Minting an access token

```ts
import { AccessToken, type VideoGrant } from 'livekit-server-sdk';

const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
  identity, // stable per participant; how LiveKit and our webhooks identify them
  name: displayName, // shown in the UI; not unique
  ttl: '4h',
});

const grant: VideoGrant = {
  room: roomCode,
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
  canPublishData: true, // required for chat, reactions, and raise-hand
};
at.addGrant(grant);

const token = await at.toJwt(); // async — always await
```

### Verifying a webhook

```ts
const rawBody = await request.text(); // NOT request.json()
const event = await webhookReceiver.receive(rawBody, request.headers.get('Authorization'));

switch (event.event) {
  case 'participant_joined':
    // event.room?.name is the room code; event.participant?.identity is our identity string
    break;
  case 'participant_left':
    break;
  case 'room_finished':
    break;
}
```

**Rules:**

- `toJwt()` is asynchronous in v2. Always `await` it; a forgotten `await` yields `[object Promise]` as the token and fails at connect time with an opaque error.
- `identity` is the join/leave correlation key. Ours is `user:<uuid>` for signed-in users and `guest:<uuid>` for guests — never a display name, which is neither unique nor stable.
- Grants always name exactly one room. Never set `roomAdmin`, `roomCreate`, or `roomList` — this project has no moderation features and a wildcard grant would let any token holder enter any meeting.
- TTL is `4h`, not the `10m` used in LiveKit's quickstart. The token is re-validated on reconnect, so a short TTL silently breaks recovery from a network blip partway through a long call.
- Webhook verification requires the exact raw bytes. Calling `request.json()` before `receive()` breaks the signature check.
- LiveKit retries webhooks on non-2xx responses, and that retry is what we want. Return `500` when the handler fails transiently so the event is redelivered; return `200` only for events we understand and deliberately ignore, or that could never succeed on a retry. Call history is a stated success criterion — swallowing a failed write to dodge a retry trades correctness for nothing.
- Webhook handlers must be idempotent; the same event can arrive more than once. Idempotency is precisely what makes returning `500` safe.
- Never rely on a webhook alone for a correctness-critical write. `room_finished` closes any participation rows a dropped `participant_left` left open, and the nightly expiry sweep backstops a dropped `room_finished`.
- `participant_joined` fires only once the participant is `active` (media connected), so it is a reliable signal that someone actually made it into the call.

---

## livekit-client + @livekit/components-react (v2.21 / v2.9)

**Check first:** Context7 `/livekit/components-js`, then <https://docs.livekit.io/reference/components/react>.

Client-only. Every file touching these packages carries `'use client'`.

### Setup

```tsx
// src/components/room/room-shell.tsx
'use client';

import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';

interface RoomShellProps {
  serverUrl: string;
  token: string;
  initialAudio: boolean;
  initialVideo: boolean;
  onLeave: () => void;
  children: React.ReactNode;
}

export function RoomShell({
  serverUrl,
  token,
  initialAudio,
  initialVideo,
  onLeave,
  children,
}: RoomShellProps) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={initialAudio} // carries the lobby's mic choice into the call
      video={initialVideo} // carries the lobby's camera choice into the call
      onDisconnected={onLeave}
    >
      {children}
      {/* Renders every remote audio track. Without it the call is silent. */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
```

### Rendering the participant grid

```tsx
'use client';

import { GridLayout, ParticipantTile, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function VideoGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks}>
      <ParticipantTile />
    </GridLayout>
  );
}
```

`withPlaceholder: true` on the camera source keeps a tile for participants whose
camera is off — without it, muting your camera makes you vanish from everyone's
grid instead of showing your name.

### Toggling microphone, camera, and screen share

```tsx
'use client';

import { useLocalParticipant } from '@livekit/components-react';

export function useMediaToggles() {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  return {
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    toggleMicrophone: () => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled),
    toggleCamera: () => localParticipant.setCameraEnabled(!isCameraEnabled),
    toggleScreenShare: () => localParticipant.setScreenShareEnabled(!isScreenShareEnabled),
  };
}
```

### Sending and receiving data-channel messages

```tsx
'use client';

import { useDataChannel } from '@livekit/components-react';
import { DATA_TOPIC } from '@/lib/constants';

const { send } = useDataChannel(DATA_TOPIC.CHAT, (message) => {
  // message.payload is Uint8Array (our ciphertext)
  // message.from is the RemoteParticipant, or undefined if they already left
  if (!message.from) return;
  void handleIncoming(message.from.identity, message.payload);
});

// Chat must arrive and must arrive in order.
await send(ciphertext, { reliable: true });
```

### Lobby preview tracks

```tsx
'use client';

import { createLocalTracks, type LocalTrack } from 'livekit-client';

const tracks: LocalTrack[] = await createLocalTracks({
  audio: { deviceId: selectedMicId },
  video: { deviceId: selectedCameraId },
});

// On unmount or on join, release them:
for (const track of tracks) track.stop();
```

**Rules:**

- `<RoomAudioRenderer />` must be inside `<LiveKitRoom>`. Forgetting it produces a call where video works and nobody can hear anything — a bug that is easy to misdiagnose as a media problem.
- `useTracks` requires `withPlaceholder: true` on `Track.Source.Camera` so camera-off participants still occupy a tile.
- Screen share uses `Track.Source.ScreenShare` and is separate from the camera track — a participant sharing their screen publishes both.
- Guard screen share behind a `typeof navigator.mediaDevices?.getDisplayMedia === 'function'` check. iOS Safari and Android Chrome do not implement it, and calling it throws.
- Reactions and raise-hand use `{ reliable: false }`; chat uses `{ reliable: true }`. Losing an emoji is fine, losing a message is not.
- Always stop lobby preview tracks before connecting. A leaked preview track keeps the camera light on and, on some devices, blocks the room from acquiring it.
- Never call `navigator.mediaDevices.getUserMedia` directly — use `createLocalTracks` so LiveKit owns track lifecycle and device switching.
- iOS Safari will not start audio playback without a user gesture. The lobby's Join button is that gesture, which is one more reason joining must never happen automatically on page load.
- Device labels from `enumerateDevices()` are empty strings until media permission is granted. Enumerate *after* acquiring the preview tracks, or the picker shows blank entries.
- Handle `RoomEvent.Disconnected`, `Reconnecting`, and `Reconnected` explicitly and render a state for each. Do not unmount the room tree on `Reconnecting`.

---

## @supabase/ssr (v0.12) + @supabase/supabase-js (v2.110)

**Check first:** the `supabase:supabase` skill and Context7 `/supabase/ssr`. If a
Supabase MCP server is available in your environment (`list_tables`, `get_advisors`,
`get_logs`, `generate_typescript_types`), it is the fastest way to inspect and verify
a live project — but it is deferred and may not be present, so confirm before relying
on it. The `supabase` CLI does everything the MCP server does.

Three clients, three distinct jobs. Using the wrong one is the most likely
security mistake in this codebase.

| Client | File | Key | Used by |
| ------ | ---- | --- | ------- |
| Browser | `src/lib/supabase/client.ts` | anon | Client Components (sign-in only) |
| Server | `src/lib/supabase/server.ts` | anon + user cookie | Server Components, route handlers |
| Admin | `src/lib/supabase/admin.ts` | **service role** | Route handlers writing meeting data |

### Setup

The canonical bodies for all three live in `architecture.md` → Key Patterns. Copy
them from there rather than writing new ones.

### Middleware session refresh

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    // The one sanctioned exception to reading env through `src/lib/env.ts`:
    // middleware runs in the Edge runtime under a bundle-size budget, and importing
    // the Zod-parsed env module pulls Zod in with it. Both values are NEXT_PUBLIC_
    // and inlined at build time, so nothing is lost but the parse.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // Prevents a CDN from caching one user's auth cookies and serving them to another.
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)'],
};
```

### Google sign-in

```ts
'use client';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
  },
});
```

### Auth callback

```ts
// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // `next` is attacker-influenced — only ever redirect to a same-origin path.
      return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/', origin));
    }
  }

  return NextResponse.redirect(new URL('/?error=auth', origin));
}
```

**Rules:**

- Use `supabase.auth.getUser()` for anything that authorizes. `getSession()` reads the cookie without revalidating it and must never gate access to data.
- The `setAll` callback in middleware must apply the `headers` argument as well as the cookies. Skipping it lets a proxy cache an authenticated response.
- In Server Components, `cookieStore.set()` throws; the `try`/`catch` in `src/lib/supabase/server.ts` swallowing that is deliberate and must not be "fixed".
- `supabaseAdmin` bypasses RLS entirely. Import it only in route handlers, never in a page, component, or hook, and always scope its queries explicitly.
- Guests have no Supabase session. Any code path reachable by a guest must work with `user === null` — that is the normal case, not an error.
- The `next` parameter on the auth callback is user-controlled. Always verify it starts with `/` before redirecting.
- Schema changes are files in `supabase/migrations/*.sql`, applied with `npx supabase db push`. That file is the artifact of record — it is reviewable, versioned, and replayable on a fresh database. Never `ALTER TABLE` from application code.
- MCP and the CLI are aids to *authoring and verifying* those files, not a substitute for them. Avoid `apply_migration` while a schema is still in flux: it writes straight to the remote project, so an iteration loop leaves a trail of half-right migrations you then have to reconcile by hand. Settle the schema locally or on a branch, then commit one clean migration.
- After any migration, check RLS and security findings — via `get_advisors` if the MCP server is available, otherwise by reviewing policies directly — and fix them before moving on. This project's RLS is easy to get subtly wrong; see the recursion note in `architecture.md`.
- Regenerate `src/types/database.ts` after every migration so the typed client stays honest.
- Supabase's newer publishable/secret key names are drop-in replacements for anon/service-role. If you migrate to them, change `src/lib/env.ts` and `.env.example` together and update the table in `code-standards.md`.

---

## Next.js 16 (App Router)

**Check first:** Context7 `/vercel/next.js`, then <https://nextjs.org/docs/app>.

### Async request APIs

```tsx
// Dynamic route params and cookies are Promises in Next.js 16.
export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // …
}

const cookieStore = await cookies();
const headerList = await headers();
```

### Route handler signature

```ts
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  // …
}
```

**Rules:**

- `params`, `searchParams`, `cookies()`, and `headers()` are all async. Forgetting an `await` produces a Promise where you expected a value and fails at runtime, not at build.
- Server Components are the default. Add `'use client'` only where state, effects, browser APIs, or handlers are genuinely needed, and put it on the smallest component that needs it.
- Route handlers only export HTTP-method functions. No React, no rendering.
- Use `redirect()` from `next/navigation` in Server Components — it throws internally, so never wrap it in a `try` block that would swallow the control flow.
- `next/image` for any bitmap asset. Avatars from Google require their host to be listed in `next.config.ts` under `images.remotePatterns`.
- The whole app is dynamic (session cookies everywhere). Do not add `revalidate` or `unstable_cache` to anything user-scoped.

---

## Tailwind CSS 4.3

**Check first:** Context7 `/tailwindlabs/tailwindcss.com`, then <https://tailwindcss.com/docs>.

Tailwind 4 has no `tailwind.config.js`. Configuration is CSS: one `@import` and one
`@theme` block.

### Setup

Two blocks. `:root` holds the Anime.js kit's variables under **their original
names**, copied from `context/Design/colors_and_type.css` so the kit remains the
upstream source. `@theme inline` maps them to readable Tailwind utilities. These
are the only two places in the codebase where a literal value may appear.

```css
/* src/app/globals.css */
@import 'tailwindcss';

/* ---- Anime.js design system tokens — mirror of context/Design/colors_and_type.css.
        Update by re-copying from the kit, never by hand-editing a value here. ---- */
:root {
  /* Elevation ladder */
  --bg-1: #252423;  /* page — warm near-black, never true black */
  --bg-2: #2a2928;  /* card */
  --bg-3: #2f2e2d;  /* raised */
  --bg-4: #353433;  /* overlay */
  --bg-5: #3a3938;  /* higher overlay */

  /* Foreground ladder */
  --fg-1: #dddcda;  /* primary text */
  --fg-2: #c6c3c1;  /* secondary text */
  --fg-3: #96918f;  /* tertiary / labels */
  --fg-4: #65655e;  /* muted / disabled */
  --fg-5: #33332e;  /* divider / border */

  --white-1: #f6f4f2;  /* active-state fill */
  --white-2: #b8b6b3;  /* active-state hover */

  /* Signal + status */
  --red-1: #ff4b4b;
  --red-4: #532a29;
  --green-1: #6aff65;
  --yellow-1: #ffcc2a;
  --accent-cyan: #4bfffd;

  /* Grid backdrop */
  --grid-line-major: rgba(255, 255, 255, 0.05);
  --grid-line-minor: rgba(255, 255, 255, 0.04);

  /* Functional shadows only */
  --shadow-soft: 0 10px 10px 0 var(--bg-1);
  --shadow-ring: 0 0 0 1px rgba(255, 255, 255, 0.1);
  --glow-red: 0 0 24px rgba(255, 75, 75, 0.5);
}

@theme inline {
  /* Surfaces → bg-canvas, bg-card, bg-raised, bg-overlay, bg-lifted */
  --color-canvas: var(--bg-1);
  --color-card: var(--bg-2);
  --color-raised: var(--bg-3);
  --color-overlay: var(--bg-4);
  --color-lifted: var(--bg-5);

  /* Text → text-ink, text-ink-2, text-muted, text-faint, border-line */
  --color-ink: var(--fg-1);
  --color-ink-2: var(--fg-2);
  --color-muted: var(--fg-3);
  --color-faint: var(--fg-4);
  --color-line: var(--fg-5);

  --color-active: var(--white-1);
  --color-active-hover: var(--white-2);

  --color-signal: var(--red-1);
  --color-signal-dim: var(--red-4);
  --color-good: var(--green-1);
  --color-warn: var(--yellow-1);
  --color-burst: var(--accent-cyan);

  /* One family. --font-jetbrains-mono is set by next/font in the root layout. */
  --font-mono: var(--font-jetbrains-mono), 'IoskeleyMono', 'IBM Plex Mono', ui-monospace, monospace;

  /* Terminal type scale — visible jumps, no in-between sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --text-3xl: 2.5rem;
  --text-4xl: 3.5rem;
  --text-5xl: 5rem;

  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;

  --tracking-tight: -0.01em;
  --tracking-wide: 0.06em;   /* the signature overline gesture */
  --tracking-wider: 0.12em;

  --radius-xs: 0.25rem;   /* inputs, small chips */
  --radius-sm: 0.4rem;    /* buttons */
  --radius-md: 0.6rem;    /* chip toggles */
  --radius-lg: 1rem;      /* cards, panels */
  --radius-xl: 1.25rem;   /* hero panels */

  /* The brand's own curves */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

html {
  color-scheme: dark; /* native form controls and scrollbars render dark */
}

/* The signature double grid. Home, lobby, and empty states only — never over video. */
.grid-backdrop {
  background-image:
    linear-gradient(var(--grid-line-minor) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-minor) 1px, transparent 1px),
    linear-gradient(var(--grid-line-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-major) 1px, transparent 1px);
  background-size: 10px 10px, 10px 10px, 100px 100px, 100px 100px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Loading the typeface

```tsx
// src/app/layout.tsx
import { JetBrains_Mono } from 'next/font/google';

// Self-hosted at build time — no runtime request to Google.
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="bg-canvas text-ink font-mono">{children}</body>
    </html>
  );
}
```

**Rules:**

- The `:root` block mirrors `context/Design/colors_and_type.css`. To change a brand value, change it in the kit and re-copy — never hand-edit a hex here.
- Every other file consumes utilities only: `bg-card`, `text-muted`, `border-line`, `ease-out-quint`. A raw colour anywhere else is a bug.
- **Dark only.** There is no `dark:` variant, no `@custom-variant dark`, and no theme toggle — the kit ships no light palette.
- Full-height regions use `h-dvh` or `min-h-dvh`, never `h-screen` — mobile Safari's `100vh` includes the collapsing browser chrome and clips the control bar off the bottom of a call.
- Tailwind 4 has no `tailwind.config.js`. Everything above is the configuration.
- `prettier-plugin-tailwindcss` owns class ordering. Do not reorder classes by hand.
- Build mobile-first: unprefixed utilities target the phone, `sm:`/`md:`/`lg:` widen from there.

---

## Anime.js Design System (`context/Design/`)

**Check first:** `context/Design/README.md` for the full specification, then
`context/Design/preview/*.html` for specimens and `context/Design/ui_kits/` for
working component code.

This is a brand kit, not a runtime dependency. Nothing imports from
`context/Design/` — assets are copied out and tokens are mirrored into
`globals.css`.

### The kit's code is a visual reference, not production source

`preview/*.html` and `ui_kits/**/*.jsx` are prototypes. They use inline styles, raw
hex, and raw pixel values — all of which this project forbids. **Translate them into
tokens and Tailwind utilities; never paste them in.**

They also contradict the kit's own rules in places. `ClockControls.jsx` sets
`background: '#1a1a1a'`, a cool near-black, when non-negotiable #1 is warm
`#252423`. Where a specimen and `README.md` disagree, **`README.md` wins** — it is
the specification, the examples are sketches.

Read them for layout, proportion, and interaction feel. Take values from
`colors_and_type.css`.

### Product overrides

Two places where VideoCircle deliberately departs from the kit. These are decisions,
not oversights — do not "correct" them back:

| Kit says | VideoCircle does | Why |
| -------- | ---------------- | --- |
| Active chips and selected cards fill with **red** (`--red-1`) and flip text to `--bg-1` | Active controls fill with **white** (`--white-1`); red is reserved for Leave and your own muted state | A call shows many simultaneous active toggles. If "active" is red, red stops meaning "danger" precisely when it matters most. The kit's inverted-fill *shape* is kept; only the hue changes. |
| Reactions are not addressed; emoji are banned outright | Reactions are wide-tracked CAPS chips plus the red-dot burst | Keeps the feature without breaking non-negotiable #4. |

### What is where

| Path | Use it for |
| ---- | ---------- |
| `README.md` | The specification: voice, colour, type, motion, hover states, borders, layout. Read in full before designing a surface. |
| `colors_and_type.css` | Token ground truth. Mirrored into `src/app/globals.css`. |
| `preview/*.html` | One specimen per concept — buttons, cards, form inputs, palette, type scale, grid backdrop, iconography. Reference, not source (see below). |
| `ui_kits/playground/ClockControls.jsx` | The canonical fixed control-strip layout: params pinned top, control row pinned bottom. **The layout model for the meeting room** — its inline styles are not. |
| `ui_kits/playground/ScopeCanvas.jsx` | Grid backdrop and the red-on-black "scope" language. |
| `ui_kits/site/` | Marketing surfaces — hero, nav, feature grid, footer. The model for Home. |
| `assets/images/` | Real brand imagery. Copy into `public/`; never generate a substitute. |
| `fonts/` | IoskeleyMono woff2. **Not shipped** — licensed. Reference only. |
| `_adherence.oxlintrc.json` | Lint rules forbidding raw hex, raw px, and non-kit fonts. |

### Canonical interaction states

From `README.md` → *Hover & press states*. These are exact, not approximate:

```css
/* Primary button: white fill at rest, one step darker on hover. */
background: var(--white-1);  /* hover → var(--white-2) */

/* Chip / toggle: barely-there fill, doubling on hover. */
background: rgba(255, 255, 255, 0.05);  /* hover → rgba(255, 255, 255, 0.1) */

/* Active/engaged: inverted — solid fill, dark text. Also the keyboard-focus style. */
background: var(--white-1);
color: var(--bg-1);

/* Asymmetric by design: snaps on, relaxes off. */
transition: background-color 0.05s ease-out;          /* hover in */
transition: background-color 0.25s ease-in-out;       /* hover out */
```

**Rules:**

- **No emoji anywhere.** This is the kit's non-negotiable #4 and it applies to reactions, empty states, toasts, and copy alike.
- **No generated illustrations or decorative SVG.** If an asset does not exist in `context/Design/assets/`, use a typographic or geometric placeholder instead of inventing one.
- **No italics.** The font is used structurally.
- Icons are rare and stroked — Lucide at 2px, never filled, never a coloured fill icon. The kit flags Lucide as our substitution, not brand-official, so prefer a wide-tracked CAPS label over an icon whenever space allows.
- Copy follows the kit's voice: technical, plain, no hype words, second-person or imperative. Never corporate "we".
- Code identifiers and room codes render lowercase and verbatim, never prettified.
- Press states do not shrink. The background inverts instead.
- Elevation is the background ladder. Cards get no drop shadow.
- The grid backdrop bleeds past its container in the kit (`width: calc(75px + 100%); left: -75px`). Reproduce that on Home and the lobby; keep it off the call.

---

## shadcn/ui

**Check first:** <https://ui.shadcn.com/docs>, and read the existing components in `src/components/ui/` before adding a new one.

Components are generated into `src/components/ui/` and become project source. There
is no runtime dependency to upgrade.

### Adding a component

```bash
npx shadcn@latest add button dialog sheet dropdown-menu tooltip sonner
```

### Aliasing shadcn's tokens to the brand

shadcn components reference their own variable names. Alias them once in
`globals.css` so a generated component is already on-brand before you touch it:

```css
@theme inline {
  --color-background: var(--bg-1);
  --color-foreground: var(--fg-1);
  --color-card: var(--bg-2);
  --color-card-foreground: var(--fg-1);
  --color-popover: var(--bg-4);
  --color-popover-foreground: var(--fg-1);
  --color-primary: var(--white-1);
  --color-primary-foreground: var(--bg-1);
  --color-secondary: var(--bg-3);
  --color-secondary-foreground: var(--fg-1);
  --color-muted-foreground: var(--fg-3);
  --color-destructive: var(--red-1);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-input: rgba(255, 255, 255, 0.08);
  --color-ring: var(--white-1);
}
```

Note `--color-primary` is **white, not red** — the kit's engaged state is an
inverted white fill, and red is reserved for destructive actions.

**Rules:**

- Only add the primitives a feature actually needs. Each one pulls in Radix packages that ship to the browser.
- Restyle generated components to match the design system, but keep their Radix behaviour — the focus traps, escape handling, and ARIA wiring are the reason they are here.
- Strip drop shadows from every generated component. shadcn ships `shadow-md` and `shadow-lg` on dialogs, popovers, and dropdowns; the kit uses the background ladder plus a whisper border instead.
- Never edit a generated component to reach past the aliases for a raw value.
- Record non-trivial edits to a generated component in `build-journal.md`, so re-running `add` later does not silently revert them.
- Nothing in `src/components/ui/` may reference a meeting, participant, or room. Product logic belongs one level up.
- The chat and participants panels use `Sheet` on mobile and an inline side panel on desktop; they are the same content rendered in two shells, not two implementations.

---

## Web Crypto API

**Check first:** <https://developer.mozilla.org/docs/Web/API/SubtleCrypto>. This is a
browser API, not a package — there is no version to pin and nothing to install.

All usage is confined to `src/lib/crypto/`. The canonical implementations of
`chat-key.ts` and `chat-message.ts` are in `architecture.md` → Key Patterns.

**Rules:**

- AES-GCM, 256-bit keys, 12-byte random IV per message. Never reuse an IV with the same key — with GCM that is a total break, not a weakness.
- The IV is generated fresh inside `encryptChatMessage` for every single message. Never hoist it to a module constant.
- Bind the sender's LiveKit identity as `additionalData` so ciphertext cannot be replayed under a different name.
- Keys are imported with `extractable: false` (the `false` argument to `importKey`) so a stray `exportKey` call cannot leak one.
- `crypto.subtle` requires a secure context. It is `undefined` on plain HTTP, so local development must use `localhost` (which counts as secure) and production is HTTPS-only.
- `decrypt` throws on any tampering or key mismatch. Catch it and render the "unreadable message" placeholder — never let it reach the render tree.
- The key comes from `window.location.hash` and stays there. Do not copy it into React state that could be serialized, into `localStorage`, or into any URL that gets shared as a "join without chat" link.
- Anyone holding the link holds the key. This is the stated security model: it protects the conversation from the server and the network, not from someone the link was forwarded to.

---

## Zod 4

**Check first:** Context7 `/colinhacks/zod`, then <https://zod.dev>.

### Environment parsing

```ts
// src/lib/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().startsWith('wss://'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
});

// Next.js inlines NEXT_PUBLIC_* at build time only for statically written
// references, so each one must be spelled out rather than spread from process.env.
export const env = EnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
});
```

**Rules:**

- Every route handler validates its body with `safeParse` and returns `apiError('invalid_request', …, 400)` on failure. Never `parse` a request body — a throw there becomes a 500 for what is really a 400.
- Never return Zod's error object to the client; it describes internal field names.
- Zod 4 moved string formats to top-level functions: `z.url()`, `z.email()`, `z.uuid()`. `z.string().url()` is deprecated.
- `src/lib/env.ts` is the one place `parse` (throwing) is correct — a misconfigured deploy should fail at boot, loudly.

---

## Vitest 4 + Playwright 1.62

**Check first:** <https://vitest.dev> and <https://playwright.dev/docs/intro>.

Vitest covers pure logic. Playwright covers the flows that only exist in a real
browser with real media.

### Faking camera and microphone in Playwright

```ts
// playwright.config.ts
export default defineConfig({
  use: {
    permissions: ['camera', 'microphone'],
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream', // auto-grant the permission prompt
        '--use-fake-device-for-media-stream', // synthetic camera and mic
      ],
    },
  },
});
```

**Rules:**

- Unit-test `src/lib/crypto/`, `src/lib/room-code.ts`, and duration/format helpers. These are pure, fast, and the parts where a silent bug is most expensive.
- Crypto tests must include a round trip, a wrong-key failure, a tampered-ciphertext failure, and a mismatched-sender-identity failure. All three failures must throw.
- Room-code tests must assert alphabet membership, shape, and that a large sample has no collisions.
- Playwright covers at minimum: guest joins via link, lobby toggles carry into the call, two participants see each other, and chat round-trips between two browser contexts.
- Two-participant tests use two `browser.newContext()` instances, not two pages in one context — a shared context shares media permissions and storage in ways that hide real bugs.
- Never mock LiveKit in E2E tests. Mocking the SFU means testing our mock, which is exactly the layer that does not break.
- Vitest runs in the `node` environment by default; crypto tests need Node's global `crypto`, which is available from Node 20 onward.
