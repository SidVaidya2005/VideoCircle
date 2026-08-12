# Playground UI Kit — upstream reference

> ## REFERENCE ONLY — DO NOT COPY INTO `src/`
>
> These are upstream Anime.js demos, kept for their **layout ideas**. They are not
> component recipes and they do not meet this project's standards:
>
> - no `import` / `export` — they read `React` off a browser global
> - every value is an inline `style={{}}` with raw literals (`'#1a1a1a'`, `fontSize:13`)
> - `#1a1a1a` is not even a brand colour; the canvas is `--bg-1` `#252423`
>
> Each of those violates `context/code-standards.md` (no inline styles, no raw hex,
> no arbitrary px). Read them for structure, then build from tokens and
> `preview/*.html`, which are the liftable specimens.

Recreations of the example/playground surface: easings visualizer shell, clock playback controls, and the scope-grid canvas.

## Files
- `index.html` — interactive demo: toggle between three playground modes
- `EasingsVisualizer.jsx` — the red-on-black graph + ease button grid
- `ClockControls.jsx` — flipping digits + playback button bar
- `ScopeCanvas.jsx` — a grid-on-black animated canvas with staggered squares

Source: `examples/easings-visualizer/`, `examples/clock-playback-controls/`, `examples/animejs-v4-logo-animation/` from the anime repo.

## What is worth taking

The **fixed top-params / bottom-controls layout** is the direct model for the
meeting room: status pins top, media controls pin bottom, content breathes
between. `ClockControls.jsx` also shows the dashed-border treatment the brand
reserves for measurement contexts.

For the call's actual control-bar states, use `preview/control-states.html`
instead — it is tokenised, accessible, and current.
