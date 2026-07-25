# Anime.js Design System

A recreation of the visual system behind **[Anime.js](https://animejs.com)** v4 — the lightweight JavaScript animation library by [Julian Garnier](https://juliangarnier.com). The codebase we studied lives on GitHub; this folder distils its aesthetic into a reusable brand kit.

> Anime.js is a fast, multipurpose and lightweight JavaScript animation library with a simple, yet powerful API. It works with CSS properties, SVG, DOM attributes and JavaScript Objects.

## Sources

- **GitHub repo (fork used here):** `SidVaidya2005/design-site` (a fork of `juliangarnier/anime`)
- **Upstream:** `juliangarnier/anime` — npm package name `animejs` (v4.3.6)
- **Canonical site:** https://animejs.com
- **Files studied in depth (on disk, preserved under `source-references/` conceptually — assets imported into `/assets` and `/fonts`):**
  - `examples/assets/css/styles.css` — full token system, **ground-truth for colors**
  - `examples/animejs-v4-logo-animation/index.html` — the v4 brand logo SVG + the "AVAILABLE NOW AT ANIMEJS.COM" overline motif
  - `examples/easings-visualizer/index.html` — reference for buttons, sliders, grid backdrop, the red‑on‑black "scope" UI language
  - `examples/clock-playback-controls/index.html` — reference for the PLAY / PAUSE / RESET control row
  - `README.md`, `package.json` — tone, copy, product framing

## What is this product?

Anime.js isn't a SaaS with screens — it's a **developer tool** whose "product surface" is:

1. **The library itself** (imported via ES modules or UMD)
2. **The marketing site at animejs.com** (the landing/docs experience)
3. **The examples gallery** — each a tiny, self-contained HTML page that doubles as demo and visual showcase

So the "UI kits" in this system cover the **marketing surface** (hero, code samples, nav, feature cards) and the **examples/playground surface** (the easings visualizer, the clock controls, the scope-on-grid canvas). Both share the same terminal-dark, mono-typed DNA.

## Index (what lives where)

| File / folder | What it is |
| --- | --- |
| `README.md` | This file |
| `SKILL.md` | Agent-invocable skill descriptor (Claude Skills compatible) |
| `colors_and_type.css` | All CSS variables — colors, type, spacing, radii, easings |
| `fonts/` | `IoskeleyMono-Regular.woff2`, `IoskeleyMono-Bold.woff2` (the brand monospace) |
| `assets/images/` | V4 logo animation GIFs (light + dark) and the "usage example" GIF |
| `preview/` | Design-system cards (one visual concept per file) |
| `ui_kits/site/` | Marketing site UI kit — hero, nav, code sample, footer, feature cards |
| `ui_kits/playground/` | Example/playground kit — easings visualizer shell, clock controls, grid canvas |

---

## Content fundamentals

Anime.js has almost no marketing copy — what little it has is **technical, confident, lowercase-friendly, and code-first**. The brand speaks through its live demos, not paragraphs.

**Voice & tone**
- **Technical and matter-of-fact.** "Anime.js is a fast, multipurpose and lightweight JavaScript animation library with a simple, yet powerful API."
- **Code is the hero, not the copy.** Every feature sentence is paired with a runnable example.
- **Terminal-flavoured.** Short UPPERCASE overlines in the signature mono act as bumpers — e.g. `AVAILABLE NOW AT ANIMEJS.COM` floats below the logo.
- **Second-person or imperative** when addressing the reader ("Help the project become sustainable by sponsoring us"). **Never** marketing-speak "we" or corporate "us".
- **Plain, stripped of hype words.** No "revolutionize", no "delightful", no "game-changing". Just descriptors: *fast, multipurpose, lightweight, simple, powerful*.

**Casing**
- **Title Case** for proper nouns: `Anime.js`, `V4 Documentation`, `Platinum sponsors`
- **SCREAMING CAPS + wide tracking** for terminal overlines and control buttons (`PLAY`, `PAUSE`, `REVERSE`, `ALTERNATE`, `SLOW MO`)
- **lowercase** for API names, kept *exactly as code*: `animate`, `stagger`, `inOutQuint`, `easeName`, `currentTime`

**Punctuation & style**
- `.js` is part of the wordmark (`Anime.js`, not `AnimeJS`).
- Version numbers use a capital `V`: `V4`, `V3`.
- Emoji: **none**. The brand is strictly type + geometry.
- Em-dashes used for asides, matching the Julian-Garnier author voice.

**Examples from the source (paraphrased for our designs)**
- Hero line: "Fast, multipurpose, lightweight." (3-word triads work here)
- Overline bumper: `AVAILABLE NOW AT ANIMEJS.COM`
- Button labels: `PLAY`, `PAUSE`, `REVERSE`, `ALTERNATE`, `SLOW MO`, `SPEED UP`, `NORMAL SPEED`, `RESET`, `RESUME`, `SEEK`, `COMPLETE`, `RESTART`
- Parameter labels: `currentTime`, `speed`, `P1`, `P2`, `easeName` — code identifiers verbatim, never renamed for "nicer" display.

---

## Visual foundations

### The big idea
A **CRT-scope laid over warm near-black**, annotated like an engineer's tool. Red axis line, cyan burst marks, mono labels, an oscilloscope grid that bleeds past the frame. Everything feels measured, slightly retro (Sega/Atari-era computing), and hand-wired.

### Backgrounds
- **Primary bg:** `#252423` — a warm near-black (not true black, not cool grey). This is the canonical canvas.
- **Elevation ladder:** `bg-1` (page) → `bg-2` (card) → `bg-3` (raised) → `bg-4` (overlay) → `bg-5` (higher). Each step is ~5 points lighter.
- **Signature overlay:** a double-layered **grid backdrop** — fine 10-unit subgrid + 100-unit major grid, drawn with `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px)` stacks. Often bleeds past the container (`width: calc(75px + 100%); left: -75px;`).
- **No gradients as decoration.** Gradients exist only as functional masks (fade-to-bg on top/bottom of the flipping clock digits) or behind logo burst effects.
- **No photography, no illustrations, no hand-drawings.** The brand is geometry, type, and motion.

### Colors
- **Accent heroes:** signal red `#ff4b4b` (axes, active states, the signature dot), cyan `#4BFFFD` (burst rays from the logo's dot), final-state green `#00FF5D`.
- **Extended palette:** 16 hues (red, corail, orange, yellow, citrus, lime, green, emerald, turquoise, cyan, sega, sky, indigo, lavender, purple, magenta, pink) × 6 stops (1 = vivid, 6 = bg-tinted). This is essentially a **chromatic terminal palette** — every hue has enough saturation to pop on the near-black.
- **Usage rule:** at most **one** accent-1 hue per screen as the signal colour. Everything else lives in neutrals (`fg-1…fg-5`, `bg-1…bg-5`). Red is the default signal; other hues identify *different kinds* of data (e.g. ease categories in the visualizer).

### Type
- **Single family:** `IoskeleyMono` — a bespoke monospace. Regular + Bold only. Everything on the site, from hero to fine print, is this font.
- **Nearest Google Fonts match (fallback if IoskeleyMono not loaded):** `JetBrains Mono` is closest, followed by `IBM Plex Mono`. **⚠ Flag to user:** IoskeleyMono is a licensed font; if re-distributing, confirm rights or substitute JetBrains Mono.
- **Tight line-height** (1.1–1.25 for heads, 1.5 only for body paragraphs).
- **Wide tracking for CAPS overlines** (~0.06em). This is *the* signature type gesture.
- **No italics.** The font is used structurally, not expressively.
- **Sizes:** terminal scale with visible jumps — 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 56 / 80.

### Animation
Anime.js is an animation library — motion **is** the brand. Every surface should have at least one moving thing. Signature easings (all exported from the library):

| Named in code | Shape | When to use |
| --- | --- | --- |
| `linear` | — | Technical read-outs, axes sweeps |
| `inOutQuint` | steep S-curve | Signature; hero reveals, loop alternates |
| `outQuint` | fast-then-settle | Most UI transitions (buttons, sliders) |
| `outExpo` | snap + float | Logo reveal, letter-by-letter stagger |
| `outElastic` / `outBack` | overshoot | Playful bounces (sparingly) |
| `spring` | physics | Dragging, mass-like interactions |

**Durations:** `150ms` for hovers, `250ms` for most UI, `600–1250ms` for hero moments.
**Stagger** is the library's trademark — elements animate in sequence, often `from: 'center'` to radiate outward.

### Hover & press states
- **Buttons:** white fill on rest (`--white-1`), darkens one step to `--white-2` on hover. `cursor: pointer`.
- **Ease-buttons (and similar chips):** background steps from `rgba(255,255,255,.05)` at rest → `rgba(255,255,255,.1)` on hover. Active state fills with **red** (`--red-1`) and flips text to `--bg-1`.
- **Press state:** no shrink; instead the background flips to the *inverse* (white fill, dark text) — keyboard focus reuses this.
- **Transitions:** `background-color .05s ease-out` on hover **in**, `background-color .25s ease-in-out` on hover **out**. Intentionally asymmetric — snaps on, relaxes off.

### Borders, strokes & shadows
- **Borders are whispers:** `1px solid rgba(255,255,255,.08)` is the default card border. Dotted and dashed 50%-white borders are used for *measurement* contexts (graph panes, axes).
- **Shadows are minimal.** The primary shadow isn't visual — it's `0 10px 10px 0 var(--black-1)`, the same colour as the page, acting as a *mask* where a sticky header covers scrolling content beneath.
- **The ring shadow** `0 0 0 1px rgba(255,255,255,.1)` is reserved for the logo frame — a subtle "edge of the screen" glow.
- **Glow accents:** red glow behind hero dots, cyan glow behind logo bursts. Use as embellishment, never as depth cue.

### Corner radii
- `0.25rem` — inputs, small chips (tight, engineering-feel)
- `0.4rem` — default buttons
- `0.6rem` — ease-buttons
- `1rem` — cards, clock container
- `1.25rem` — hero panels
- `999px` — pill badges (rare; used for tag-style metadata)

Never razor-sharp 0 radius — the brand always softens a tiny bit. Never fully rounded unless it's a pill or dot.

### Layout
- **Centred, often absolutely positioned** — the examples use `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;` to put the focal element dead-centre and let the grid fill everything else.
- **Fixed-position control strips** — parameters pin to the **top** of the viewport, playback controls pin to the **bottom**. Content breathes in between.
- **Full-bleed dvh/dvw viewports** are common (`min-width: 100dvw; min-height: 100dvh;`).
- **Grid is declarative** (`grid-template-areas` with names like `"time time ."` `"graph graph preview"`). No flex-for-grid hacks.

### Transparency & blur
- Logs panel: `background-color: rgba(0,0,0,.5)` — simple semi-opaque, no backdrop-blur. The brand **avoids glassmorphism**.
- The only blur effect in the codebase is a functional `feGaussianBlur` on the logo's red "4" (motion streak).

### Cards
- Background: `--bg-2` (`#2a2928`), 1px subtle border, `1rem` radius.
- **No drop shadow.** The only "elevation" is the background step.
- Cards may be clicked/selected; selection flips them to the red fill with dark text.

### Imagery
- Almost none. The one image in the repo is the **v4 logo animation GIF** (dark + light variants). Vibe: high contrast, saturated red/cyan/green on warm black, crisp geometric SVG, no photographic imagery.

---

## Iconography

**Anime.js barely uses icons.** The brand is typographic and geometric. When visual symbols appear, they are:

1. **The red dot** — a small filled square/rect that dots the letter `i` in the wordmark. This is *the* brand mark.
2. **Axis markers** — 1px red rules with small corner squares, representing coordinate systems.
3. **SVG glyphs drawn inline** — the logo itself is a custom SVG; there's no icon font.

**This system's approach:**
- **No icon font.** Icons are rare; when absolutely needed (play / pause / chevrons), lift them from **Lucide** (`https://unpkg.com/lucide@latest`) — same stroke weight (2px) and terminal feel. **Flag**: this is a substitution; the upstream product has no icon set so any icon addition is ours.
- **Unicode chars** acceptable for dividers (`•`, `—`, `/`) and for spinners in demos.
- **Emoji: never.**
- **Product marks only:** logos go in `assets/images/`; the full v4 animated wordmark is `animejs-v4-logo-animation.gif` (light) and `-dark.gif`.

**Avoid** at all costs:
- Drawing new SVG illustrations to fill space
- Rounded "material" icons
- Coloured fill icons — all icons, if used, are stroked.

---

## Caveats & notes for humans

- **Font licence:** `IoskeleyMono` is used by the upstream repo; we've copied the `.woff2` files as reference but you should confirm licensing before shipping it in production. Fallback stack already routes to `JetBrains Mono` → `IBM Plex Mono` → system mono.
- **The `design-site` repo is a fork of `anime`.** The source of truth for brand decisions is upstream `juliangarnier/anime`. If the upstream revises tokens, re-run colours from `examples/assets/css/styles.css`.
- **No icon set.** We've flagged Lucide as a reasonable substitution. Swap if the brand adopts something official.
