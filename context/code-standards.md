# Code Standards

> **Role:** The rules every change must follow — language, framework, naming, error handling, dependencies.
> **Read before writing code**; obey on every change.
> **Relates to:** derives from the stack in `architecture.md`.

Implementation rules and conventions for the entire project. The AI agent must
follow these in every session without exception. These rules prevent pattern
drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against `architecture.md` and `project-overview.md`
- **Scope is sacred** — only build what the current feature requires; never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code a junior can follow beats clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — handle errors deliberately; never let one failure crash everything
- **Media code fails in ways unit tests don't catch** — permission denials, missing devices, and dropped connections are normal states with real UI, not edge cases to bolt on later

---

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess` and `noImplicitOverride`. Never relax a compiler flag to make an error go away.
- `any` is banned. Use `unknown` at boundaries and narrow it. When a third-party type is genuinely wrong, write a narrow local type and a one-line comment explaining why.
- Non-null assertions (`!`) are banned outside `src/lib/env.ts`, where Zod has already guaranteed presence. Narrow with a guard instead.
- `as` casts are allowed only for `JSON.parse` results that are immediately validated, and for `satisfies`-style widening. Never cast to silence the compiler.
- Prefer `interface` for object shapes that are extended or implemented, `type` for unions, intersections, and function types.
- All exported functions declare an explicit return type. Local helpers may infer.
- Async code uses `async`/`await`; no raw `.then()` chains. Every `await` that can reject is inside a `try` or has its rejection deliberately propagated to a boundary that handles it.
- Data is immutable by default: build new arrays and objects rather than mutating parameters. Mutation is acceptable inside a single function on a value it created.
- No default exports anywhere except Next.js files that require them (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `middleware.ts`).
- No enums — use `as const` objects with a derived union type.

---

## Next.js Conventions

- App Router only. There is no `pages/` directory and none may be added.
- Server Components are the default. A file gets `'use client'` only when it needs state, effects, browser APIs, or event handlers. Push the directive as far down the tree as possible.
- All LiveKit and Web Crypto code is client-side; keep those components small and leaf-ward so the surrounding page stays a Server Component.
- Data fetching for pages happens in Server Components with the Supabase server client. Client Components do not fetch page data on mount.
- Mutations go through route handlers under `src/app/api/`, called with `fetch` from the client. Server Actions are not used in this project — the same endpoints must be callable from a client that already holds a LiveKit connection, and an explicit HTTP contract keeps that honest.
- `params` and `searchParams` are Promises in Next.js 16; always `await` them.
- `cookies()` and `headers()` are async; always `await` them.
- Route handlers are `export async function POST(request: NextRequest)` and are never marked `'use client'`.
- A route that reads cookies or the session is dynamic by nature — do not add `export const dynamic` unless a specific caching bug requires it, and comment why if you do.
- `/room/[code]` renders its lobby and call states in one client component tree. Do not split them into separate routes; navigating between them would tear down media tracks.
- Never read `window`, `document`, `navigator`, or `location` outside a `'use client'` file, and never at module top level — read them inside effects or event handlers so server rendering does not crash.
- Use `next/link` for navigation and `useRouter()` from `next/navigation` for programmatic pushes.

---

## Design System and Styling

The project follows the **VideoCircle design system** in `context/Design/` — a
terminal-dark, mono-only brand built on warm near-black, adapted from the
MIT-licensed Anime.js kit. `context/Design/README.md` is the full specification and
`context/Design/colors_and_type.css` is the token ground truth. Read both before
building any UI. `context/Design/preview/*.html` are the specimens to lift from —
including `control-states.html`, `tile-label.html`, and `video-scrim.html`, which
carry the call-specific rules. `context/Design/ui_kits/` is upstream reference
only: read it for layout, never copy it. Its playground's fixed top-params /
bottom-controls layout is the direct model for the meeting room.

### Non-negotiables, taken from the kit

1. **Warm near-black `#252423`.** Never true black, never cool grey.
2. **One family, everywhere.** No second typeface, no exceptions for chat or fine print.
3. **Red `#ff4b4b` is the signal**, used sparingly — never as general decoration.
4. **No emoji, ever. No generated illustrations.** The brand is type and geometry. Copy real assets from `context/Design/assets/`.
5. **Motion is expected.** Use the brand's own easing curves; every surface should have at least one moving thing.
6. **Wide-tracked SCREAMING CAPS** for overlines and control labels. Never italic — the font is structural, not expressive.

### Tokens

- All brand variables live in `:root` in `src/app/globals.css`, mirroring **the `:root` block only** of `context/Design/colors_and_type.css` so the kit stays the source. The file's `@font-face` rules and semantic type roles are not copied — JetBrains Mono loads through `next/font/google` instead. A `@theme inline` block maps them to readable Tailwind utility names. Those two blocks are the only place a literal value may appear.
- Utility names map as: `bg-canvas` (bg-1) → `bg-card` (bg-2) → `bg-raised` (bg-3) → `bg-overlay` (bg-4) → `bg-lifted` (bg-5); `text-ink` (fg-1), `text-ink-2` (fg-2), `text-muted` (fg-3), `text-faint` (fg-4), `border-line` (fg-5); `signal` for red-1.
- Never write a raw colour (`#hex`, `rgb()`, `oklch()`) outside those two blocks. The kit ships `_adherence.eslint.mjs`, a flat-config fragment enforcing this on `.ts`/`.tsx`; wire it into `eslint.config.mjs` in feature 02. ESLint cannot lint CSS, so `globals.css` itself is guarded by review.
- Never write arbitrary-value utilities (`w-[327px]`, `text-[13.5px]`) for anything a token covers. Arbitrary values are for genuinely one-off geometry only, with a comment.
- Compose class names with `cn()` from `src/lib/utils.ts`. Do not build class strings with template literals.

### Typography

- **JetBrains Mono**, loaded through `next/font/google`, which self-hosts it — no external request at runtime. It is the kit's own documented substitute for IoskeleyMono, which is licensed and therefore not shipped.
- The `--font-mono` fallback stack stays wired so swapping IoskeleyMono back in later is a change to `globals.css` alone.
- Line-height is tight: `leading-tight` (1.1) and `leading-snug` (1.25) for headings, `leading-normal` (1.5) reserved for body paragraphs.
- Overlines and control labels are uppercase at `text-xs` with `tracking-wide` (0.06em). This is the signature gesture — use it for section labels, button text, and status strips.
- Code identifiers render verbatim and lowercase (`inOutQuint`, not "In Out Quint"). Room codes follow the same rule.

### Colour discipline in a call

The kit's rule is one accent hue per screen. A video call has several competing
status colours, so the allocation is fixed here rather than decided per component:

- **Red (`signal`)** — destructive and self-warning only: the Leave control, and *your own* mic showing as muted. Nothing else.
- **White fill (`--white-1`) with dark text** — the active/engaged state for any toggle. This is the kit's own press-state inversion; it is what an enabled control looks like, not red.
- **Neutral steps** — everything else. Remote participants' mute indicators are `text-muted`, not red; twelve red badges on a twelve-person grid would destroy the signal.
- **Connection quality** — `green-1` / `yellow-1` / `red-1`, but only as a small marker, never a filled surface.
- **Cyan and green accents** — reserved for the logo burst and completion moments, per the kit. Do not repurpose them for UI state.
- **Any text over live video rides a scrim.** Every other contrast pairing assumes a known `--bg-*`; a tile label sits on arbitrary pixels, and a participant backlit by a window erases `--fg-3` outright. Use `--scrim-tile` for tile labels and `--scrim-flat` for full overlays, with `--fg-1` text on top — never a muted grey. See `preview/video-scrim.html`.

### Surfaces and shape

- Elevation comes from the background ladder, not shadows. Cards are `bg-card` with a `1px` `rgba(255,255,255,.08)` border and `rounded-lg` (1rem). **No drop shadows on cards.**
- The only shadows in the system are functional: `--shadow-soft` as a scroll mask under sticky headers, `--shadow-ring` on the logo frame, and the red/cyan glows as embellishment. Never use a shadow as a depth cue.
- Radii: `rounded-xs` inputs and chips, `rounded-sm` buttons, `rounded-md` chip-style toggles, `rounded-lg` cards and panels, `rounded-xl` hero panels, `rounded-full` only for pills and dots. Never `rounded-none` — the brand always softens slightly.
- Borders are whispers. Dashed and dotted borders are reserved for measurement contexts (sliders, ranges, axis rules) — see `ui_kits/playground/ClockControls.jsx` for the treatment, reading it as reference only.
- **No glassmorphism.** The kit uses flat semi-opaque fills (`rgba(0,0,0,.5)`), never `backdrop-blur`.
- The signature grid backdrop belongs on Home, the lobby, and empty states. **Never render it behind or over live video tiles** — it adds visual noise over faces and reads as compression artefacting.

### Motion

- Easing tokens are the brand's own: `ease-out-quint` for most UI transitions, `ease-in-out-quint` for hero reveals and loops, `ease-out-expo` for entrance staggers.
- Durations: `150ms` hover, `250ms` most UI, `600ms+` for hero moments only.
- Hover transitions are deliberately asymmetric — `50ms ease-out` on the way in, `250ms ease-in-out` on the way out. Snaps on, relaxes off.
- **Inside an active call, use CSS transitions only.** JS-driven animation competes with WebRTC encoding for the main thread, and the cost lands on exactly the low-end phones the call is hardest on. The easing curves are CSS variables, so this stays fully on-brand.
- `animejs` may be used on Home, the lobby, and the sign-in surfaces, where nothing is encoding video. Import it only into those component trees.
- Honour `prefers-reduced-motion: reduce` everywhere: keep opacity changes, drop transforms and staggers.

### Theme

- **Dark only.** The kit has no light palette, and inventing one would mean guessing at brand intent across 16 hues. There is no theme toggle and no `dark:` variants — the tokens *are* the theme.
- `<html>` carries `bg-canvas text-ink` and `color-scheme: dark` so form controls and scrollbars render dark natively.

### shadcn/ui

- shadcn primitives ship with their own token names (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`). Alias these to the brand tokens once in `globals.css`; never edit a component to reach past them for a raw value.
- Restyle generated components toward the terminal aesthetic — square-ish radii, whisper borders, no shadows — but keep their Radix behaviour, which is the reason they are here.
- Record non-trivial edits in `build-journal.md` so a later `shadcn add` does not silently revert them.

### Responsive

- Mobile is a first-class target, not a cleanup pass: build every layout mobile-first, use `dvh`/`svh` rather than `vh` for full-height regions, and give every interactive element a minimum 44×44px hit area.
- The kit's fixed control strips map directly onto a call: parameters and status pin to the top, media controls pin to the bottom, video breathes in between. Honour the safe-area insets on both.
- **Breakpoints are Tailwind's defaults, and only three are used.** `sm:` 640px is the phone/tablet line, `md:` 768px is iPad portrait, `lg:` 1024px is iPad landscape and small laptops. Unprefixed utilities target the phone. Do not introduce custom breakpoints — a fourth is a sign the layout is fighting the content.
- **A hit area never shrinks to make a row fit.** Control rows use `flex-none` on every target. A bar that fits by compressing its buttons to 35px has not been made responsive, it has been broken quietly — the layout must drop or collapse controls instead. See `preview/control-states.html`.
- **Below `sm:` the in-call bar keeps only mic, camera, MORE, and Leave.** Chat, participants, and raise hand move into the MORE sheet. **Width and capability are separate axes**: width decides what sits on the bar versus in the sheet, capability decides whether a control exists at all. Screen share is gated on capability, not width — absent on every phone, but present in the MORE sheet of a narrow *desktop* window, which does support it. Seven controls at the 44px floor measure 440px, which does not fit any phone. Mic, camera, and Leave are never collapsed — they are what someone reaches for under pressure.
- **Cap line length on large screens.** Text and form content sits in a `max-w-3xl` (or narrower) centred container; only the video grid and the grid backdrop are allowed to run full-bleed. Without this, Home and Call History stretch to unreadable line lengths on a 1440px laptop and worse on a 2560px monitor.
- **Verify by measuring, not by eye.** `document.documentElement.scrollWidth > clientWidth` at a given width is the objective test for horizontal overflow, and comparing every interactive `getBoundingClientRect()` against 44 is the test for hit areas. Both are quick to run in the browser and catch what a screenshot hides.

---

## Performance

This is a video product: the main thread is shared with WebRTC encoding and
decoding, and the cost of getting it wrong lands on the weakest device in the
call, not the developer's laptop.

- **`adaptiveStream` and `dynacast` are both `true`.** They default to `false`, and `<LiveKitRoom>` does not override them. See `library-docs.md` → Room options; without them a twelve-tile grid pulls twelve full-resolution streams.
- **The room tree is code-split.** `livekit-client` and `@livekit/components-react` are large and are needed only after someone joins. Load the room shell with `next/dynamic` and `ssr: false` so Home, sign-in, and the lobby never pay for it in their bundle. They are also client-only libraries, so SSR would fail regardless.
- **Cap re-renders inside the grid.** LiveKit hooks fire on every participant event — speaking changes, quality changes, track mutations. A tile that subscribes to room-wide state re-renders on every one of them, times twelve. Subscribe each tile to *its own* participant, keep `useTracks` filters narrow, and memoise tile components. Never put a whole-room hook in a component that renders per tile.
- **No JS-driven animation inside `<LiveKitRoom>`** — CSS transitions only, using the kit's easing variables. `animejs` is for Home, the lobby, and sign-in.
- **Never render the grid backdrop behind live video.** It is a repeating gradient over a constantly repainting surface, and it buys nothing over a face.
- **Honour `prefers-reduced-motion: reduce`** everywhere: keep opacity changes, drop transforms and staggers.

### Targets

Measured on the deployed Render instance, not a dev server. These are the numbers
feature 22 checks — an unmeasurable goal is not a goal.

| What | Target | How |
| ---- | ------ | --- |
| Home, first load JS | under 200 kB gzipped | `next build` output |
| Home, Lighthouse performance | 90+ on mobile throttling | Chrome DevTools |
| Room route, first load JS | room chunk loads only after join | `next build` + network panel |
| Four-participant call | stable for 10 minutes, no audio/video desync | two real devices |
| Full grid on a low-end phone | no dropped frames on the local preview | real Android, not an emulator |

If a target cannot be met, record the reason in `constraints.md` rather than
quietly lowering it.

---

## File and Folder Naming

- Folders: `kebab-case` (`src/components/room`, `src/lib/crypto`).
- Component files: `kebab-case.tsx` exporting a `PascalCase` component (`control-bar.tsx` → `ControlBar`).
- Hooks: `use-<thing>.ts` exporting `use<Thing>` (`use-chat-key.ts` → `useChatKey`).
- Utility and library modules: `kebab-case.ts` exporting named `camelCase` functions.
- Type-only modules: `kebab-case.ts` under `src/types/`, exporting `PascalCase` types.
- Next.js special files keep their framework names exactly: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`, `loading.tsx`, `middleware.ts`.
- SQL migrations: `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_case_description>.sql`.
- Tests mirror their subject: `tests/unit/lib/crypto/chat-message.test.ts`, `tests/e2e/guest-join.spec.ts`.
- One exported component per file. A file may contain small private sub-components used only by its main export.
- No barrel `index.ts` files. Import from the module that owns the symbol so dependency direction stays visible.

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

- Import order is fixed: external packages, then `@/` internal imports, then relative imports (which should be rare), then type-only imports if separated. A blank line between groups.
- Props interfaces are named `<Component>Props` and declared immediately above the component.
- Constants live above the component, never inside the render body.
- Event handlers are named `handle<Thing>` when passed as props and `<verb><Noun>` when defined locally.
- Handler props are named `on<Thing>`.
- Every icon-only control has an `aria-label`, and every toggle exposes `aria-pressed`.
- No inline `style` attributes except for values genuinely computed at runtime (e.g. a grid column count), with a comment.

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

- Validate the body with Zod before any other work; return `400` with `invalid_request` on failure.
- **Authorize against state, not shape.** A well-formed identifier is never sufficient — check that the underlying row exists and is in a joinable state before acting on it.
- Read every environment value through `env` from `src/lib/env.ts`. `process.env` is never read outside that file, except in `src/middleware.ts` — see Environment Variables for why that one exception exists.
- Resolve the session with `supabase.auth.getUser()`. A null user is a guest, not an error, except on routes documented as protected.
- Wrap the work in `try`/`catch`. Log the real error server-side with a `[route]` prefix; return a generic user-facing message.
- Return `apiOk(data)` or `apiError(code, message, status)` — never a bare `Response`, never an unshaped object.
- Status codes: `200` read, `201` created, `400` validation, `401` unauthenticated, `403` authenticated but not allowed, `404` not found, `409` conflict, `410` gone (ended or expired), `500` unexpected.
- Never echo a validation error object, a stack trace, or a database message back to the client.

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

- Read the raw body with `request.text()`. Never `request.json()` first — parsing loses the exact bytes the signature covers.
- Verify the signature before doing anything with the payload.
- Webhook handlers are idempotent: the same event delivered twice must not create a duplicate row. This is what makes returning `500` safe.
- Return `500` for a transient failure so the sender retries. Return `200` for an event that is understood-and-ignored, or that can never succeed on retry — retrying those forever accomplishes nothing.
- Every webhook-driven write needs a backstop that does not depend on the webhook arriving. For participation rows that is `room_finished` closing all open rows, plus the nightly expiry sweep; see `architecture.md` → Data Flow.

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

- Pages own fetching and authorization; components own rendering. A component never queries Postgres.
- Always scope a user-owned query with `.eq('user_id', user.id)` even though RLS enforces it — defence in depth, and it makes the intent readable.
- On query error, log and render the empty state. Never let a failed history query take down the page.

### Client hook wrapping a browser API

```ts
// src/hooks/use-chat-key.ts
'use client';

import { useEffect, useState } from 'react';

import { importChatKey, readChatKeyFromHash } from '@/lib/crypto/chat-key';

type ChatKeyState =
  | { status: 'loading' }
  | { status: 'ready'; key: CryptoKey }
  | { status: 'missing' };

export function useChatKey(): ChatKeyState {
  const [state, setState] = useState<ChatKeyState>({ status: 'loading' });

  useEffect(() => {
    const encoded = readChatKeyFromHash(window.location.hash);
    if (!encoded) {
      setState({ status: 'missing' });
      return;
    }

    let cancelled = false;

    // An effect callback cannot itself be async, so the work goes in an IIFE —
    // this is the project's standard shape for async work inside an effect.
    void (async () => {
      try {
        const key = await importChatKey(encoded);
        if (!cancelled) setState({ status: 'ready', key });
      } catch {
        // A malformed key is indistinguishable from no key, and the UI is the same.
        if (!cancelled) setState({ status: 'missing' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
```

- Browser APIs are read inside effects, never at module scope.
- Async effects guard against setting state after unmount with a `cancelled` flag.
- Loading, ready, and failure are modelled as a discriminated union, not as separate booleans — the UI must render something deliberate in each state.

---

## Error Handling

- Server logs use `console.error('[<area>] <what failed>', error)` where `<area>` is the route or module, e.g. `[api/token]`, `[history]`, `[livekit/webhook]`.
- Client logs use `console.warn` for recoverable conditions and `console.error` for genuine faults, prefixed the same way.
- User-facing messages are plain, actionable, and never contain an error code, stack trace, database message, or provider name.
- Media permission denial is a first-class UI state, not an error toast: the lobby explains that camera or microphone access was blocked and how to re-enable it, and still allows joining audio-only or view-only.
- A chat message that fails to decrypt renders as an "unreadable message" placeholder in the transcript. It never throws into the render tree and never silently disappears.
- A missing `#k=` fragment disables the chat composer and shows an explanation that this link cannot read chat. It is not treated as a crash.
- **A fragment can be lost in transit, and that is expected.** The `#k=` part never reaches a server, which is what keeps the chat key private — but it also means anything that rewrites a URL can drop it: some link shorteners, some chat clients' link handling, and any "copy link" that re-serialises rather than copying the raw string. The call still works; only chat is affected. Share the link as plain text, and never route it through a shortener.
- LiveKit disconnects are handled by rendering a reconnecting state; the control bar stays interactive throughout. Never unmount the room tree on a transient disconnect.
- Every `catch` either handles the error or re-throws it with added context. An empty catch block requires a comment explaining what is being deliberately ignored.
- Errors are logged to the server console only. There is no error-reporting service in this project.

---

## Environment Variables

Never hardcode a key, URL, secret, or origin. Every value below is read through
`src/lib/env.ts`, which parses `process.env` with Zod at module load so a
misconfigured deploy fails immediately and loudly rather than at first request.

| Variable | Used In | Secret? |
| -------- | ------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirect target, share-link construction | No |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server Supabase clients | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` only | **Yes** |
| `NEXT_PUBLIC_LIVEKIT_URL` | Returned by `/api/token`; the `wss://` SFU URL the client connects to | No |
| `LIVEKIT_API_KEY` | `src/lib/livekit/token.ts`, `src/lib/livekit/webhook.ts` | **Yes** |
| `LIVEKIT_API_SECRET` | `src/lib/livekit/token.ts`, `src/lib/livekit/webhook.ts` | **Yes** |

**Two modules, split by secrecy.** The four `NEXT_PUBLIC_*` values are parsed in
`src/lib/env.ts`, which is safe to import anywhere. The three secrets are parsed in
`src/lib/env.server.ts`, which begins with `import 'server-only'`. The split is not
stylistic: Next replaces non-public `process.env` reads with `undefined` in the
browser, so a single schema covering both would throw the moment any Client
Component imported it — including `src/lib/supabase/client.ts`.

- A `NEXT_PUBLIC_` prefix means the value is compiled into the client bundle and is visible to anyone. Never add that prefix to a secret.
- `src/middleware.ts` is the single exception to reading env through `env`: it runs in the Edge runtime under a bundle-size budget, and importing the Zod-parsed module would pull Zod in with it. It may read the two `NEXT_PUBLIC_` Supabase values from `process.env` directly, and nothing else.
- Secrets are configured in the Render dashboard and listed in `render.yaml` with `sync: false`. They are never committed, and `.env.local` is git-ignored.
- `.env.example` lists every variable with a placeholder value and must be updated in the same commit that introduces a new variable.

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

- Any value used by more than one module lives here. A magic number appearing twice is a bug waiting to happen.
- `DATA_TOPIC` values are a wire protocol shared between peers — changing one is a breaking change for anyone mid-call on an older bundle.

---

## Import Conventions

- Use the `@/*` alias for everything under `src/`. It is configured in `tsconfig.json` as `"@/*": ["./src/*"]`.
- Relative imports are allowed only for siblings inside the same folder (`./message-bubble`). Never `../` — if you need to reach up, use the alias.
- Type-only imports use `import type { … }` so they are erased at build time.
- Import the specific module that owns a symbol; there are no barrel files to import from.
- Never import from `src/app/` into `src/lib/` or `src/components/`.

---

## Comments

- Comment *why*, never *what*. If the code needs a comment to explain what it does, rename something instead.
- Non-obvious constraints must be commented: why the webhook reads the raw body, why the token TTL is capped to the meeting's remaining life, why the alphabet has 32 characters, why a `catch` is empty.
- Every security-relevant decision carries a one-line comment, because the next reader must not "simplify" it away.
- JSDoc goes on exported functions in `src/lib/` whose contract is not obvious from the signature — especially anything in `src/lib/crypto/`.
- `TODO:` comments must name what is missing. A bare `TODO` is not acceptable. Anything deferred also gets an entry in `build-journal.md`.
- No commented-out code. Git remembers.

---

## Dependencies

Before installing anything new, check:

1. Does the browser platform already do this? Web Crypto, `Intl`, `URLSearchParams`, `structuredClone`, and CSS covered several needs here that would otherwise be packages.
2. Does Next.js, LiveKit, or Supabase already ship it? `@livekit/components-react` includes layout, device, and data-channel primitives that are easy to re-implement by accident.
3. Is it a single small function? Write it in `src/lib/` instead.
4. What is the install size, maintenance status, and license?
5. Does it run in the browser bundle? Anything pulled into a Client Component ships to every user on every device, including phones on slow connections.

Approved dependencies for this project:

- `next` — framework, routing, route handlers
- `react`, `react-dom` — UI runtime
- `typescript` — language and type checking
- `livekit-client` — WebRTC room connection and track management
- `@livekit/components-react` — React hooks and layout primitives for LiveKit
- `livekit-server-sdk` — server-side `AccessToken` and `WebhookReceiver`
- `@supabase/supabase-js` — Postgres queries and the service-role admin client
- `@supabase/ssr` — cookie-based Supabase clients for App Router and middleware
- `zod` — runtime validation at every server boundary and for env parsing
- `tailwindcss`, `@tailwindcss/postcss` — styling
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn/ui class composition, used by `cn()`
- `@radix-ui/*` — accessible primitives pulled in per shadcn component; only add the ones actually used
- `lucide-react` — icon set. The kit has no icon set of its own and names Lucide as the sanctioned substitution: 2px stroke, stroked never filled, and used sparingly since the brand is typographic
- `animejs` — motion on Home, the lobby, and sign-in surfaces only; never imported into the call tree
- `server-only` — build-time guard that keeps server modules out of client bundles
- `vitest`, `@vitest/coverage-v8` — unit tests
- `@playwright/test` — end-to-end tests
- `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss` — linting and formatting

Do not install any other packages without updating this list first.
