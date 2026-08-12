# Standing Constraints

> **Role:** What still binds — the decisions and non-obvious facts that constrain future work, grouped by topic.
> **Read before any decision that might conflict with past work.**
> **Relates to:** receives decisions displaced from `progress-tracker.md` and decisions promoted out of `build-journal.md` at phase checkpoints.

## How this file is maintained

Keep this file **small**. It is the one record read on demand during ordinary
work, so every line costs on every session that opens it. The chronological
record of how the build got here lives in `build-journal.md`; this file holds
only what is still true.

- **Grouped by topic** (auth, data, payments…), never by date. Add a `##` topic heading when a new one is needed.
- **Holds only what still binds:** decisions that constrain future work, and notes explaining why something non-obvious is the way it is. Never a narrative of what happened — that is the journal's job.
- **Planning-time constraints may be written directly**, before any feature exists, and are labelled as such under their topic. Everything after the build starts arrives by one of the two routes below.
- **Two things feed it,** and both are moves, never copies: the oldest bullet of `progress-tracker.md` → Key Decisions when that section would exceed 10, and each phase's still-binding decisions promoted out of `build-journal.md` at the phase checkpoint.
- **Cite the feature each bullet came from,** e.g. `(F02)`.
- **Deduped on write.** If a new constraint supersedes one already here, replace that bullet in place rather than adding a second bullet on the same topic.
- **Never pruned by age.** Remove a constraint only when it is verifiably dead — reversed by a later decision, or the thing it describes no longer exists. `git` history holds anything removed.

<!-- Filed by topic, newest bullet first within each topic:

## {{TOPIC}}
- {{CONSTRAINT}} ({{FEATURE_REF}})

-->

## Hosting

*Adopted before the build started, during planning — not promoted from a completed
feature. The feature refs below point at where each one will be applied.*

- **Render's free tier is a deliberate choice, and it spins down.** A free web service sleeps after 15 minutes without inbound traffic, and the next request takes roughly a minute to wake it — Render serves its own loading page during that window, before any of our code runs, so it cannot be branded, shortened, or replaced. Accepted to keep the project free to run. (F25)
- **Design for the cold click.** The person who feels this is never the meeting's creator — they have just used the app, so it is warm. It is whoever opens a shared link after an idle spell, and anyone opening the portfolio demo link cold. Surfaces that hand out a link say so plainly; the README says so above the demo link. Never promise instant join in copy. (F06, F25)
- **Do not add a keep-alive pinger.** One always-on free service consumes about 730 of the 750 free instance hours per month, and exceeding that suspends every free service in the workspace. The margin is too thin to be worth the ~60s it saves. (F25)

## Design system

- **`@import 'tailwindcss'` must stay above `:root` in `globals.css`.** Five kit token families collide with Tailwind's own theme namespaces (`--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--ease-*`), and Tailwind emits a self-referential `--radius-lg: var(--radius-lg)` for each. They resolve only because `:root` cascades after. Asserted by `_verify.mjs` so the ordering cannot be lost silently. (F02)
- **The wordmark's red square sits at `top: 0.234em`, not the `0.30em` in `preview/logo.html`.** That specimen was authored against IoskeleyMono; we ship JetBrains Mono, where 0.30em lands exactly on the x-height and collides with the glyph. Derived from the shipped face's metrics — see the comment in `globals.css`. Any specimen value tied to glyph metrics needs the same treatment. (F02)
- **The wordmark carries `role="img"` and `aria-label="videocircle"`.** Without it the accessible name is computed from the split markup — `inline-flex` makes the inner span a flex item, inserting word boundaries — and U+0131 is announced as its own character. (F02)

## Tooling

- **TypeScript is pinned to 6.x, not 7, and this is not a preference.** `eslint-config-next` depends on `typescript-eslint`, which carries a runtime guard that throws `typescript-eslint does not support TS 7.0` and aborts ESLint entirely — the crash is inside `eslint-config-next`'s own entry point, so the whole config dies, not just the typed rules. Verified: npm `overrides` silences the peer warning but not the guard; the official `@typescript/typescript6` side-by-side shim makes ESLint work but makes `next build` fail to detect TypeScript at all; and npm will not nest a TS 6 copy under `typescript-eslint` because `typescript` is a peer dependency. `next build` itself is happy on either version. Revisit when [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) ships — it is blocked on ESLint gaining async parser support, so expect a long wait. (F01)
- **ESLint is pinned to 9.x, not 10.** `eslint-plugin-react`, vendored inside `eslint-config-next`, calls the pre-10 rule context API and dies with `contextOrFilename.getFilename is not a function` on ESLint 10. Independent of the TypeScript pin above. (F01)
- **`z.url()` alone is not a URL check worth trusting.** It accepts `localhost:3000`, parsing it as a URL whose scheme is `localhost`. Any environment URL that must be reachable over a specific scheme carries the `protocol` option — see `library-docs.md` → Zod 4. (F01)
