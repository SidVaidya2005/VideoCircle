# VideoCircle

A browser-based video calling app. Start a meeting, share the link, and anyone with
it is in the call — no account, no install. Sign in with Google if you want your call
history kept.

Video, audio, and screen sharing run over LiveKit. In-meeting chat is end-to-end
encrypted in the browser with AES-GCM, using a key carried in the share link's URL
fragment — which browsers never send to a server. The link is both the invitation
and the key.

## Status

**Not built yet.** The repository currently contains planning documentation only.
`context/progress-tracker.md` is the live status; the build is 0 of 26 features,
starting at Phase 0.

Everything below describes the target, not what runs today.

## Stack

TypeScript · Next.js 16 (App Router) · React 19 · LiveKit Cloud · Supabase (Auth +
Postgres) · Tailwind CSS 4 · shadcn/ui · Vitest · Playwright · deployed on Render.

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

> **Partly working.** The app builds, runs, and is styled; the database, its RLS
> policies and the Supabase clients are in place. There is no sign-in and no call
> yet — Google OAuth arrives in feature 04 and LiveKit in feature 09, so the
> LiveKit variables below are placeholders for now and the two buttons on Home do
> nothing. Live status is `context/progress-tracker.md`.

### Prerequisites

- Node.js 20+
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

### First deploy to Render

1. Create a Render **Web Service** from this repo; `render.yaml` defines the build and start commands.
2. Set every environment variable above in the Render dashboard. Secrets are declared `sync: false` and must be entered by hand.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin.
4. Add `https://<your-app>.onrender.com/auth/callback` to Supabase's allowed redirect URLs **and** to the Google OAuth client's authorized redirect URIs.
5. In the LiveKit Cloud dashboard, point the webhook at `https://<your-app>.onrender.com/api/livekit/webhook`.
6. Verify: sign in, create a meeting, and complete a call across two devices.

## Licence

See `LICENSE`.

The design kit under `context/Design/` is derived from
[Anime.js](https://animejs.com) by Julian Garnier. It includes `IoskeleyMono` font
files that are **reference only and not shipped** — the application loads JetBrains
Mono instead. Confirm redistribution rights before publishing this repository.
