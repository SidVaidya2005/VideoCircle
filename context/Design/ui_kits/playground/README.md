# Playground UI Kit — upstream reference

> ## REFERENCE ONLY — DO NOT COPY INTO `src/`
>
> These upstream Anime.js demos are kept for **layout ideas**. Do not use them as
> component recipes: they do not meet this project's standards.
>
> - They have no `import` / `export`; they read `React` from a browser global.
> - Every value is an inline `style={{}}` with raw literals (`'#1a1a1a'`, `fontSize:13`).
> - `#1a1a1a` is not a brand colour. The canvas uses `--bg-1` `#252423`.
>
> These choices violate `context/code-standards.md`, which forbids inline styles,
> raw hex and arbitrary px. Use the demos to understand structure, then build with
> tokens and the reusable examples in `preview/*.html`.

These examples recreate the playground surface: the easing visualizer shell,
clock playback controls and scope-grid canvas.

## Files

- `index.html` — interactive demo: toggle between three playground modes
- `EasingsVisualizer.jsx` — the red-on-black graph + ease button grid
- `ClockControls.jsx` — flipping digits + playback button bar
- `ScopeCanvas.jsx` — a grid-on-black animated canvas with staggered squares

Source: `examples/easings-visualizer/`, `examples/clock-playback-controls/`, `examples/animejs-v4-logo-animation/` from the anime repo.

## What is worth taking

The **fixed top-params / bottom-controls layout** directly models the meeting
room: status stays at the top, media controls stay at the bottom, and content has
space between them.

`ClockControls.jsx` also shows the dashed-border treatment that the brand reserves
for measurement contexts.

Use `preview/control-states.html` for the call's actual control-bar states. That
example uses tokens, supports accessibility and reflects the current rules.
