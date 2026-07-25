---
name: animejs-design
description: Use this skill to generate well-branded interfaces and assets for Anime.js, either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **Tokens:** `colors_and_type.css` — all colors, type, spacing, radii, easings as CSS vars.
- **Fonts:** `fonts/IoskeleyMono-*.woff2` (regular + bold). The whole brand is this one mono.
- **Logo & key imagery:** `assets/images/animejs-v4-logo-animation-dark.gif` (plus light variant and usage-example GIF).
- **Component recipes:** `ui_kits/site/` (marketing) and `ui_kits/playground/` (examples/visualizer). Inspect the `.jsx` files for pixel-perfect implementations.
- **Preview cards:** `preview/*.html` — one focused specimen per file (palette, buttons, code, etc). Lift straight into new work.

## Non-negotiables

1. **Warm near-black bg (`#252423`).** Never true black, never cool grey.
2. **IoskeleyMono for everything.** No second family. Fallback stack is already wired.
3. **Red `#ff4b4b` = the signal.** Used sparingly: axes, active state, the dot over `i` in the wordmark.
4. **No emoji. No generated illustrations.** Copy real assets from `assets/`; use placeholders if none exist.
5. **Motion is mandatory.** Use the brand's own easings (`inOutQuint`, `outQuint`, `outExpo`). Stagger from `center` is the trademark gesture.
6. **Wide-tracked SCREAMING CAPS** for overlines (`AVAILABLE NOW AT ANIMEJS.COM`). Never italic.
