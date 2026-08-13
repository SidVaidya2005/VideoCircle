# VideoCircle Design System

A terminal-dark, mono-only visual language: warm near-black, one monospace
family, red as the single signal colour, wide-tracked SCREAMING CAPS, and
measured geometric motion. This folder is the visual source of truth for the
product — read it before designing any surface.

**Nothing under `src/` imports from this folder.** Tokens are mirrored into the
`:root` and `@theme inline` blocks of `src/app/globals.css`; assets are copied
into `public/brand/`. This folder is the reference; the app is the copy.

## Provenance

Adapted from the visual system behind **[Anime.js](https://animejs.com)** v4, the
animation library by [Julian Garnier](https://juliangarnier.com), which is
MIT-licensed. The palette, type scale, easing curves, and interaction states are
derived from `examples/assets/css/styles.css` in that project and carried over
largely unchanged — they are a coherent system and we did not want to dilute one.

**What was removed and why:**

| Removed | Reason |
| --- | --- |
| `assets/images/*.gif` — the v4 animated wordmark and usage GIF | Anime.js trademarks. VideoCircle cannot ship another product's logo. Replaced with our own mark. |
| `_ds_bundle.js`, `_ds_manifest.json` | Tooling for the upstream kit's own preview gallery. Nothing read them. |
| `--black-1…6`, `--white-3…6` | Not ladders. `--black-2…4` were the same value three times; `--black-1` duplicated `--bg-1` exactly; `--white-3…6` duplicated `--fg-*` at different values. Elevation is `--bg-*`, text is `--fg-*`, active fill is `--white-1/2` — there is no fourth neutral scale. |
| `--font-system` | A second font alias in a one-family brand is an invitation to break the rule. |

`fonts/IoskeleyMono-*.woff2` remain on disk as a local rendering reference but are
**git-ignored and never shipped** — the face is licensed separately from Anime.js
itself and is not ours to redistribute. The app loads **JetBrains Mono**, which
upstream itself names as the closest match.

## Index

| File / folder | What it is |
| --- | --- |
| `README.md` | This file — the full specification |
| `SKILL.md` | Agent-invocable skill descriptor |
| `colors_and_type.css` | All CSS variables — colours, type, spacing, radii, easings, scrims |
| `_adherence.eslint.mjs` | Runnable lint rules enforcing the non-negotiables in `src/**` |
| `_verify.mjs` | Integrity check — token mirror, specimen links, SVG validity, context-doc conformance. Run it after touching any of them |
| `assets/wordmark.svg` | The wordmark, for OG images and decks. In-app it renders as live text |
| `assets/mark.svg` | Compact mark — favicon, OG tile, avatar fallback |
| `fonts/` | IoskeleyMono reference only — git-ignored, never shipped |
| `preview/` | Specimens, one concept per file. Lift straight into new work |
| `preview/control-states.html` | Control-bar states, and the phone collapse rule. Use this, not the upstream JSX |
| `preview/tile-label.html` | Participant tile states — speaking ring, own vs. remote mute, camera-off initials |
| `preview/video-scrim.html` | The text-over-video scrim rule and its contrast floor |
| `preview/footer.html` | Author byline and links — the one place personal links appear |
| `ui_kits/` | **Reference only** — upstream demos, not recipes. See the warning in each folder's README |

---

## The mark

The wordmark is `VideoCircle`, PascalCase, in the brand mono, with a **red square
dotting both i's** — the same gesture upstream uses on the `i` in its own
wordmark, applied to our name and doubled. Each i is U+0131 DOTLESS I so the red
square is the only tittle on that letter; an ordinary `i` would keep its own dot
underneath the square.

This is the one place red appears twice on a single element, and it stays within
"used sparingly" because the mark is not UI: it carries no state, so it cannot
compete with the Leave control or a muted-mic warning for meaning.

**In the app, render it as live text, not an image.** It is a mono wordmark, so
real text stays crisp at every size, scales with the type ramp, and is readable
by screen readers. `preview/logo.html` holds the HTML/CSS recipe. `wordmark.svg`
exists only for contexts where live text is unavailable: OG images, README
embeds, external decks.

The compact mark — a red square on warm near-black — carries no type at all, so
it survives at 16px. It is the favicon, the OG tile, and the avatar fallback.

---

## Content fundamentals

**Voice & tone**
- **Plain and matter-of-fact.** "Start a meeting. Share the link." No hype words — no "seamless", no "effortless", no "revolutionise".
- **Second-person or imperative** when addressing the person. Never marketing "we".
- **Terminal-flavoured.** Short UPPERCASE overlines in the mono act as bumpers: `START A MEETING · SHARE THE LINK`.
- **The product speaks through the call working**, not through paragraphs about it.

**Casing**
- **Title Case** for proper nouns and page titles: `Call History`, `Sign in with Google`.
- **SCREAMING CAPS + wide tracking** for overlines, status strips, and control labels.
- **lowercase, verbatim** for identifiers the user must read or type — room codes render exactly as generated (`kzt-9f4-qmx`), never prettified or re-cased.

**Punctuation & style**
- Emoji: **none**, anywhere, including in chat UI chrome and empty states.
- Em-dashes for asides.
- Durations and counts are plain: `4 participants`, `00:12:07`.

---

## Visual foundations

### The big idea
A **CRT scope laid over warm near-black**, annotated like an engineer's tool. Red
axis line, mono labels, an oscilloscope grid that bleeds past the frame.
Everything feels measured, slightly retro, and hand-wired — a tool, not a toy.

### Backgrounds
- **Primary bg:** `#252423` — a warm near-black, not true black, not cool grey. The canonical canvas.
- **Elevation ladder:** `bg-1` (page) → `bg-2` (card) → `bg-3` (raised) → `bg-4` (overlay) → `bg-5` (higher). Each step ~5 points lighter. **Elevation comes from this ladder, never from shadows.**
- **Signature overlay:** a double-layered **grid backdrop** — fine 10-unit subgrid + 100-unit major grid, `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px)` stacks, often bleeding past the container.
- **No gradients as decoration.** Gradients are functional only: scrims over video, fade masks.
- **No photography, no illustrations, no generated imagery.** The brand is geometry, type, and motion.

### Colours
- **Signal red `#ff4b4b`** — the one accent that carries meaning. See *Colour in a call* below for its exact allocation.
- **Cyan `#4BFFFD` and green `#00FF5D`** are reserved for completion moments and the mark. Do not repurpose them for UI state.
- **Extended palette:** 16 hues × 6 stops, a chromatic terminal palette where every hue pops on the near-black. Available, rarely correct — most surfaces are neutrals plus one signal.
- **Usage rule:** at most **one** accent-1 hue per screen.

### Type
- **Single family: JetBrains Mono**, loaded via `next/font/google` so it self-hosts at build time. Regular + Bold only. Everything is this font — hero, chat, fine print, no exceptions.
- **Tight line-height** — 1.1–1.25 for headings, 1.5 only for body paragraphs.
- **Wide tracking on CAPS overlines** (~0.06em). This is *the* signature type gesture.
- **No italics.** The font is structural, not expressive.
- **Sizes:** terminal scale with visible jumps — 12 / 14 / 16 / 18 / 20 / 24 / 32 / 40 / 56 / 80.

### Motion
| Named curve | Shape | When to use |
| --- | --- | --- |
| `linear` | — | Technical read-outs, timers |
| `inOutQuint` | steep S-curve | Signature; hero reveals, loops |
| `outQuint` | fast-then-settle | Most UI transitions |
| `outExpo` | snap + float | Entrance staggers |
| `outElastic` / `outBack` | overshoot | Sparingly |

**Durations:** `150ms` hovers, `250ms` most UI, `600–1250ms` hero moments.
**Stagger** is the trademark gesture — sequence elements, often `from: 'center'`.

**Inside an active call, CSS transitions only.** JS-driven animation competes with
WebRTC encoding for the main thread, and the cost lands on exactly the low-end
phones the call is hardest on. `animejs` belongs on Home, the lobby, and sign-in.
Honour `prefers-reduced-motion` everywhere: keep opacity, drop transforms.

### Hover & press states
- **Buttons:** white fill at rest (`--white-1`), one step darker (`--white-2`) on hover.
- **Chips and toggles:** `rgba(255,255,255,.05)` at rest → `rgba(255,255,255,.1)` on hover.
- **Press does not shrink.** The fill inverts instead — white ground, dark glyph. Keyboard focus reuses that same inverted state.
- **Transitions are asymmetric:** `background-color .05s ease-out` on the way in, `.25s ease-in-out` on the way out. Snaps on, relaxes off.

### Borders, strokes & shadows
- **Borders are whispers:** `1px solid rgba(255,255,255,.08)` is the default.
- **Dashed and dotted 50%-white borders** are reserved for *measurement* contexts — sliders, ranges, axis rules.
- **Shadows are functional, never depth cues.** `--shadow-soft` masks scrolling content under a sticky header; `--shadow-ring` edges the mark; the red/cyan glows are embellishment.

### Corner radii
`0.25rem` inputs and chips · `0.4rem` buttons · `0.6rem` chip-style toggles ·
`1rem` cards and panels · `1.25rem` hero panels · `999px` pills and dots only.

Never a razor-sharp `0` — the brand always softens slightly.

### Layout
- **Fixed control strips:** status pins to the top, controls pin to the bottom, content breathes between. This maps directly onto a call.
- **Full-bleed `dvh`/`svh` viewports** — never `vh`, which breaks under mobile browser chrome.
- **Declarative grid** (`grid-template-areas`), not flex-for-grid hacks.
- **Mobile-first, always.** Every layout works at 360px. Every interactive element clears a 44×44px hit area. Honour safe-area insets top and bottom.

### Transparency & blur
Flat semi-opaque fills only — `rgba(0,0,0,.5)`. **No `backdrop-blur`, no
glassmorphism.** It is off-brand, and the GPU cost lands on the weakest devices.

### Iconography
The brand ships **no icon set**. Lucide is the sanctioned substitution, imported
from `lucide-react`: 2px stroke, stroked never filled, never coloured except
`PhoneOff`. Icons are sparse — the brand is typographic. The red square dot is
the only *native* brand glyph. **Never draw a new SVG illustration to fill space.**

---

## VideoCircle additions

The upstream kit dressed a marketing site and a code playground. These are the
decisions it never had to make, and they are binding.

### Colour in a call

One-accent-per-screen does not survive contact with a call, which has many
simultaneous status colours. The allocation is fixed here rather than decided per
component:

- **Red (`--red-1`)** — destructive and self-warning only: the Leave control, and *your own* microphone muted. Nothing else. **Not a stopped camera** — off-camera is not a warning, it is a preference, and the slashed icon already carries it. This was decided in the lobby at F08 and applied to the call bar at F11; the two surfaces must not disagree about what the same control means.
- **White fill (`--white-1`) with a dark glyph** — the engaged state of any toggle. This is the kit's own inverted press state. **Engaged is white, not red** — several toggles can be on at once, and if "on" meant red, red would stop meaning danger exactly when Leave needs it most.
- **Neutrals** — everything else. A *remote* participant's mute dot is `--fg-3`; twelve red badges on a twelve-person grid would destroy the signal.
- **Connection quality** — `green-1` / `yellow-1` / `red-1`, as a small marker only, never a filled surface.

See `preview/control-states.html`.

### Text over video

Every other contrast pairing in this system assumes a known `--bg-*`. A tile label
sits on arbitrary live pixels, and the worst case — someone backlit by a window —
erases `--fg-3` completely.

**Any text over live video rides a scrim.** Use `--scrim-tile` (bottom-up gradient
at `--scrim-tile-height`) for tile labels and `--scrim-flat` for full overlays.
Label text is `--fg-1` on the scrim, never a muted grey. See
`preview/video-scrim.html`.

### Participant tiles

Speaking is a **white ring** on the tile, not a coloured border. Camera-off shows
**initials on `--bg-3`** — no generated avatar, no illustration. Names truncate
with an ellipsis; they never wrap or resize the tile. See `preview/tile-label.html`.

### The grid backdrop stays off the call

The signature scope grid belongs on Home, the lobby, and empty states. **Never
behind or over live video** — it adds noise over faces and reads as compression
artefacting.

---

## Caveats

- **`ui_kits/` is reference only.** Those files are upstream browser-globals demos: no imports or exports, `React.useState` off a global, and every value inline as a raw literal. They violate this project's own standards on inline styles, raw hex, and arbitrary px. Read them for layout ideas; never copy them into `src/`.
- **`preview/*.html` are the liftable specimens.** They link `colors_and_type.css` and use tokens throughout.
- **Font licence.** IoskeleyMono is not ours to ship. `.gitignore` excludes `context/Design/fonts/` for exactly this reason — do not remove that entry without confirming redistribution rights.
- **ESLint cannot lint CSS.** `_adherence.eslint.mjs` enforces the no-raw-values rule for `.ts`/`.tsx`. `src/app/globals.css` is guarded by review alone.
