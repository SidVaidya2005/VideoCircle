# Marketing UI Kit — upstream reference

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

A hi-fi recreation of the animejs.com-style marketing surface using the design system tokens.

## Files
- `index.html` — interactive demo: hero + nav + code showcase + feature grid + footer
- `Nav.jsx` — top nav with logo, doc links, GitHub
- `Hero.jsx` — the big wordmark + tagline + CTA + overline bumper
- `CodeShowcase.jsx` — side-by-side code sample + live animation
- `FeatureGrid.jsx` — 6-up feature cards
- `Footer.jsx` — minimal terminal footer

Built from `examples/animejs-v4-logo-animation/` and upstream animejs.com visual cues.

## What is worth taking

The hero / overline / feature-card rhythm is a reasonable model for Home and the
lobby — the surfaces where `animejs` is allowed. Note that `Hero.jsx` renders the
**Anime.js** wordmark; ours is `videocircle` with the red square dotting the i in
"circle" (see `preview/logo.html`).
