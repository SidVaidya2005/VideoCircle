# Library Docs

> **Role:** Project-specific usage patterns for each third-party library.
> **Read the relevant section** before using a library.
> **Relates to:** covers the integrations in `architecture.md`; defers to MCP servers and skills first.

This file explains how VideoCircle uses each third party library. It covers the
project's rules, patterns, and constraints, rather than general library usage.

Read the relevant section before building a feature that uses one of these
libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check the project instruction file** (`CLAUDE.md`) at the project root. It lists the installed skills and explains how to use them. Those skills contain current API documentation and patterns for this codebase.
2. **Check whether an MCP server is available** for the library. **Context7** covers every library in the stack. A **Supabase MCP server** may also be available for schema, migrations, advisors, and logs. Its tools are deferred: fetch them by name with `ToolSearch` before relying on them. If they are unavailable, use the `supabase` CLI. Verify that an MCP server exists before using it, and prefer it to general knowledge.
3. **Read this file** for project-specific patterns that take precedence over general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via CLAUDE.md → This file (project rules) → General training knowledge
```

Library APIs change frequently, and training data can be outdated. Never rely on
general training knowledge alone for an API.

---

## livekit-server-sdk (v2.17)

**Check first:** Context7 `/llmstxt/livekit_io_llms-full_txt`, then <https://docs.livekit.io>.

This package runs only on the server and must never enter a client bundle. Every
module that imports it must start with `import 'server-only'`.

Read secrets from `src/lib/env.livekit.server.ts`. Never put them in
`src/lib/env.ts`: that module contains only `NEXT_PUBLIC_*` values and can be
imported by a Client Component. A signing key added there would be sent to every
visitor.

### Setup

```ts
// src/lib/livekit/webhook.ts
import 'server-only';
import { WebhookReceiver } from 'livekit-server-sdk';
import { livekitEnv } from '@/lib/env.livekit.server';

export const webhookReceiver = new WebhookReceiver(
  livekitEnv.LIVEKIT_API_KEY,
  livekitEnv.LIVEKIT_API_SECRET,
);
```

### Minting an access token

```ts
import { AccessToken, type VideoGrant } from 'livekit-server-sdk';

const at = new AccessToken(livekitEnv.LIVEKIT_API_KEY, livekitEnv.LIVEKIT_API_SECRET, {
  identity, // stable per participant; how LiveKit and our webhooks identify them
  name: displayName, // shown in the UI; not unique
  ttl: tokenTtlSeconds(expiresAt), // min(1h, expires_at − now); never outlives the meeting
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

- `toJwt()` is asynchronous in v2. Always `await` it. Without `await`, the token becomes `[object Promise]`, and connection fails with an unclear error.
- `identity` connects join and leave events to the same participant. Use `user:<uuid>` for signed-in users and `guest:<uuid>` for guests. Never use a display name: it is neither unique nor stable.
- A grant must name exactly one room. Never set `roomAdmin`, `roomCreate`, or `roomList`. VideoCircle has no moderation features, and a wildcard grant would let a token holder enter any meeting.
- **TTL is `min(1h, expires_at − now)`** — capped so a token can never outlive the meeting it opens. See `architecture.md` → Expiry policy.
- **A short TTL still allows long calls.** LiveKit's token docs say the server *proactively refreshes tokens for connected clients* so they can reconnect after an interruption. A refreshed token lasts "10 minutes or the remaining lifetime of the original token, whichever is longer". The TTL on the token we mint therefore limits when someone can **join**, rather than how long the session can run. A brief interruption 90 minutes into a call reconnects using the server-refreshed token.
- A client that fully disconnects and re-joins calls `/api/token` again. That route re-checks the meeting's state. Keep this behaviour; it is intentional.
- Webhook verification requires the exact raw bytes. Calling `request.json()` before `receive()` breaks the signature check.
- LiveKit retries webhooks when it receives a non-2xx response. Return `500` for a transient handler failure so LiveKit delivers the event again. Return `200` only when we understand an event and deliberately ignore it, or when retrying could never succeed. Call history is a stated success criterion, so do not hide a failed write just to avoid a retry.
- Webhook handlers must be idempotent: receiving the same event more than once must be safe. This is what makes returning `500` safe.
- A correctness-critical write must have a fallback beyond a single webhook. If `participant_left` is lost, `room_finished` closes the participation rows it left open. If `room_finished` is lost too, the nightly expiry sweep closes them.
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
      options={ROOM_OPTIONS}
    >
      {children}
      {/* Renders every remote audio track. Without it the call is silent. */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
```

### Rendering the participant grid

**This project does not use `GridLayout` or `ParticipantTile`.** Their `lk-*`
markup needs `@livekit/components-styles` to lay out correctly, and that package is
not an approved dependency. `ParticipantTile` also includes a name chip, mute icon,
quality dot, and focus button that each conflict with `Design/README.md` →
Participant tiles.

Build the project's grid with the unstyled primitives below.

```tsx
'use client';

import { useTracks, useVisualStableUpdate } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function VideoGrid() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    onlySubscribed: false,
  });

  // Promotes whoever is speaking onto the visible page and holds the rest still,
  // so tiles do not shuffle every time someone mutes.
  const stable = useVisualStableUpdate(tracks, MAX_VISIBLE_TILES);

  return <ul>{/* one <ParticipantTile trackRef={…}/> per reference */}</ul>;
}
```

Set `withPlaceholder: true` on the camera source to keep a tile visible when a
participant's camera is off. Without it, turning off the camera removes the
participant from everyone's grid instead of showing their name.

Inside a tile:

- **`isTrackReference(ref)`** distinguishes a published camera from a placeholder. Show video when the reference is real and its publication is not muted. **Never gate rendering on `isSubscribed`.** Doing so deadlocks `adaptiveStream`, which chooses subscriptions from the visibility of attached `<video>` elements. If the tile waits for a subscription before rendering that element, the subscription never happens.
- **`useIsMuted(ref)`** treats an *absent* publication as unmuted. Handle that case yourself: a participant with no published microphone cannot be heard and must be shown as muted. The hook accepts a placeholder reference built inline. Its effect uses a derived id string, so creating a new object on each render does not resubscribe.
- **`useIsSpeaking(participant)`** controls the white ring. Both hooks take a participant explicitly rather than reading context. This lets each tile subscribe to its own participant instead of the whole room.

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

- Put `<RoomAudioRenderer />` inside `<LiveKitRoom>`. Without it, video works but nobody can hear anything, which can easily be mistaken for a media problem.
- `useTracks` requires `withPlaceholder: true` on `Track.Source.Camera` so camera-off participants still occupy a tile.
### Room options — the two settings that decide whether a grid is usable

```ts
// src/lib/livekit/room-options.ts
import type { RoomOptions } from 'livekit-client';

// Defined once, at module scope. <LiveKitRoom> re-creates its Room whenever
// this object's identity changes, so an inline literal reconnects on render.
export const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
};
```

- **Both settings default to `false`** in `livekit-client`. `<LiveKitRoom>` passes `options` directly to `new Room(options)` without overriding them. Leaving them out silently selects the slower behaviour.
- **`adaptiveStream: true`** chooses a resolution that matches the attached `<video>` element's size and pauses tracks that are not visible. Without it, twelve 200px tiles each receive and decode a full-resolution stream. This is the product's largest performance saving and determines whether a low-end phone can handle a full grid.
- **`dynacast: true`** stops publishing simulcast layers that no subscriber is using. It reduces upload bandwidth and encoder CPU use on the *sending* side.
- These settings make `MAX_VISIBLE_TILES = 12` practical. Pagination limits how many tiles are shown; adaptive stream limits the cost of each one.

- Screen share uses `Track.Source.ScreenShare`, separate from the camera track. A participant who shares their screen publishes both tracks.
- Check `typeof navigator.mediaDevices?.getDisplayMedia === 'function'` before offering screen share. **No mobile browser implements it.** MDN's browser-compat-data records `version_added: false` for Safari iOS, Chrome Android, Firefox Android, Samsung Internet, Opera Android, and Android WebView. Desktop Chrome, Edge, Firefox, and Safari all support it.
- **Checking for the method does not guarantee it works.** Chrome Android 72–88 and Firefox Android 66–79 exposed it but always rejected with `NotAllowedError`. They pass the `typeof` check, so always wrap the call itself in `try`/`catch`.
- **A share requested before the room connects is immediately unpublished.** The control bar appears as soon as the room tree mounts, before `ConnectionState.Connected`. Publishing during that window sends the share into a room that is not ready. This took an afternoon to diagnose in a test that clicked share too early. No error appears; the control simply stays unchanged.
- **Screen sharing with no other participants is unreliable.** LiveKit accepts the publish, then unpublishes it within about a second roughly half the time. Adding one subscriber makes it stable. Setting `dynacast: false` has no effect, so that likely cause has been ruled out, but the mechanism remains unknown. Our code holds no separate sharing state, so the UI follows the unpublish accurately.
- **Screen sharing with nobody else in the room is unreliable.** LiveKit accepts the publish, then unpublishes it within about a second roughly half the time. With one other participant, it stays stable across many runs. Setting `dynacast: false` has no effect, so that likely cause has been ruled out, but the mechanism remains unknown. Our code holds no separate sharing state, so the UI follows the unpublish accurately.
- **`livekit-client` clones the picker track and stops the original.** A reference to the stream returned by `getDisplayMedia` therefore holds a track whose state reads `ended` even while sharing works. The SDK listens for `ended` on its clone.
- **Treat `NotAllowedError` as a normal cancellation, not a fault.** Old Android versions threw it for unsupported sharing, but every browser also throws it when someone dismisses the picker. Dismissal is by far the usual cause. Quietly return the bar to rest; never show an error toast or log it as an error.
- Use `{ reliable: false }` for reactions and raise-hand, and `{ reliable: true }` for chat. Losing an emoji is acceptable; losing a message is not.
- Always stop lobby preview tracks before connecting. A leaked preview track keeps the camera light on and, on some devices, blocks the room from acquiring it.
- Never call `navigator.mediaDevices.getUserMedia` directly — use `createLocalTracks` so LiveKit owns track lifecycle and device switching.
- iOS Safari will not start audio playback without a user gesture. The lobby's Join button is that gesture, which is one more reason joining must never happen automatically on page load.
- `enumerateDevices()` returns empty device labels until media permission is granted. Enumerate devices after acquiring preview tracks so the picker has readable entries.
- Handle `RoomEvent.Disconnected`, `Reconnecting`, and `Reconnected` explicitly and render a state for each. Do not unmount the room tree on `Reconnecting`.

---

## @supabase/ssr (v0.12) + @supabase/supabase-js (v2.110)

**Check first:** the `supabase:supabase` skill and Context7 `/supabase/ssr`. A
Supabase MCP server, when available, is the fastest way to inspect and verify a live
project using `list_tables`, `get_advisors`, `get_logs`, and
`generate_typescript_types`. Its tools are deferred and may be absent, so confirm
they are available before relying on them. The `supabase` CLI can do everything
the MCP server does.

The three clients have separate jobs. Choosing the wrong one is the most likely
security mistake in this codebase.

| Client | File | Key | Used by |
| ------ | ---- | --- | ------- |
| Browser | `src/lib/supabase/client.ts` | anon | Client Components (sign-in only) |
| Server | `src/lib/supabase/server.ts` | anon + user cookie | Server Components, route handlers |
| Admin | `src/lib/supabase/admin.ts` | **service role** | Route handlers writing meeting data |

### Setup

Use the canonical implementations in `architecture.md` → Key Patterns for all
three clients. Copy them from there rather than writing alternatives.

### Proxy session refresh

```ts
// src/proxy.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    // The one sanctioned exception to reading env through `src/lib/env.ts`:
    // the proxy runs in the Edge runtime under a bundle-size budget, and importing
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
// src/lib/auth/sign-in.ts
'use client';
import { createClient } from '@/lib/supabase/client';

/** Same-origin, same-tab, and cleared the moment it is consumed. */
const CHAT_KEY_STASH = 'vc.pending-chat-key';

export async function signInWithGoogle(returnTo: string) {
  // The OAuth round trip destroys the fragment: our own JS navigates away, and
  // the provider redirects back to a URL it constructs. Carrying the key through
  // `next` or OAuth `state` would put it in a query string on a request that
  // reaches both Google and our server — exactly what the invariant forbids.
  // sessionStorage never leaves the browser, so the key survives without ever
  // being transmitted. It is transit only: the callback restores the fragment
  // and deletes the entry, so the key is still *read* from the hash and nowhere else.
  if (window.location.hash.startsWith('#k=')) {
    sessionStorage.setItem(CHAT_KEY_STASH, window.location.hash);
  }

  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // returnTo is a path only — never include the fragment here.
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
    },
  });
}

/**
 * Runs once on mount of the returned-to page, before anything reads the key.
 * Restores the fragment onto the URL without a navigation, then clears the stash.
 */
export function restoreChatKeyFragment() {
  const stashed = sessionStorage.getItem(CHAT_KEY_STASH);
  if (!stashed) return;
  sessionStorage.removeItem(CHAT_KEY_STASH);
  if (!window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search + stashed);
  }
}
```

### Auth callback

```ts
// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * `next` is attacker-influenced. A prefix check is NOT a same-origin check:
 * "//evil.com" and "/\evil.com" both start with "/" and both resolve elsewhere.
 * Parse against our own origin and compare. The fragment is dropped on purpose —
 * `next` never legitimately carries one.
 */
function safeNext(next: string, origin: string): string {
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? url.pathname + url.search : '/';
  } catch {
    return '/';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext(next, origin), origin));
    }
  }

  return NextResponse.redirect(new URL('/?error=auth', origin));
}
```

**Rules:**

- Use `supabase.auth.getUser()` for authorization. `getSession()` reads the cookie without revalidating it and must never control access to data.
- The proxy's `setAll` callback must apply both the cookies and the `headers` argument. Otherwise a CDN could cache an authenticated response and serve one user's session token to another.
- In Server Components, `cookieStore.set()` throws. The `try`/`catch` in `src/lib/supabase/server.ts` deliberately catches that error; do not "fix" it.
- `supabaseAdmin` bypasses RLS entirely. Import it only in route handlers, never in a page, component, or hook, and always scope its queries explicitly.
- Guests have no Supabase session. Every path a guest can reach must support `user === null` as a normal case.
- **Resolve the attacker-controlled `next` parameter and compare origins.** A prefix check such as `next.startsWith('/')` is unsafe: `//evil.com` and `/\evil.com` both start with `/` but resolve to another origin. WHATWG URL treats `\` as `/` in special schemes. Use `safeNext` above to parse the value against our origin and compare `url.origin`. It also removes the fragment, which `next` must never carry; Google sign-in explains why.
- **Carry the chat key through OAuth in `sessionStorage`, never in a URL.** Stash it before `signInWithOAuth`, restore it with `history.replaceState` on return, and delete the stored value when it is read. `sessionStorage` stays in the same origin and tab, so the key is never transmitted. Restore the URL fragment before anything reads the key.
- Keep schema changes in `supabase/migrations/*.sql` and apply them with `npx supabase db push`. The file is the official record: reviewers can inspect it, Git versions it, and a fresh database can replay it. Never run `ALTER TABLE` from application code.
- Use MCP and the CLI to author and verify migration files, not to replace them. Avoid `apply_migration` while the schema is still changing: it writes directly to the remote project, leaving partially correct migrations to reconcile by hand. Settle the schema locally or on a branch, then commit one clean migration.
- After any migration, check RLS and security findings — via `get_advisors` if the MCP server is available, otherwise by reviewing policies directly — and fix them before moving on. This project's RLS is easy to get subtly wrong; see the recursion note in `architecture.md`.
- **Verify policies by impersonating a user as well as running advisors.** Advisors caught a redundant policy here, but a real query is needed to prove isolation. In a transaction, run `select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true); set local role authenticated;`, then read, then `rollback`. Only this check exercises the policies the way PostgREST will.
- **A `security definer` helper used by a policy needs `grant execute ... to authenticated`.** Revoking it fails every read with `42501`; see `constraints.md` → Data and RLS.
- Regenerate `src/types/database.ts` after every migration so the typed client stays honest.
- Supabase's newer publishable/secret key names can replace anon/service-role directly. A migration to those names must update `src/lib/env.ts` for the publishable key, `src/lib/env.server.ts` for the secret, `.env.example`, and the table in `code-standards.md` together.

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

- `params`, `searchParams`, `cookies()`, and `headers()` are all async. A missing `await` gives you a Promise instead of the expected value and fails at runtime rather than during the build.
- Server Components are the default. Add `'use client'` only for state, effects, browser APIs, or handlers, and apply it to the smallest component that needs them.
- Route handlers only export HTTP-method functions. No React, no rendering.
- Use `redirect()` from `next/navigation` in Server Components — it throws internally, so never wrap it in a `try` block that would swallow the control flow.
- `next/image` for any bitmap asset. Avatars from Google require their host to be listed in `next.config.ts` under `images.remotePatterns`.
- The whole app is dynamic because session cookies are used throughout. Never add `revalidate` or `unstable_cache` to user-scoped data or behaviour.

---

## Tailwind CSS 4.3

**Check first:** Context7 `/tailwindlabs/tailwindcss.com`, then <https://tailwindcss.com/docs>.

Tailwind 4 has no `tailwind.config.js`. Configure it in CSS with one `@import` and
one `@theme` block.

### Setup

Use two blocks. `:root` holds the Anime.js kit's variables under **their original
names**, copied from `context/Design/colors_and_type.css`. The kit remains the
upstream source. `@theme inline` maps those variables to readable Tailwind
utilities. Literal values may appear only in these two blocks.

```css
/* src/app/globals.css — reproduced in full. _verify.mjs compares this block,
   the kit, and the real file, and fails the build if any two disagree. */
/* The Tailwind import must stay ABOVE :root. Tailwind's generated theme block
   emits a self-referential `--radius-lg: var(--radius-lg)` for every token whose
   kit name collides with one of its own namespaces (radius, text, leading,
   tracking, ease). Our :root wins only because it cascades after. Reordering
   these two would leave those tokens resolving to nothing.
   context/Design/_verify.mjs asserts this ordering. */
@import 'tailwindcss';

/* ---- VideoCircle design tokens ------------------------------------------
   A mirror of the :root block in context/Design/colors_and_type.css, under the
   kit's own variable names. To change a brand value, change it in the kit and
   re-copy — never hand-edit a value here. _verify.mjs compares this block, the
   kit, and the copy in library-docs.md, and fails the build if they disagree.

   Deliberately omitted: the 16-hue chromatic palette (README calls it
   "available, rarely correct"; add a stop here when a feature earns it), and
   upstream's --br / --padding / --input-border-radius aliases, which duplicate
   --radius-lg / --space-4 / --radius-xs.

   --font-mono is the one token that legitimately diverges from the kit, so it
   lives in @theme inline below rather than here: the kit names the family
   literally, the app needs the variable next/font generates.
   ------------------------------------------------------------------------ */
:root {
  /* --- Neutrals --- */
  --white-1: #f6f4f2; /* active/engaged control fill — the inverted press state */
  --white-2: #b8b6b3; /* that fill on hover */

  /* --- Signal and status stops (the rest of each hue ladder is not mirrored) --- */
  --red-1: #ff4b4b;
  --red-4: #532a29;
  --red-5: #412726;
  --green-1: #6aff65;
  --yellow-1: #ffcc2a;

  /* --- Semantic backgrounds (ascending elevation) --- */
  --bg-1: #252423; /* page — warm near-black, never true black */
  --bg-2: #2a2928; /* card */
  --bg-3: #2f2e2d; /* raised */
  --bg-4: #353433; /* overlay */
  --bg-5: #3a3938; /* higher overlay */

  /* --- Semantic foregrounds (descending emphasis) --- */
  --fg-1: #dddcda; /* primary text */
  --fg-2: #c6c3c1; /* secondary text */
  --fg-3: #96918f; /* tertiary / labels */
  --fg-4: #65655e; /* muted / disabled */
  --fg-5: #33332e; /* divider / border */

  /* --- Signature accents --- */
  --accent-red: var(--red-1); /* the signature dot + highlight */
  --accent-cyan: #4BFFFD; /* logo burst lines — never repurposed for UI state */
  --accent-green: #00FF5D; /* the 'final' logo green */

  /* --- Shape --- */
  --radius-xs: 0.25rem; /* inputs, small chips */
  --radius-sm: 0.4rem; /* buttons */
  --radius-md: 0.6rem; /* chip-style toggles */
  --radius-lg: 1rem; /* cards / panels */
  --radius-xl: 1.25rem; /* hero panels */
  --radius-pill: 999px;

  /* --- Spacing --- */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;

  /* --- Type scale: terminal-feel, visible jumps --- */
  --text-xs: 0.75rem; /* 12 — parameter legends, fine print */
  --text-sm: 0.875rem; /* 14 — secondary labels */
  --text-base: 1rem; /* 16 — body */
  --text-md: 1.125rem; /* 18 — emphasis */
  --text-lg: 1.25rem; /* 20 — small heads */
  --text-xl: 1.5rem; /* 24 — h3 */
  --text-2xl: 2rem; /* 32 — h2 */
  --text-3xl: 2.5rem; /* 40 — h1 */
  --text-4xl: 3.5rem; /* 56 — hero */
  --text-5xl: 5rem; /* 80 — monumental */

  --leading-tight: 1.1;
  --leading-snug: 1.25;
  --leading-normal: 1.5;

  --tracking-tight: -0.01em;
  --tracking-normal: 0;
  --tracking-wide: 0.06em; /* the signature overline gesture */
  --tracking-wider: 0.12em;

  /* --- Borders + strokes. Dashed and dotted are for measurement contexts only. --- */
  --border-subtle: 1px solid rgba(255, 255, 255, 0.08);
  --border-soft: 1px solid rgba(255, 255, 255, 0.15);
  --border-dashed: 1px dashed rgba(255, 255, 255, 0.5);
  --border-dotted: 1px dotted rgba(255, 255, 255, 0.5);

  /* --- Grid lines (the signature "scope on grid" backdrop) --- */
  --grid-line-major: rgba(255, 255, 255, 0.05);
  --grid-line-minor: rgba(255, 255, 255, 0.04);

  /* --- Shadows. Functional only — never a depth cue. --- */
  --shadow-soft: 0 10px 10px 0 var(--bg-1);
  --shadow-ring: 0 0 0 1px rgba(255, 255, 255, 0.1);
  --glow-red: 0 0 24px rgba(255, 75, 75, 0.5);
  --glow-cyan: 0 0 24px rgba(75, 255, 253, 0.4);

  /* --- Video scrims. Text over live video never sits on bare pixels. --- */
  --scrim-tile: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0) 100%);
  --scrim-flat: rgba(0, 0, 0, 0.5);
  --scrim-tile-height: 33%;

  /* --- Motion: the brand's own curves --- */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 600ms;
}

/* ---- Tailwind utility names ---------------------------------------------
   Maps the kit's variables onto readable utilities. Together with :root above,
   these are the only two blocks in the codebase where a literal value may
   appear. Everything else consumes utilities.
   ------------------------------------------------------------------------ */
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

  /* The engaged state of a control is a white fill, never red. */
  --color-active: var(--white-1);
  --color-active-hover: var(--white-2);

  /* Red is the Leave control and your own muted state. Nothing else. */
  --color-signal: var(--red-1);
  --color-signal-dim: var(--red-4);
  --color-signal-faint: var(--red-5);
  --color-good: var(--green-1);
  --color-warn: var(--yellow-1);
  --color-burst: var(--accent-cyan);

  /* One family. --font-jetbrains-mono is set by next/font in the root layout. */
  --font-mono: var(--font-jetbrains-mono), 'IoskeleyMono', 'IBM Plex Mono', ui-monospace, monospace;

  /* Line-height is always applied explicitly (leading-tight / snug / normal),
     so these carry Tailwind's default pairings and nothing depends on them. */
  --text-xs: var(--text-xs);
  --text-sm: var(--text-sm);
  --text-base: var(--text-base);
  --text-md: var(--text-md);
  --text-lg: var(--text-lg);
  --text-xl: var(--text-xl);
  --text-2xl: var(--text-2xl);
  --text-3xl: var(--text-3xl);
  --text-4xl: var(--text-4xl);
  --text-5xl: var(--text-5xl);

  --leading-tight: var(--leading-tight);
  --leading-snug: var(--leading-snug);
  --leading-normal: var(--leading-normal);

  --tracking-tight: var(--tracking-tight);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: var(--tracking-wide);
  --tracking-wider: var(--tracking-wider);

  --radius-xs: var(--radius-xs);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-pill: var(--radius-pill);

  --ease-out-quint: var(--ease-out-quint);
  --ease-in-out-quint: var(--ease-in-out-quint);
  --ease-out-expo: var(--ease-out-expo);

  /* ---- shadcn/ui aliases -------------------------------------------------
     Generated components reference these names. Aliasing them once here means
     a component is on-brand before it is touched, and no component ever needs
     to reach past them for a raw value.
     --color-primary is WHITE, not red: the kit's engaged state is an inverted
     white fill, and red stays reserved for destructive actions.
     -------------------------------------------------------------------- */
  --color-background: var(--bg-1);
  --color-foreground: var(--fg-1);
  --color-card-foreground: var(--fg-1);
  --color-popover: var(--bg-4);
  --color-popover-foreground: var(--fg-1);
  --color-primary: var(--white-1);
  --color-primary-foreground: var(--bg-1);
  --color-secondary: var(--bg-3);
  --color-secondary-foreground: var(--fg-1);
  --color-accent: var(--bg-3);
  --color-accent-foreground: var(--fg-1);
  --color-muted-foreground: var(--fg-3);
  --color-destructive: var(--red-1);
  --color-destructive-foreground: var(--fg-1);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-input: rgba(255, 255, 255, 0.08);
  --color-ring: var(--white-1);
}

html {
  color-scheme: dark; /* native form controls and scrollbars render dark */
}

/* The signature double grid — fine 10-unit subgrid over a 100-unit major grid.
   Home, the lobby, and empty states only. NEVER behind or over live video: it
   adds noise over faces and reads as compression artefacting. */
.grid-backdrop {
  background-image:
    linear-gradient(var(--grid-line-minor) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-minor) 1px, transparent 1px),
    linear-gradient(var(--grid-line-major) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line-major) 1px, transparent 1px);
  background-size:
    10px 10px,
    10px 10px,
    100px 100px,
    100px 100px;
}

/* The red square separating "Video" from "Circle". Sized in em so it tracks the
   wordmark at every size. Lives here rather than in the component because em
   values are literals rather than tokens, and literals belong in this file.

   It is a box in the text flow, not a decoration pinned to a glyph — see
   Design/README.md → The mark for why that distinction is the binding rule and
   not a style preference. Nothing here is measured from the face, so a family
   change needs no re-measurement. */
.wordmark-dot {
  display: inline-block;
  width: 0.2em;
  height: 0.2em;
  margin-inline: 0.14em;
  vertical-align: 0.22em;
  background: var(--red-1);
}

/* Keep opacity changes, drop transforms and staggers. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
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
- Use `h-dvh` or `min-h-dvh` for full-height regions, never `h-screen`. Mobile Safari's `100vh` includes the collapsing browser chrome, which clips the call's control bar off the bottom.
- Tailwind 4 has no `tailwind.config.js`. Everything above is the configuration.
- `prettier-plugin-tailwindcss` owns class ordering. Do not reorder classes by hand.
- Build mobile-first: unprefixed utilities target the phone, `sm:`/`md:`/`lg:` widen from there.

---

## VideoCircle Design System (`context/Design/`)

**Check first:** `context/Design/README.md` for the full specification, then
`context/Design/preview/*.html` for specimens and `context/Design/ui_kits/` for
working component code.

The kit supplies the brand reference; it is not a runtime dependency. Nothing
imports from `context/Design/`. Copy assets out and mirror its tokens into
`globals.css`.

### The kit's code is a visual reference, not production source

`preview/*.html` and `ui_kits/**/*.jsx` are prototypes. Their inline styles, raw
hex colours, and raw pixel values are forbidden in this project. **Translate them
into tokens and Tailwind utilities instead of pasting them into the app.**

Some prototypes also conflict with the kit's rules. For example,
`ClockControls.jsx` uses `background: '#1a1a1a'`, a cool near-black, while
non-negotiable #1 requires warm `#252423`. **When an example and `README.md`
disagree, follow `README.md`.** It is the specification; the examples are sketches.

Read them for layout, proportion, and interaction feel. Take values from
`colors_and_type.css`.

### Where the design rules live

The rules were previously repeated here and drifted apart. Each rule now has one
home:

| Looking for | Read |
| ----------- | ---- |
| Colour, type, motion, hover and press timings, borders, radii, layout, iconography | `context/Design/README.md` — the visual specification |
| What each file in the kit is for | `context/Design/README.md` → Index |
| Red vs. white-fill allocation in a call, text-over-video scrim, tile states | `context/code-standards.md` → Design System and Styling |
| Copy-pasteable specimens | `context/Design/preview/*.html` |

`context/Design/_verify.mjs` asserts the token block above still matches
`colors_and_type.css`. Run it after touching either.
### Adding a component

```bash
npx shadcn@latest add button dialog sheet dropdown-menu tooltip sonner
```

### Aliasing shadcn's tokens to the brand

shadcn components use their own variable names. Define aliases once in
`globals.css` so generated components use the brand values from the start:

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

`--color-primary` is **white, not red**. An engaged control uses the kit's inverted
white fill. Red is reserved for destructive actions.

**Rules:**

- Only add the primitives a feature actually needs. Each one pulls in Radix packages that ship to the browser.
- Restyle generated components to match the design system while preserving Radix's focus traps, escape handling, and ARIA behaviour. Those are the reasons for using Radix.
- Remove drop shadows from every generated component. shadcn adds `shadow-md` and `shadow-lg` to dialogs, popovers, and dropdowns. Use the kit's background ladder and a whisper border instead.
- Never edit a generated component to reach past the aliases for a raw value.
- Record non-trivial edits to a generated component in `build-journal.md`, so re-running `add` later does not silently revert them.
- Nothing in `src/components/ui/` may reference a meeting, participant, or room. Product logic belongs one level up.
- Chat and participants use `Sheet` on mobile and an inline side panel on desktop. Render the same content inside those two shells; do not build two separate implementations.

---

## Web Crypto API

**Check first:** <https://developer.mozilla.org/docs/Web/API/SubtleCrypto>. This is a
browser API, not a package — there is no version to pin and nothing to install.

All usage is confined to `src/lib/crypto/`. The canonical implementations of
`chat-key.ts` and `chat-message.ts` are in `architecture.md` → Key Patterns.

**Rules:**

- Use AES-GCM with 256-bit keys and a fresh random 12-byte IV for every message. Reusing an IV with the same key completely breaks GCM security.
- The IV is generated fresh inside `encryptChatMessage` for every single message. Never hoist it to a module constant.
- Pass the sender's LiveKit identity as `additionalData`. This prevents replaying ciphertext under a different name.
- Keys are imported with `extractable: false` (the `false` argument to `importKey`) so a stray `exportKey` call cannot leak one.
- `crypto.subtle` requires a secure context. It is `undefined` on plain HTTP, so local development must use `localhost` (which counts as secure) and production is HTTPS-only.
- `decrypt` throws if the message is tampered with or the key is wrong. Catch the error and show the "unreadable message" placeholder. Never let the error reach the render tree.
- The key comes from `window.location.hash` and stays there. Do not copy it into React state that could be serialized, into `localStorage`, or into any URL that gets shared as a "join without chat" link.
- Anyone with the link has the key. This is the stated security model: it protects the conversation from the server and network, but cannot protect it from someone who receives a forwarded link.

---

## Zod 4

**Check first:** Context7 `/colinhacks/zod`, then <https://zod.dev>.

### Environment parsing

Environment variables are parsed in **two** modules, separated by secrecy. A
single schema for public values and secrets would crash in the browser. Next
replaces non-public `process.env` reads with `undefined` in client code, so `parse`
would throw as soon as a Client Component imported it. That includes
`src/lib/supabase/client.ts`.

```ts
// src/lib/env.ts — NEXT_PUBLIC_* only. Safe to import anywhere.
import { z } from 'zod';

// The protocol constraints are load-bearing: a bare z.url() accepts
// "localhost:3000" — a valid URL whose scheme is "localhost" — which would pass
// validation and then break every OAuth redirect and share link built from it.
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_LIVEKIT_URL: z.url({ protocol: /^wss$/ }),
});

// Next inlines NEXT_PUBLIC_* at build time only for statically written references,
// so each one must be spelled out rather than spread from process.env.
export const env = PublicEnvSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
});
```

```ts
// src/lib/env.server.ts — Supabase's secret. Never reaches the browser.
import 'server-only';

import { z } from 'zod';

const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const serverEnv = ServerEnvSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
```

```ts
// src/lib/env.livekit.server.ts — LiveKit's pair, in a module of its own.
import 'server-only';

import { z } from 'zod';

const LiveKitEnvSchema = z.object({
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
});

export const livekitEnv = LiveKitEnvSchema.parse({
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
});
```

**Keep each service's secrets in its own module.** Both modules parse on import,
so a misconfigured deployment fails at boot rather than on the first request. A
shared schema would also make every consumer fail when an unrelated service's
credential is missing.

The two LiveKit keys lived in `env.server.ts` until feature 06. They prevented
`/api/meetings` from building, even though that endpoint never calls LiveKit.

**Rules:**

- Validate every route handler's body with `safeParse`. On failure, return `apiError('invalid_request', …, 400)`. Never use `parse` on a request body: its throw would turn an invalid request into a 500 instead of a 400.
- Never return Zod's error object to the client; it describes internal field names.
- Zod 4 moved string formats to top-level functions: `z.url()`, `z.email()`, `z.uuid()`. `z.string().url()` is deprecated.
- `z.url()` alone only checks that `new URL()` parses. Any URL that must be reachable over a particular scheme needs the `protocol` option.
- These env modules are the only places `parse` (throwing) is correct — a misconfigured deploy should fail at boot, loudly.
- Never add a secret to `env.ts`. It is compiled into the client bundle, so a secret there ships to every visitor.
- Both modules parse at import time. In unit tests, call `vi.stubEnv` and then `vi.resetModules()` **before** `await import()` to avoid using the previous test's cached module.

---

## Vitest 4 + Playwright 1.62

**Check first:** <https://vitest.dev> and <https://playwright.dev/docs/intro>.

Use Vitest for pure logic. Use Playwright for flows that need a real browser and
real media.

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

- Unit-test `src/lib/crypto/`, `src/lib/room-code.ts`, and duration/format helpers. They are pure and fast, and a silent bug in these areas has the highest cost.
- Crypto tests must include a round trip, a wrong-key failure, a tampered-ciphertext failure, and a mismatched-sender-identity failure. All three failures must throw.
- Room-code tests must assert alphabet membership, shape, and that a large sample has no collisions.
- Playwright covers at minimum: guest joins via link, lobby toggles carry into the call, two participants see each other, and chat round-trips between two browser contexts.
- For two-participant tests, create two `browser.newContext()` instances. Two pages in the same context share media permissions and storage, which can hide real bugs.
- Never mock LiveKit in E2E tests. A mocked SFU tests our mock rather than the layer that actually breaks.
- Vitest runs in the `node` environment by default; crypto tests need Node's global `crypto`, which is available from Node 20 onward.
