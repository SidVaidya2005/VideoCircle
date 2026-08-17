# Deployment

VideoCircle deploys to [Render](https://render.com) as a single Next.js web service,
defined by `render.yaml` at the repository root.

This document covers the first deploy, the checks to run before every deploy, and
what can only be verified on a deployed origin. For local setup, see the
[README](../README.md).

## Before every deploy

Render builds whatever is on `main`, and none of these run there. Run all four and
read the output:

```bash
npm run lint && npm run typecheck && npm run test && npm run test:e2e
```

`test:e2e` matters most and is skipped most often. It is the only check that
connects to LiveKit Cloud and Supabase for real, so it is the only one that can
catch a broken call.

### Read a red suite carefully before believing it

Run bare, `test:e2e` starts `next dev`, which starves its own outbound connections
under four parallel workers and invents failures the product does not have. A full
suite once produced 23 handler errors on `next dev` and none at all against a
production build.

Before treating any red as a bug, re-run against a production server:

```bash
npm run build && npm run start -- --port 3100
npx playwright test          # reuses the server already on 3100
```

Note also that `CI=true` sets `retries: 2`, so a CI summary reading "all passed"
can be concealing a first-attempt failure. Read the retry lines, not the total.

## First deploy

### Set every environment variable before the first build

The four `NEXT_PUBLIC_*` values are compiled into the bundle at build time and
parsed by Zod at import, so a missing one fails the build rather than the request —
and fixing one afterwards costs a full redeploy.

### The origin is not predictable

Render appends a random suffix when the subdomain your service name would take is
already claimed. This deployment asked for `videocircle` and got
`videocircle-blw4`.

`videocircle.onrender.com` is a live service belonging to somebody else: it serves
a Create React App bundle from `/static/js/`, answers `/healthz` with an HTML
fallback rather than `{"status":"ok"}`, and pulls its typeface from Google's CDN,
which this project forbids. Do not mistake it for this app, and do not point
anything at it.

**The service name and the origin are different things**, which matters because a
Blueprint sync matches services by `name`. The name is `videocircle` — what was
asked for, and what `render.yaml` declares; `-blw4` is only the hostname's
collision suffix. If the dashboard ever shows a different service _name_, fix
`render.yaml` to match it **before** syncing, or the sync creates a second free
service and the workspace's 750 instance-hours start being shared.

So `NEXT_PUBLIC_SITE_URL` cannot be known until the service exists, and it is the
one variable that must be right at build time. Create the service, read the real
URL from the dashboard, set the variable to it, and redeploy. Getting it wrong is
quiet rather than loud: the app builds and runs, and only share links and the OAuth
redirect point at an origin that is not this one.

### Steps

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

## Verify on the deployed origin

None of this is provable locally.

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

## Cold starts

The free Render instance spins down after 15 minutes without traffic, and the first
request afterwards takes roughly a minute. Render serves its own loading page while
it wakes — that happens before any application code runs, so it cannot be branded or
shortened. This is an accepted hosting cost, not a regression to chase.
