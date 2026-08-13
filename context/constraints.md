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
- **A free Supabase project pauses after ~7 days idle, and `pg_cron` does not run while paused.** The expiry sweep is a backstop, not the primary path — `room_finished` is — so this degrades rather than breaks: a meeting stays open until the next request wakes the project and the following night's sweep runs. Do not add a pinger to work around it, for the same reason as below. (F03)
- **Do not add a keep-alive pinger.** One always-on free service consumes about 730 of the 750 free instance hours per month, and exceeding that suspends every free service in the workspace. The margin is too thin to be worth the ~60s it saves. (F25)

## Data and RLS

- **A `security definer` helper used inside an RLS policy must keep `EXECUTE` for `authenticated`.** Postgres evaluates a policy expression as the calling user, so revoking it makes every read fail with `42501: permission denied for function`. The common advice to revoke applies to helpers called from application code, not from a policy. Isolation comes from the `private` schema — which PostgREST does not expose — not from the grant. Verified by hitting the error. (F03)
- **`private` is the home for every `security definer` function**, with `set search_path = ''` and fully-qualified relations. A function in `public` is callable as RPC by any authenticated user. (F03)
- **One permissive policy per table per action, where possible.** Postgres evaluates every permissive policy against every candidate row and ORs the results. `meeting_participants` originally had a "read own" policy that was a strict subset of the co-participant one; the advisor flagged it as `multiple_permissive_policies` and it was dropped. (F03)
- **The expiry sweep waits 2 hours past `expires_at`.** Long enough that no call is plausibly still draining, short enough to still be a nightly backstop. It closes open participation rows, which a sweep without a grace period could not do safely. (F03)
- **`meetings.code` is CHECK-constrained to the room-code alphabet**, which excludes `i`, `l`, `0` and `1`. `abc-defg-hij` — used as the example code in the docs until F03 — is *invalid* and the database rejects it. Use `abc-defg-hjk`. (F03)

## Auth and secrets

- **Secrets are parsed per service, never in one shared schema.** Each env module parses at import so a misconfigured deploy fails at boot, which means a single schema makes every consumer fail on every *other* service's missing credential. `/api/meetings` could not build at all while the LiveKit keys were blank; in production the same coupling would take meeting creation down during a LiveKit key rotation. LiveKit's own module arrives with its first consumer in F09. (F06)
- **A display name comes from `profiles`, never `user_metadata`.** Supabase's `raw_user_meta_data` is user-editable and surfaces in `auth.jwt()`, so it is unsafe for any authorization decision — and using it for a name would put a second derivation beside the `auth.users` trigger's, free to drift from what call history shows. (F04)
- **`/auth/signout` is POST-only, answered with 303.** A GET signout is fetched by `next/link` prefetch, by speculative loading, and by any third-party `<img>` — all of which would end a session with no user action. 307 would preserve the method and re-issue it as `POST /`. (F04)
- **Auth redirects resolve against `NEXT_PUBLIC_SITE_URL`, never `request.url`.** Render terminates TLS at a proxy, so the request's own origin is not reliably the public one, and `X-Forwarded-Host` is caller-controlled. It also means exactly one redirect URL to allow-list in the Supabase dashboard. (F04)
- **The callback's `next` is origin-compared, never prefix-matched.** `//evil.com` and `/\evil.com` both start with `/` and both resolve off-origin — WHATWG URL treats `\` as `/` in special schemes. See `safeNext`. (F04)
- **The session is read server-side in `(shell)/layout.tsx`**, which makes the shell routes dynamic. The header stays auth-ignorant, taking a rendered node as its `actions` prop. (F04)

## Encryption

- **A fragment is never case-normalised.** The chat key is base64url and case-sensitive, so any code that lowercases a string must split the fragment off first — see `parseRoomCodeInput`, which normalises the room code and leaves the fragment untouched. The failure is silent: the call still connects and only chat is unreadable. (F05)
- **The room code is generated server-side only.** The collision path regenerates in the route handler, so a client navigating to the code *it* sent would land in a room it does not own — a bug visible only on a collision, which at 50 bits means never in testing and eventually in production. (F06)
- **Keys imported from a link are non-extractable.** Only the key generated in-browser is extractable, and only long enough to put it in the URL. (F06)

## Design system

- **shadcn primitives arrive per feature, never up front.** Each one is restyled to the kit on arrival, so generating a set "to have them" creates unreviewed components carrying the six things the kit forbids. (F02)
- **`src/components/ui/button.tsx` is restyled and a plain `shadcn add button` will revert it.** The generated source ships six things this project forbids: `dark:` variants, `shadow-xs` on `outline`, `rounded-md` (0.4rem is the button radius), `font-medium` (only 400 and 700 are loaded, so 500 synthesizes), `ring-[3px]` (an arbitrary value), and 36px hit areas. The `xs` and `icon-xs` sizes were removed outright — at 24px they cannot clear the 44px floor. Re-apply all of this after any regeneration. (F02)
- **Home may loop animation; the call may not.** Home is not encoding video, so continuous CSS keyframes are fine there, and `animejs` is unnecessary — the kit's own site components use `@keyframes` plus staggered `animation-delay`. Every loop must still collapse under `prefers-reduced-motion`, which the block in `globals.css` handles by forcing `animation-iteration-count: 1`. (F02)
- **Section containers are `max-w-5xl`, prose is capped at `max-w-2xl`.** Header and footer match the sections so everything aligns on one measure. The line-length rule governs text, not card grids. (F02)

- **`@import 'tailwindcss'` must stay above `:root` in `globals.css`.** Five kit token families collide with Tailwind's own theme namespaces (`--radius-*`, `--text-*`, `--leading-*`, `--tracking-*`, `--ease-*`), and Tailwind emits a self-referential `--radius-lg: var(--radius-lg)` for each. They resolve only because `:root` cascades after. Asserted by `_verify.mjs` so the ordering cannot be lost silently. (F02)
- **The wordmark's red square sits at `top: 0.234em`, not the `0.30em` in `preview/logo.html`.** That specimen was authored against IoskeleyMono; we ship JetBrains Mono, where 0.30em lands exactly on the x-height and collides with the glyph. Derived from the shipped face's metrics — see the comment in `globals.css`. Any specimen value tied to glyph metrics needs the same treatment. (F02)
- **The wordmark carries `role="img"` and `aria-label="videocircle"`.** Without it the accessible name is computed from the split markup — `inline-flex` makes the inner span a flex item, inserting word boundaries — and U+0131 is announced as its own character. (F02)

## Tooling

- **TypeScript is pinned to 6.x, not 7, and this is not a preference.** `eslint-config-next` depends on `typescript-eslint`, which carries a runtime guard that throws `typescript-eslint does not support TS 7.0` and aborts ESLint entirely — the crash is inside `eslint-config-next`'s own entry point, so the whole config dies, not just the typed rules. Verified: npm `overrides` silences the peer warning but not the guard; the official `@typescript/typescript6` side-by-side shim makes ESLint work but makes `next build` fail to detect TypeScript at all; and npm will not nest a TS 6 copy under `typescript-eslint` because `typescript` is a peer dependency. `next build` itself is happy on either version. Revisit when [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) ships — it is blocked on ESLint gaining async parser support, so expect a long wait. (F01)
- **ESLint is pinned to 9.x, not 10.** `eslint-plugin-react`, vendored inside `eslint-config-next`, calls the pre-10 rule context API and dies with `contextOrFilename.getFilename is not a function` on ESLint 10. Independent of the TypeScript pin above. (F01)
- **The Playwright web server runs on port 3100, not 3000.** With `reuseExistingServer`, anything already holding the dev port gets reused — a leftover `next start`, or an editor's port-forwarding helper — and the suite then tests something other than what it built. That happened once and turned five unrelated specs red. Do not move it back. (F02)
- **The environment must stay split across `env.ts` (public) and `env.server.ts` (secrets), and merging them breaks the browser build.** Next replaces non-public `process.env` reads with `undefined` client-side, so one schema covering both throws the moment any Client Component imports it — including `src/lib/supabase/client.ts`. Mechanism and the variable table live in `code-standards.md` → Environment Variables. (F01)
- **`_verify.mjs` runs inside `npm run lint`**, wired in at feature 01 rather than 02 — it already passed then, so context-drift guarding has been on since the first commit. Anything that breaks the token mirror or the context-doc shape fails `lint`, not review. (F01)
- **`turbopack.root` is pinned in `next.config.ts`.** Turbopack otherwise walks up looking for a lockfile and can settle on a directory above the repository, changing what it resolves. (F01)
- **`z.url()` alone is not a URL check worth trusting.** It accepts `localhost:3000`, parsing it as a URL whose scheme is `localhost`. Any environment URL that must be reachable over a specific scheme carries the `protocol` option — see `library-docs.md` → Zod 4. (F01)
