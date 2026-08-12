---
name: videocircle-design
description: Use when designing or building any VideoCircle UI surface — Home, sign-in, the lobby, the meeting room, chat, or call history. Carries the brand's tokens, type, motion, and the call-specific rules that the upstream kit never had to make.
user-invocable: true
---

Read `README.md` in this folder in full before designing any surface, then lift
from `preview/*.html` rather than interpreting the rules from scratch.

Nothing under `src/` imports from this folder. Tokens are mirrored into the
`:root` and `@theme inline` blocks of `src/app/globals.css`; assets are copied
into `public/brand/`.

## Quick orientation

- **Tokens:** `colors_and_type.css` — colours, type, spacing, radii, easings, scrims.
- **Type:** JetBrains Mono via `next/font/google`. One family, everywhere.
- **Mark:** `assets/wordmark.svg` and `assets/mark.svg`. In-app the wordmark is live text — see `preview/logo.html`.
- **Specimens:** `preview/*.html`, one concept per file. These are liftable.
- **`ui_kits/`:** reference only. Upstream demos with inline raw literals; never copy into `src/`.
- **Lint:** `_adherence.eslint.mjs` enforces the non-negotiables on `.ts`/`.tsx`.

## Non-negotiables

1. **Warm near-black `#252423`.** Never true black, never cool grey.
2. **One family, everywhere.** No second typeface, not even for chat or fine print.
3. **Red `#ff4b4b` is the signal**, used sparingly. In a call it means exactly two things: Leave, and *your own* mic or camera off. The engaged state of a toggle is a **white fill**, never red.
4. **No emoji. No generated illustrations.** Copy real assets from `assets/`.
5. **Motion uses the kit's own easings**, asymmetric on hover. **CSS transitions only inside the call** — JS animation competes with WebRTC encoding.
6. **Wide-tracked SCREAMING CAPS** for overlines and control labels. Never italic.
7. **Dark only.** No light palette exists, so there is no theme toggle and no `dark:` variant.
8. **Any text over live video rides a scrim** (`--scrim-tile`). No `backdrop-blur` anywhere.
9. **Literal values live in one file.** A hex outside `globals.css` is a bug.
10. **Mobile is a requirement.** 360px, 44×44px hit areas, `dvh` not `vh`, safe-area insets.
