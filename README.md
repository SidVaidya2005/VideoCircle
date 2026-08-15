# VideoCircle

A browser-based video calling app. Start a meeting, share the link, and anyone with
it is in the call — no account, no install. Sign in with Google if you want your call
history kept.

Video, audio, and screen sharing run over LiveKit. In-meeting chat is end-to-end
encrypted in the browser with AES-GCM, using a key carried in the share link's URL
fragment — which browsers never send to a server. The link is both the invitation
and the key.

## Demo

**[videocircle-blw4.onrender.com](https://videocircle-blw4.onrender.com)**

> **The first visit takes about a minute.** It runs on a Render free instance,
> which spins down after 15 minutes without traffic. Render serves its own loading
> page while it wakes — that happens before any of this code runs, so it cannot be
> branded or shortened. Once awake it is quick. Nothing is wrong; it is the cost of
> running for free.

## Status

**Phases 0–6 complete: 24 of 26 features.** Sign-in, the lobby, calls, screen
sharing, encrypted chat, and call history all work. What remains is Phase 7 —
deployment (feature 25) and the end-to-end suite (feature 26).

`context/progress-tracker.md` is the live status and is more current than this
section by construction.

## Stack

TypeScript · Next.js 16 (App Router) · React 19 · LiveKit Cloud · Supabase (Auth +
Postgres) · Tailwind CSS 4 · shadcn/ui · Vitest · Playwright · deploys to Render.

## Documentation

`context/` is the source of truth, and `CLAUDE.md` is the entry point for AI agents
working in this repo.

| File                          | Contents                                                |
| ----------------------------- | ------------------------------------------------------- |
| `context/project-overview.md` | What the product is, scope in and out, success criteria |
| `context/architecture.md`     | Stack, structure, data model, and the invariants        |
| `context/code-standards.md`   | Rules every change follows                              |
| `context/library-docs.md`     | Per-library usage patterns                              |
| `context/build-plan.md`       | 8 phases, 26 ordered features                           |
| `context/progress-tracker.md` | Live build status                                       |
| `context/build-journal.md`    | Decisions and gotchas, per feature                      |
| `context/Design/`             | The Anime.js brand kit this project is designed against |

## Running it

Everything below works locally: sign in with Google, start a meeting, share the
link, join from a second browser context, share a screen, and chat end-to-end
encrypted. All seven environment variables are real requirements now — none is a
placeholder.

### Prerequisites

- Node.js 20.9+ (pinned as `engines.node`; Render builds on 22)
- A [LiveKit Cloud](https://cloud.livekit.io) project (API key, secret, and `wss://` URL)
- A [Supabase](https://supabase.com) project with the Google OAuth provider enabled
- A Google Cloud OAuth 2.0 client, with Supabase's callback URL registered

### Environment

Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.

| Variable                        | Secret? | Notes                                           |
| ------------------------------- | ------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | No      | Origin used for OAuth redirects and share links |
| `NEXT_PUBLIC_SUPABASE_URL`      | No      |                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No      |                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Yes** | Bypasses RLS — server only                      |
| `NEXT_PUBLIC_LIVEKIT_URL`       | No      | The `wss://` SFU URL                            |
| `LIVEKIT_API_KEY`               | **Yes** |                                                 |
| `LIVEKIT_API_SECRET`            | **Yes** | Also verifies webhook signatures                |

### Local development

```bash
npm install
npx supabase link --project-ref <your-project-ref>   # prompts for the DB password
npx supabase db push                                 # apply migrations
npm run dev                                          # http://localhost:3000
```

`db push` needs the project linked first; the link prompts for your database
password, which is why it is a step you run rather than one a script runs for you.

`localhost` counts as a secure context, so the Web Crypto APIs behind encrypted chat
work in development without HTTPS.

### Testing

```bash
npx playwright install chromium   # once per machine
npm run test       # Vitest — crypto, room codes, formatting
npm run test:e2e   # Playwright — lobby, join, two-party chat
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint, then the design-system and context-drift checks
```

The end-to-end server runs on port 3100, not 3000, so a dev server you already
have open is never reused by mistake.

Playwright launches Chromium with fake media devices, so call flows run without a
real camera.

### Before every deploy

Run all four and read the output — Render builds whatever is on `main`, and none
of these run there:

```bash
npm run lint && npm run typecheck && npm run test && npm run test:e2e
```

`test:e2e` is the one that matters most and the one most often skipped: it is the
only check that connects to LiveKit Cloud and Supabase for real, so it is the only
one that can catch a broken call.

**Read a red suite carefully before believing it.** Run bare, it starts `next dev`,
which starves its own outbound connections under four parallel workers and invents
failures the product does not have — a full suite once produced 23 handler errors
on `next dev` and none at all against a production build. Before treating any red
as a bug, re-run it against `npm run build && npm run start -- --port 3100` with
the suite pointed at that server. And note `CI=true` sets `retries: 2`, so a CI
summary reading "all passed" can be concealing a first-attempt failure; read the
retry lines, not the total.

### First deploy to Render

Order matters in one place: **every environment variable must be set before the
first build, not after it.** The four `NEXT_PUBLIC_*` values are compiled into the
bundle at build time and parsed by Zod at import, so a missing one fails the build
rather than the request — and fixing one afterwards costs a full redeploy.

**The origin is not predictable, and the reason is now confirmed rather than
assumed.** Render appends a random suffix when the subdomain your service name
would take is already claimed — this deployment asked for `videocircle` and got
`videocircle-blw4`. `videocircle.onrender.com` is a live service belonging to
somebody else: it serves a Create React App bundle from `/static/js/`, answers
`/healthz` with an HTML fallback rather than `{"status":"ok"}`, and pulls its
typeface from Google's CDN, which this project forbids. Do not mistake it for
this app, and do not point anything at it.

**The service name and the origin are different things**, which matters because a
Blueprint sync matches services by `name`. The name is `videocircle` — what was
asked for, and what `render.yaml` declares; `-blw4` is only the hostname's
collision suffix. If the dashboard ever shows a different service _name_, fix
`render.yaml` to match it **before** syncing, or the sync creates a second free
service and the workspace's 750 instance-hours start being shared.

So you cannot know
`NEXT_PUBLIC_SITE_URL` until the service exists, and it is the one variable that
must be right at build time. Create the service, read the real URL from the
dashboard, set `NEXT_PUBLIC_SITE_URL` to it, and redeploy. Getting it wrong is
quiet rather than loud: the app builds and runs, and only share links and the
OAuth redirect point at an origin that is not this one.

1. Create a Render **Blueprint** from this repo, so `render.yaml` is what deploys.
   A Web Service created by hand in the dashboard ignores that file.
2. Set all seven environment variables in the Render dashboard. Every one is
   declared `sync: false`, so none is committed and all must be entered by hand.
   Set `NEXT_PUBLIC_SITE_URL` to `https://<name>.onrender.com` now, before the
   first build.
3. Deploy, and confirm `https://<name>.onrender.com/healthz` returns
   `{"status":"ok"}`.
4. Add `https://<name>.onrender.com/auth/callback` to Supabase's allowed redirect
   URLs **and** to the Google OAuth client's authorized redirect URIs.
5. In the Supabase dashboard, **disable the email/password provider** under
   Authentication → Providers if it is enabled. Google is the only intended
   sign-in method, and nothing in the code enforces that — an enabled email
   provider is a live account-creation surface reachable straight from the Auth
   API, outside every route handler here.
6. In the LiveKit Cloud dashboard, point the webhook at
   `https://<name>.onrender.com/api/livekit/webhook`. Until this is done, call
   history records nothing: LiveKit cannot reach `localhost`, so the participation
   handler has only ever been exercised against payloads the test suite signs
   itself.
7. Paste the URL into the Demo section at the top of this file.

**Then verify on the deployed origin**, because none of this is provable locally:

- Sign in with Google, create a meeting, and complete a call across two real devices.
- Check `/history` shows that meeting with the right duration and the other participant.
- Open a share link on a real iPhone and a real Android phone, and join from each.
- Confirm audio starts after the Join gesture on iOS Safari.
- Confirm the device pickers show real labels once permission is granted.
- Confirm the safe-area insets render correctly on a notched phone — `viewport-fit=cover`
  and the `.call-surface` / `.sheet-surface` padding are a no-op on every desktop
  browser, so nothing has confirmed them.
- Share a desktop screen and confirm a phone receives it.
- Run Lighthouse on mobile throttling, and hold a four-participant call for ten minutes.

## Licence

See `LICENSE`.

The design kit under `context/Design/` is derived from
[Anime.js](https://animejs.com) by Julian Garnier. It includes `IoskeleyMono` font
files that are **reference only and not shipped** — the application loads JetBrains
Mono instead. Confirm redistribution rights before publishing this repository.
