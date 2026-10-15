# Marketing UI Kit — upstream reference

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

A detailed recreation of the animejs.com-style marketing surface, using the design system tokens.

## Files

- `index.html` — interactive demo: hero + nav + code showcase + feature grid + footer
- `Nav.jsx` — top nav with logo, doc links, GitHub
- `Hero.jsx` — the big wordmark + tagline + CTA + overline bumper
- `CodeShowcase.jsx` — side-by-side code sample + live animation
- `FeatureGrid.jsx` — 6-up feature cards
- `Footer.jsx` — minimal terminal footer

Based on `examples/animejs-v4-logo-animation/` and the visual style of upstream animejs.com.

## What is worth taking

The sequence of hero, overline and feature cards is a reasonable layout model
for Home and the lobby, where `animejs` is allowed.

`Hero.jsx` renders the **Anime.js** wordmark. Our wordmark is `VideoCircle`, with
a red square separating the two words; see `preview/logo.html`.
