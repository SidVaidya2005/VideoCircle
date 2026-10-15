# Code Standards

> **Role:** The rules every change must follow — language, framework, naming, error handling, dependencies.
> **Read before writing code**; obey on every change.
> **Relates to:** derives from the stack in `architecture.md`.

These implementation rules apply across the project. The AI agent must follow
them in every session without exception, so the code stays consistent from one
session to the next.

---

## Engineering Mindset

The AI agent is expected to work as a senior engineer would:

- Understand what is being built and why before writing any code.
- Read the context files first. Verify assumptions against `architecture.md` and `project-overview.md`.
- Build only what the current feature requires. Do not expand the scope, even when an addition seems helpful.
- Make every feature testable. A feature that cannot be verified immediately after implementation is incomplete.
- Write simple, readable code that a junior developer can follow. Prefer that to clever abstractions.
- Complete each feature fully before starting the next.
- Expect failures and handle errors deliberately. One failure must not crash everything.
- Treat permission denials, missing devices, and dropped connections as normal states with their own UI. Unit tests do not catch all media failures, so these states must be part of the feature from the start.

---

## TypeScript

- Enable `strict: true`, `noUncheckedIndexedAccess`, and `noImplicitOverride`. Never weaken a compiler flag to remove an error.
- Do not use `any`. Use `unknown` where data enters the code, then narrow it before use. If a third-party type is wrong, define a narrow local type and explain why in a one-line comment.
- Non-null assertions (`!`) are allowed in only two files: `src/lib/env.ts`, where Zod has already guaranteed that the values exist, and `src/lib/supabase/proxy.ts`.

  The proxy helper cannot import the parsed env module. It runs in the Edge runtime
  with a bundle-size budget, and that import would include Zod. Both values it
  asserts are `NEXT_PUBLIC_` values, inlined at build time and already validated
  at boot by every other module that imports `env.ts`. Everywhere else, use a
  guard to narrow the value.
- Use `as` casts only for `JSON.parse` results that are immediately validated or for `satisfies`-style widening. Never use a cast just to silence the compiler.
- Prefer `interface` for object shapes that will be extended or implemented. Use `type` for unions, intersections, and function types.
- Declare an explicit return type on every exported function. Local helpers may use inferred return types.
- Write async code with `async`/`await`, without raw `.then()` chains. Put every `await` that can reject inside a `try`, or deliberately pass its rejection to a boundary that handles it.
- Treat data as immutable by default. Build new arrays and objects rather than changing parameters. A function may mutate a value it created itself, within that function.
- Use default exports only in Next.js files that require them (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`). In `proxy.ts`, export the named `proxy` function.
- Use `as const` objects with a derived union type instead of enums.

---

## Next.js Conventions

- Use only App Router. There is no `pages/` directory, and none may be added.
- Use Server Components by default. Add `'use client'` only when a file needs state, effects, browser APIs, or event handlers. Keep the directive as far down the component tree as possible.
- Keep all LiveKit and Web Crypto code on the client side. Keep those components small and near the ends of the component tree, so the surrounding page can remain a Server Component.
- Fetch page data in Server Components using the Supabase server client. Client Components must not fetch page data when they mount.
- Send mutations through route handlers under `src/app/api/`, using `fetch` from the client. This project does not use Server Actions. The same endpoints must work for a client that already holds a LiveKit connection; an explicit HTTP contract makes that requirement clear.
- `params` and `searchParams` are Promises in Next.js 16; always `await` them.
- `cookies()` and `headers()` are async; always `await` them.
- Route handlers are `export async function POST(request: NextRequest)` and are never marked `'use client'`.
- A route that reads cookies or the session is already dynamic. Add `export const dynamic` only to address a specific caching bug, and leave a comment explaining why.
- Render the lobby and call states for `/room/[code]` in one client component tree. Separate routes would destroy media tracks when navigating between them, so do not split them.
- Read `window`, `document`, `navigator`, and `location` only inside a `'use client'` file, within effects or event handlers. Never read them at module top level, where they would crash server rendering.
- Use `next/link` for navigation and `useRouter()` from `next/navigation` for programmatic pushes.

---

## Design System and Styling

Use the **VideoCircle design system** in `context/Design/`. It has a dark,
terminal-style appearance, a single monospaced typeface, and warm near-black
backgrounds. It is adapted from the MIT-licensed Anime.js kit.

Read `context/Design/README.md`, the full specification, and
`context/Design/colors_and_type.css`, the source of truth for tokens, before
building any UI. Use the specimens in `context/Design/preview/*.html` as the
starting point. The call-specific rules are in `control-states.html`,
`tile-label.html`, and `video-scrim.html`.

`context/Design/ui_kits/` is upstream reference only. Read it for layout, but
never copy it. Its playground places parameters at the top and controls at the
bottom in fixed positions; that layout is the direct model for the meeting room.

### Non-negotiables, taken from the kit

1. Use **warm near-black `#252423`**. Never use true black or cool grey.
2. Use **one typeface family everywhere**, including chat and fine print. There are no exceptions.
3. Use **red `#ff4b4b` as the signal**, sparingly. Never use it for general decoration.
4. **Never use emoji or generated illustrations.** The brand uses type and geometry. Copy real assets from `context/Design/assets/`.
5. **Motion is expected.** Use the brand's easing curves. Every surface should include at least one moving element.
6. Use **widely spaced SCREAMING CAPS** for overlines and control labels. Never use italics; the font provides structure rather than expression.

### Tokens

- Keep all brand variables in `:root` in `src/app/globals.css`. Mirror **only the `:root` block** from `context/Design/colors_and_type.css`, so the kit remains the source. Do not copy its `@font-face` rules or semantic type roles; load JetBrains Mono through `next/font/google` instead.

  Map the variables to readable Tailwind utility names in a `@theme inline` block.
  Literal values may appear only in those two blocks.
- Utility names map as: `bg-canvas` (bg-1) → `bg-card` (bg-2) → `bg-raised` (bg-3) → `bg-overlay` (bg-4) → `bg-lifted` (bg-5); `text-ink` (fg-1), `text-ink-2` (fg-2), `text-muted` (fg-3), `text-faint` (fg-4), `border-line` (fg-5); `signal` for red-1.
- Never write a raw colour (`#hex`, `rgb()`, `oklch()`) outside those two blocks. The kit's `_adherence.eslint.mjs` flat-config fragment enforces this for `.ts`/`.tsx`; wire it into `eslint.config.mjs` in feature 02. Review must enforce the rule in `globals.css`, because ESLint cannot lint CSS.
- Do not use arbitrary-value utilities (`w-[327px]`, `text-[13.5px]`) where a token exists. Use arbitrary values only for geometry needed in a single place, with a comment.
- Compose class names with `cn()` from `src/lib/utils.ts`. Do not build class strings with template literals.

### Typography

- Load **JetBrains Mono** through `next/font/google`. This self-hosts it, with no external request at runtime. The kit documents it as the substitute for IoskeleyMono, which is licensed and therefore not shipped.
- Keep the `--font-mono` fallback stack connected. Restoring IoskeleyMono later should require changing only `globals.css`.
- Use tight line-height for headings: `leading-tight` (1.1) or `leading-snug` (1.25). Reserve `leading-normal` (1.5) for body paragraphs.
- Set overlines and control labels in uppercase, at `text-xs` with `tracking-wide` (0.06em). Use this signature treatment for section labels, button text, and status strips.
- Code identifiers render verbatim and lowercase (`inOutQuint`, not "In Out Quint"). Room codes follow the same rule.

### Colour discipline in a call

The kit allows one accent hue per screen. A video call has several statuses to
show, so every component must follow the same colour allocation:

- Reserve **red (`signal`)** for the Leave control and the warning that *your own* mic is muted. These are its only uses.
- Show an active or engaged toggle with a **white fill (`--white-1`) and dark text**. This follows the kit's inverted press state. Enabled controls use this treatment rather than red.
- Use the **neutral colour steps** for everything else. Remote participants' mute indicators use `text-muted`. Twelve red badges in a twelve-person grid would overwhelm the signal.
- Show **connection quality without colour**. Use a word in the tile's label row, and render it only for `Poor` and `Lost`. See `constraints.md` → The call.

  This rule previously allowed a small `green-1` / `yellow-1` / `red-1` marker.
  That was incorrect: `signal` is `red-1`, and `architecture.md` reserves it for
  Leave and the local muted mic. A red quality dot would add a third meaning,
  repeated across as many as twelve tiles. This was corrected at F23, the first
  feature that needed it.
- Reserve **cyan and green accents** for the logo burst and completion moments, as the kit requires. Do not use them for UI state.
- Put **a scrim behind every piece of text over live video**. Other contrast pairings assume a known `--bg-*`, but a tile label can sit over any pixels. A participant in front of a bright window can make `--fg-3` disappear. Use `--scrim-tile` for tile labels and `--scrim-flat` for full overlays, with `--fg-1` text above them. Never use muted grey text there. See `preview/video-scrim.html`.

### Surfaces and shape

- Show elevation through the background colour ladder. Cards use `bg-card`, a `1px` `rgba(255,255,255,.08)` border, and `rounded-lg` (1rem). **Never add drop shadows to cards.**
- Limit shadows to `--shadow-soft` as a scroll mask under sticky headers, `--shadow-ring` on the logo frame, and red/cyan glows for embellishment. Never use a shadow to suggest depth.
- Radii: `rounded-xs` inputs and chips, `rounded-sm` buttons, `rounded-md` chip-style toggles, `rounded-lg` cards and panels, `rounded-xl` hero panels, `rounded-full` only for pills and dots. Never `rounded-none` — the brand always softens slightly.
- Keep borders subtle. Reserve dashed and dotted borders for measurement contexts such as sliders, ranges, and axis rules. Read `ui_kits/playground/ClockControls.jsx` only as a reference for this treatment.
- **Do not use glassmorphism.** Use the kit's flat, semi-opaque fills (`rgba(0,0,0,.5)`), without `backdrop-blur`.
- Use the signature grid backdrop on Home, the lobby, and empty states. **Never put it behind or over live video tiles.** It adds noise over faces and looks like compression artefacts.

### Motion

- Easing tokens are the brand's own: `ease-out-quint` for most UI transitions, `ease-in-out-quint` for hero reveals and loops, `ease-out-expo` for entrance staggers.
- Durations: `150ms` hover, `250ms` most UI, `600ms+` for hero moments only.
- Use different hover timings in each direction: `50ms ease-out` on entry and `250ms ease-in-out` on exit. The effect should turn on quickly and settle back slowly.
- **Use only CSS transitions inside an active call.** JavaScript animation competes with WebRTC encoding on the main thread, especially on low-end phones where calls are already demanding. The easing curves are CSS variables, so CSS transitions still follow the brand.
- `animejs` may be used on Home, the lobby, and the sign-in surfaces, where nothing is encoding video. Import it only into those component trees.
- Honour `prefers-reduced-motion: reduce` everywhere: keep opacity changes, drop transforms and staggers.

### Theme

- **Use only the dark theme.** The kit has no light palette; creating one would require guessing the intended brand treatment across 16 hues. The tokens define the theme. Do not add a theme toggle or `dark:` variants.
- `<html>` carries `bg-canvas text-ink` and `color-scheme: dark` so form controls and scrollbars render dark natively.

### shadcn/ui

- Map shadcn's token names (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`) to the brand tokens once in `globals.css`. Never edit a component to bypass those aliases with a raw value.
- Restyle generated components to match the terminal appearance: nearly square corners, subtle borders, and no shadows. Preserve their Radix behaviour; that is why the project uses them.
- Record edits that are more than trivial in `build-journal.md` so a later `shadcn add` does not silently undo them.

### Responsive

Build every layout for mobile from the start. Use `dvh`/`svh` rather than `vh` for
full-height regions, and give every interactive element a hit area of at least
44×44px.

Keep parameters and status fixed at the top, media controls fixed at the bottom,
and video in between, following the kit's control strips. Respect the safe-area
insets at both ends.

#### Width breakpoints and short windows

Use only three width breakpoints, all from Tailwind's defaults:

- `sm:` at 640px separates phones from tablets.
- `md:` at 768px covers iPad portrait.
- `lg:` at 1024px covers iPad landscape and small laptops.

Unprefixed utilities target phones. Do not add custom width breakpoints. Needing
a fourth indicates that the layout is fighting its content.

Height is a separate concern. `sm:`/`md:`/`lg:` cannot express a short window, so
a `@media (height <= …)` block does not count as a fourth breakpoint. It may
change a column's height, never which elements sit beside each other. Home's
hero has the only such block; see `globals.css` → the hero on a short window.
It exists because a phone held sideways is about 360px tall.

#### Hit areas and the narrow call bar

Never shrink a hit area to fit a row. Apply `flex-none` to every control target.
A bar that fits only by compressing buttons to 35px breaks the hit-area rule.
Drop or collapse controls instead. See `preview/control-states.html`.

Below `sm:`, keep only mic, camera, MORE, and Leave on the call bar. Move chat,
participants, and raise hand into the MORE sheet. Seven controls at the 44px
minimum take 440px, which does not fit any phone. Never collapse mic, camera,
or Leave; people need to reach them under pressure.

Width decides whether a control sits on the bar or in the sheet. Capability
decides whether it exists at all. Screen share depends on capability: it is
absent on every phone, but remains in the MORE sheet of a narrow desktop window
that supports it.

#### Line length on large screens

Keep text and forms in a centred container no wider than `max-w-3xl`. Only the
video grid and grid backdrop may extend across the full width. Without this
limit, Home and Call History have unreadably long lines on a 1440px laptop,
and longer still on a 2560px monitor.

#### Measure overflow, hit areas, and action visibility

Verify layouts with browser measurements:

- Check `document.documentElement.scrollWidth > clientWidth` at each width for horizontal overflow.
- Compare every interactive `getBoundingClientRect()` against 44 for hit areas.
- Use `toBeInViewport({ ratio: 1 })` on the surface's primary action.

The first two checks are quick and catch problems a screenshot can hide, but
both are horizontal checks. Neither detects a primary action below the bottom
of the viewport. Home passed the sweep with that problem in phone landscape
until `7.00.7`. The third check requires `ratio: 1` rather than the default: a
button with only a pixel above the fold is not usable.

---

## Performance

WebRTC encoding and decoding share the main thread with the rest of this video
product. Performance problems affect the weakest device in the call, which may
be much less capable than the developer's laptop.

- Set both **`adaptiveStream` and `dynacast` to `true`**. They default to `false`, and `<LiveKitRoom>` does not override those defaults. Without them, a twelve-tile grid receives twelve full-resolution streams. See `library-docs.md` → Room options.
- **Load the room tree separately.** `livekit-client` and `@livekit/components-react` are large libraries needed only after joining. Load the room shell with `next/dynamic` and `ssr: false`, keeping them out of the Home, sign-in, and lobby bundles. They are also client-only libraries, so server-side rendering would fail.
- **Limit grid re-renders.** LiveKit hooks fire when speaking state, connection quality, or tracks change. If each tile subscribes to the whole room, all twelve tiles render again for every event. Subscribe each tile only to its own participant, keep `useTracks` filters narrow, and memoise tile components. Never use a whole-room hook in a component rendered once per tile.
- **No JS-driven animation inside `<LiveKitRoom>`** — CSS transitions only, using the kit's easing variables. `animejs` is for Home, the lobby, and sign-in.
- **Never put the grid backdrop behind live video.** It adds a repeating gradient to a surface that repaints constantly, without improving the view of a face.
- **Honour `prefers-reduced-motion: reduce`** everywhere: keep opacity changes, drop transforms and staggers.

### Targets

Measure these targets on the deployed Render instance, rather than a development
server. Feature 22 checks them; each goal must be measurable.

| What | Target | How |
| ---- | ------ | --- |
| Home, first load JS | under 200 kB gzipped | `next build` output |
| Home, Lighthouse performance | 90+ on mobile throttling | Chrome DevTools |
| Room route, first load JS | room chunk loads only after join | `next build` + network panel |
| Four-participant call | stable for 10 minutes, no audio/video desync | two real devices |
| Full grid on a low-end phone | no dropped frames on the local preview | real Android, not an emulator |

If a target cannot be met, explain why in `constraints.md`. Do not silently lower
it.

---

## File and Folder Naming

- Folders: `kebab-case` (`src/components/room`, `src/lib/crypto`).
- Component files: `kebab-case.tsx` exporting a `PascalCase` component (`control-bar.tsx` → `ControlBar`).
- Hooks: `use-<thing>.ts` exporting `use<Thing>` (`use-chat-key.ts` → `useChatKey`).
- Utility and library modules: `kebab-case.ts` exporting named `camelCase` functions.
- Type-only modules: `kebab-case.ts` under `src/types/`, exporting `PascalCase` types.
- Next.js special files keep their framework names exactly: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`, `loading.tsx`, `proxy.ts`.
- SQL migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_case_description>.sql`.
- Name tests to match their subject, such as `tests/unit/lib/crypto/chat-message.test.ts` and `tests/e2e/guest-join.spec.ts`.
- Export one component per file. Small private sub-components are allowed when only that file's main export uses them.
- Do not add barrel `index.ts` files. Import directly from the module that defines a symbol so readers can see the direction of dependencies.

---

## Module / Component Structure

```tsx
// src/components/room/control-bar.tsx
'use client';

// 1. External packages
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { MicIcon, MicOffIcon } from 'lucide-react';

// 2. Internal absolute imports
import { Button } from '@/components/ui/button';
import { useIsScreenShareSupported } from '@/hooks/use-is-screen-share-supported';
import { cn } from '@/lib/utils';

// 3. Types (interfaces for props, always named <Component>Props)
interface ControlBarProps {
  onLeave: () => void;
  className?: string;
}

// 4. Module constants
const TOGGLE_LABEL = { on: 'Mute microphone', off: 'Unmute microphone' } as const;

// 5. The component
export function ControlBar({ onLeave, className }: ControlBarProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  async function toggleMicrophone() {
    await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        onClick={toggleMicrophone}
        aria-label={isMicrophoneEnabled ? TOGGLE_LABEL.on : TOGGLE_LABEL.off}
        aria-pressed={!isMicrophoneEnabled}
      >
        {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
      </Button>
    </div>
  );
}
```

- Order imports as follows: external packages, `@/` internal imports, relative imports (which should be rare), then type-only imports if they have a separate group. Separate groups with a blank line.
- Props interfaces are named `<Component>Props` and declared immediately above the component.
- Declare constants above the component, never inside its render body.
- Name event handlers `handle<Thing>` when passing them as props. Use `<verb><Noun>` for handlers defined locally.
- Handler props are named `on<Thing>`.
- Every icon-only control has an `aria-label`, and every toggle exposes `aria-pressed`.
- Use inline `style` attributes only for values computed at runtime, such as a grid column count. Add a comment explaining them.

---

## Boundary Patterns

### Route handler

```ts
// src/app/api/token/route.ts
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/api';
import { env } from '@/lib/env';
import { mintAccessToken } from '@/lib/livekit/token';
import { isValidRoomCode } from '@/lib/room-code';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { MAX_DISPLAY_NAME_LENGTH } from '@/lib/constants';

const BodySchema = z.object({
  code: z.string().refine(isValidRoomCode, 'Invalid room code'),
  displayName: z.string().trim().min(1).max(MAX_DISPLAY_NAME_LENGTH),
});

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError('invalid_request', 'Room code and display name are required.', 400);
  }

  try {
    // A valid-looking code is not authorization. The meeting must exist and be open.
    const { data: meeting } = await supabaseAdmin
      .from('meetings')
      .select('id, ended_at, expires_at')
      .eq('code', parsed.data.code)
      .maybeSingle();

    if (!meeting) {
      return apiError('not_found', 'That meeting does not exist.', 404);
    }
    if (meeting.ended_at !== null) {
      return apiError('meeting_ended', 'This meeting has ended.', 410);
    }
    if (new Date(meeting.expires_at) <= new Date()) {
      return apiError('meeting_expired', 'This meeting link has expired.', 410);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const identity = user ? `user:${user.id}` : `guest:${crypto.randomUUID()}`;
    const token = await mintAccessToken({
      roomCode: parsed.data.code,
      identity,
      displayName: parsed.data.displayName,
      // Caps the TTL so the token cannot outlive the meeting. Already validated
      // above as being in the future.
      expiresAt: new Date(meeting.expires_at),
    });

    return apiOk({ serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL, token, identity });
  } catch (error) {
    console.error('[api/token] failed to mint token', error);
    return apiError('token_failed', 'Could not join the meeting. Please try again.', 500);
  }
}
```

- Validate the body with Zod before doing any other work. Return `400` with `invalid_request` when validation fails.
- Check the underlying row's state before authorizing an action. A correctly formatted identifier is insufficient: the row must exist and be joinable.
- Read every environment value through `env` from `src/lib/env.ts`. Do not read `process.env` elsewhere except in `src/proxy.ts`. The Environment Variables section explains that exception.
- Resolve the session using `supabase.auth.getUser()`. Treat a null user as a guest. It is an error only on routes documented as protected.
- Wrap the work in `try`/`catch`. Log the actual error on the server with a `[route]` prefix, and return a generic message to the user.
- Return either `apiOk(data)` or `apiError(code, message, status)`. Never return a bare `Response` or an object outside that shape.
- Status codes: `200` read, `201` created, `400` validation, `401` unauthenticated, `403` authenticated but not allowed, `404` not found, `409` conflict, `410` gone (ended or expired), `500` unexpected.
- Never send a validation error object, stack trace, or database message back to the client.

### Webhook handler

```ts
// src/app/api/livekit/webhook/route.ts
import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/api';
import { webhookReceiver } from '@/lib/livekit/webhook';

export async function POST(request: NextRequest) {
  const rawBody = await request.text(); // Must be the raw body — the signature covers these exact bytes.
  const authorization = request.headers.get('Authorization');

  if (!authorization) {
    return apiError('unauthorized', 'Missing signature.', 401);
  }

  let event;
  try {
    event = await webhookReceiver.receive(rawBody, authorization);
  } catch (error) {
    console.error('[api/livekit/webhook] signature verification failed', error);
    return apiError('unauthorized', 'Invalid signature.', 401);
  }

  try {
    // …dispatch on event.event: participant_joined | participant_left | room_finished
    // Events we do not handle fall through to 200 — they are not failures.
    return apiOk({ received: true });
  } catch (error) {
    // Fail loudly so LiveKit retries. Handlers are idempotent, so a redelivery is
    // free, and call history is a stated success criterion — dropping a write to
    // avoid a retry would trade correctness for nothing.
    console.error('[api/livekit/webhook] handler failed', event.event, error);
    return apiError('handler_failed', 'Event could not be processed.', 500);
  }
}
```

- Read the raw body using `request.text()`. Never call `request.json()` first, because parsing loses the exact bytes covered by the signature.
- Verify the signature before using the payload for anything.
- Make webhook handlers idempotent: delivering the same event twice must not create a duplicate row. This allows a safe retry after a `500` response.
- Return `500` for a temporary failure so the sender retries. Return `200` when an event is understood but ignored, or when retrying cannot ever make it succeed. Repeated retries serve no purpose in those cases.
- Give every webhook-driven write a fallback that works when the webhook never arrives. For participation rows, `room_finished` closes all open rows, and the nightly expiry sweep provides another fallback. See `architecture.md` → Data Flow.

### Server Component page

```tsx
// src/app/history/page.tsx
import { redirect } from 'next/navigation';

import { HistoryList } from '@/components/history/history-list';
import { createClient } from '@/lib/supabase/server';

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('meeting_participants')
    .select('joined_at, left_at, meetings(id, code, created_at, ended_at)')
    .eq('user_id', user.id) // Explicit scope. RLS enforces the same rule independently.
    .order('joined_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[history] query failed', error);
  }

  return <HistoryList meetings={data ?? []} />;
}
```

- Fetch data and check authorization in pages. Render it in components. Components must never query Postgres.
- Always limit a user-owned query with `.eq('user_id', user.id)`, even though row-level security (RLS) independently limits which database rows can be read. This provides a second check and makes the intent readable.
- If a query fails, log the error and render the empty state. A failed history query must not take down the page.

### Client hook wrapping a browser API

```ts
// src/hooks/use-chat-key.ts
'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { importChatKey, readChatKeyFromHash } from '@/lib/crypto/chat-key';

type ChatKeyState =
  | { status: 'loading' }
  | { status: 'ready'; key: CryptoKey }
  | { status: 'missing' };

const LOADING = { status: 'loading' } as const;
const MISSING = { status: 'missing' } as const;

/** Nothing to subscribe to: the fragment is read once and deliberately not watched. */
function subscribe(): () => void {
  return () => {};
}

function encodedKey(): string | null {
  return readChatKeyFromHash(window.location.hash);
}

export function useChatKey(): ChatKeyState {
  // A value the server cannot see, so it comes through useSyncExternalStore with a
  // server snapshot — NOT through an effect. Reading it in an effect would mean a
  // synchronous setState on mount whenever the link carries no key, which is a
  // second render pass before paint. Only the genuinely async import uses state.
  const encoded = useSyncExternalStore(subscribe, encodedKey, () => null);
  const [imported, setImported] = useState<ChatKeyState | null>(null);

  useEffect(() => {
    if (!encoded) return;

    // Per-run, never hoisted into a ref: React double-invokes effects in
    // development, and a shared flag lets one run's cleanup clear the other's.
    let cancelled = false;

    // An effect callback cannot itself be async, so the work goes in an IIFE —
    // this is the project's standard shape for async work inside an effect.
    void (async () => {
      try {
        const key = await importChatKey(encoded);
        if (!cancelled) setImported({ status: 'ready', key });
      } catch {
        // A malformed key is indistinguishable from no key, and the UI is the same.
        if (!cancelled) setImported(MISSING);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [encoded]);

  if (!encoded) return MISSING;

  return imported ?? LOADING;
}
```

- Read browser APIs inside effects, or through a `useSyncExternalStore` snapshot paired with a server snapshot. Never read them at module scope or directly during render.
- **Never call `setState` synchronously in an effect body.** The `react-hooks/set-state-in-effect` rule treats this as an error and fails `npm run lint`. Use `useSyncExternalStore` for state derived synchronously from a browser value. Use an effect for state that resolves later, setting it from the async callback.
- In each async effect run, declare a separate `cancelled` flag to prevent state updates after unmount.
- Model loading, ready, and failure as a discriminated union rather than separate booleans. Each state must have a deliberate UI.

---

## Error Handling

- Server logs use `console.error('[<area>] <what failed>', error)` where `<area>` is the route or module, e.g. `[api/token]`, `[history]`, `[livekit/webhook]`.
- Client logs use `console.warn` for recoverable conditions and `console.error` for genuine faults, prefixed the same way.
- Write plain messages that tell users what they can do. Never include an error code, stack trace, database message, or provider name.
- Give media permission denial its own UI state rather than an error toast. The lobby must explain that camera or microphone access was blocked, show how to enable it again, and still allow audio-only or view-only joining.
- Show an "unreadable message" placeholder in the transcript when decryption fails. The message must not throw an error into the render tree or disappear without explanation.
- If the `#k=` fragment is missing, disable the chat composer and explain that this link cannot read chat. Treat this as a supported state, rather than a crash.
- **Expect that a fragment may be lost while sharing a link.** The `#k=` part never reaches a server, which keeps the chat key private. Anything that rewrites the URL can therefore lose it: some link shorteners, some chat clients, and any "copy link" feature that re-serialises the URL instead of copying its raw string.

  The call still works if that happens; only chat is affected. Share the link as
  plain text, and never send it through a shortener.
- Render a reconnecting state for LiveKit disconnects and keep the control bar interactive throughout. Never unmount the room tree for a temporary disconnect.
- Every `catch` must handle the error or re-throw it with added context. If a catch block is empty, comment on what is being deliberately ignored.
- Log errors only to the server console. This project has no error-reporting service.

---

## Environment Variables

Never hardcode a key, URL, secret, or origin. Read every value below through
`src/lib/env.ts`. It parses `process.env` with Zod when the module loads, so a
misconfigured deployment fails immediately with a visible error instead of
waiting for its first request.

| Variable | Used In | Secret? |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirect target, share-link construction | No |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server Supabase clients | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` only | **Yes** |
| `NEXT_PUBLIC_LIVEKIT_URL` | Returned by `/api/token`; the `wss://` SFU URL the client connects to | No |
| `LIVEKIT_API_KEY` | `src/lib/livekit/token.ts`, `src/lib/livekit/webhook.ts` | **Yes** |
| `LIVEKIT_API_SECRET` | `src/lib/livekit/token.ts`, `src/lib/livekit/webhook.ts` | **Yes** |

### Separate public values from secrets

Parse the four `NEXT_PUBLIC_*` values in `src/lib/env.ts`, which is safe to import
anywhere. Parse secrets in `server-only` modules.

This split is required because Next replaces non-public `process.env` reads with
`undefined` in the browser. A schema containing both public values and secrets
would throw as soon as any Client Component imported it, including
`src/lib/supabase/client.ts`.

### Give each service its own secret schema

`src/lib/env.server.ts` holds Supabase's service-role key. LiveKit's pair gets
its own module in feature 09.

These modules parse on import so configuration errors fail at boot. A single
schema for all secrets would make every consumer fail when any service's
credential was missing. This already blocked `/api/meetings` from building while
the LiveKit keys were blank, even though it never calls LiveKit. In production,
the same coupling would take meeting creation down during a LiveKit key rotation.

### Configuration rules and the proxy exception

- Values with a `NEXT_PUBLIC_` prefix are compiled into the client bundle and visible to everyone. Never give a secret that prefix.
- `src/proxy.ts` is the only exception to reading env through `env`. It runs in the Edge runtime with a bundle-size budget; importing the parsed module would include Zod. It may read only the two `NEXT_PUBLIC_` Supabase values directly from `process.env`.
- Configure secrets in the Render dashboard and list them in `render.yaml` with `sync: false`. Never commit them. `.env.local` is git-ignored.
- List every variable with a placeholder in `.env.example`. Update it in the same commit that introduces a new variable.

---

## Shared Constants

```ts
// src/lib/constants.ts

/** Data-channel topics. Both peers must agree, so these are defined once. */
export const DATA_TOPIC = {
  CHAT: 'vc.chat',
  REACTION: 'vc.reaction',
  HAND: 'vc.hand',
} as const;

/** Above this headcount the grid paginates rather than shrinking further. */
export const MAX_VISIBLE_TILES = 12;

/** Reactions disappear on their own; nothing about them is persisted. */
export const REACTION_TTL_MS = 4_000;

export const MAX_DISPLAY_NAME_LENGTH = 48;
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;

/** Footer links. Rendered on Home and Call History, so they live here, not inline. */
export const AUTHOR_LINKS = [
  { label: 'Source', href: 'https://github.com/SidVaidya2005/VideoCircle' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/siddarth-vaidya-885871239' },
  { label: 'Email', href: 'mailto:siddarthvaidya2005@gmail.com' },
  { label: 'Portfolio', href: 'https://siddarthvaidya2005-7iyf.onrender.com' },
] as const;

export const AUTHOR_BYLINE = 'Built by Siddarth Vaidya';
```

- Every external link in `AUTHOR_LINKS` renders with `target="_blank"` and `rel="noopener noreferrer"`. The `mailto:` gets neither.

- Put every value used by more than one module here. Repeating a magic number creates a risk that the copies will diverge.
- Treat `DATA_TOPIC` values as the protocol shared by peers. Changing one breaks compatibility with anyone already in a call using an older bundle.

---

## Import Conventions

- Use the `@/*` alias for everything under `src/`. It is configured in `tsconfig.json` as `"@/*": ["./src/*"]`.
- Use relative imports only for siblings in the same folder (`./message-bubble`). Never use `../`; use the alias to reach outside the folder.
- Write type-only imports as `import type { … }` so the build erases them.
- Import a symbol directly from the module that defines it. There are no barrel files.
- Never import from `src/app/` into `src/lib/` or `src/components/`.

---

## Comments

- Comments must explain *why*, never *what*. If a comment is needed to explain *what* the code does, improve the naming instead.
- Comment on constraints that are not obvious. Examples include why a webhook reads the raw body, why a token's TTL is capped to the meeting's remaining life, why the alphabet has 32 characters, and why a `catch` is empty.
- Add a one-line comment for every security-relevant decision, so the next reader does not accidentally remove it while simplifying the code.
- Add JSDoc to exported functions in `src/lib/` when their contract is not clear from the signature. This is especially important in `src/lib/crypto/`.
- State what is missing in every `TODO:` comment. A bare `TODO` is not acceptable. Also record anything deferred in `build-journal.md`.
- Never leave commented-out code. Remove unused code; Git retains its history.

---

## Dependencies

Before installing anything new, check:

1. Check whether the browser already provides it. Web Crypto, `Intl`, `URLSearchParams`, `structuredClone`, and CSS have covered several needs here without extra packages.
2. Check whether Next.js, LiveKit, or Supabase already includes it. `@livekit/components-react` provides layout, device, and data-channel primitives that can be easy to implement again by accident.
3. If the need is a single small function, write it in `src/lib/` instead.
4. Check the install size, maintenance status, and license.
5. Check whether it enters the browser bundle. Anything imported into a Client Component ships to every user and every device, including phones with slow connections.

Approved dependencies for this project:

- `next` — framework, routing, route handlers
- `react`, `react-dom` — UI runtime
- `typescript` — language and type checking
- `livekit-client` — WebRTC room connection and track management
- `@livekit/components-react` — React hooks and layout primitives for LiveKit
- `livekit-server-sdk` — server-side `AccessToken` and `WebhookReceiver`
- `@supabase/supabase-js` — Postgres queries and the service-role admin client
- `@supabase/ssr` — cookie-based Supabase clients for App Router and the proxy
- `zod` — runtime validation at every server boundary and for env parsing
- `tailwindcss`, `@tailwindcss/postcss` — styling
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn/ui class composition, used by `cn()`
- `radix-ui` — accessible primitives. Current shadcn generates imports from this single package instead of the per-primitive `@radix-ui/*` scope, giving the project one dependency for the primitives rather than one for each component
- `lucide-react` — icon set. The kit does not provide icons and approves Lucide as the substitute. Use a 2px stroke, never filled icons, and keep their use sparse because the brand relies on typography
- `animejs` — motion on Home, the lobby, and sign-in surfaces only; never imported into the call tree
- `server-only` — build-time guard that keeps server modules out of client bundles
- `vitest`, `@vitest/coverage-v8` — unit tests
- `@playwright/test` — end-to-end tests
- `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss` — linting and formatting

Update this list before installing any other package.
