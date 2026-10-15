---
name: videocircle-design
description: Use when designing or building any VideoCircle UI surface — Home, sign-in, the lobby, the meeting room, chat, or call history. Carries the brand's tokens, type, motion, and the call-specific rules that the upstream kit never had to make.
user-invocable: true
---

Before designing any surface, read this folder's `README.md` in full. Use the
examples in `preview/*.html` as your starting point rather than rebuilding the
rules from scratch.

Nothing under `src/` imports from this folder. Copy tokens into the `:root` and
`@theme inline` blocks of `src/app/globals.css`, and copy assets into
`public/brand/`.

## Quick orientation

- **Tokens:** `colors_and_type.css` — colours, type, spacing, radii, easings, scrims.
- **Type:** JetBrains Mono via `next/font/google`. One family, everywhere.
- **Mark:** `assets/wordmark.svg` and `assets/mark.svg`. Render the in-app wordmark as live text; see `preview/logo.html`.
- **Specimens:** `preview/*.html` contains one concept per file. You can build directly from these examples.
- **`ui_kits/`:** reference only. These upstream demos use inline raw literals. Never copy them into `src/`.
- **Lint:** `_adherence.eslint.mjs` enforces the binding rules on `.ts`/`.tsx`.

## Non-negotiables

1. **Warm near-black `#252423`.** Never true black, never cool grey.
2. **One family, everywhere.** No second typeface, not even for chat or fine print.
3. **Use signal red `#ff4b4b` sparingly.** In a call it has exactly two meanings: Leave, and *your own* mic or camera off. An engaged toggle has a **white fill**, never red.
4. **No emoji or generated illustrations.** Copy real assets from `assets/`.
5. **Use the kit's own easing curves**, with asymmetric hover transitions. **Inside the call, use only CSS transitions** because JS animation competes with WebRTC encoding.
6. **Use widely spaced SCREAMING CAPS** for overlines and control labels. Never use italics.
7. **Dark only.** There is no light palette, so do not add a theme toggle or any `dark:` variant.
8. **Put a scrim behind all text over live video** (`--scrim-tile`). Never use `backdrop-blur`.
9. **Keep literal values in one file.** A hex outside `globals.css` is a bug.
10. **Mobile is a requirement.** Support 360px, 44×44px hit areas and safe-area insets. Use `dvh`, never `vh`.
