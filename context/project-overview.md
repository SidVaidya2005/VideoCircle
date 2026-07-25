# Project Overview

> **Role:** Product source of truth — what this product is, who it's for, what's in and out of scope.
> **Read first**, before any other context file.
> **Relates to:** scope drives `build-plan.md`; progress tracked in `progress-tracker.md`.

## About the Project

VideoCircle is a browser-based video calling product. Anyone can start a meeting,
get a random share link, and be in a call within seconds — no download, and no
account unless they want one. People who sign in with Google additionally get a
history of the calls they took part in. Every meeting opens into a lobby where you
see your own camera preview and set your mic and camera state before anyone else
sees or hears you, and those controls stay available for the whole call.

Alongside video, audio, and screen sharing, each meeting has a chat panel whose
messages are end-to-end encrypted in the browser. The encryption key lives in the
fragment of the share link, which browsers never transmit to a server, so the
meeting link is both the invitation and the key.

## The Problem It Solves

Joining a video call is usually gated by an account, an app install, or a calendar
invite — friction that has nothing to do with talking to someone. People work
around it by falling back to whatever platform everyone already has an account on,
which means the conversation happens wherever the accounts are, not where it
should. VideoCircle removes the gate: a link is enough to join, an account is only
there for people who want the history, and the chat inside the call is private from
the operator by construction rather than by promise.

## Pages

- **Home (`/`)** — Landing and entry point. Start a new meeting, paste a meeting code to join, or sign in with Google.
- **Lobby (`/room/[code]`, pre-join state)** — Camera self-preview, display-name entry for guests, mic/camera toggles, and device selection before joining.
- **Meeting Room (`/room/[code]`, joined state)** — The live call: video grid, control bar, screen share, participant list, reactions, and the encrypted chat panel.
- **Call History (`/history`)** — Signed-in users only. A reverse-chronological list of meetings they joined, with time, duration, and who else was present.
- **Auth callback (`/auth/callback`)** — Non-visual. Completes the Google OAuth PKCE exchange and redirects onward.

## Navigation

The Home page is the only entry point that isn't a share link. From Home a user
either creates a meeting — which mints a code, generates a chat key, and pushes
them to `/room/[code]#k=…` — or pastes an existing code to reach the same route.
Anyone arriving from a shared link lands directly on `/room/[code]`, bypassing Home
entirely.

`/room/[code]` is one route with two states: the lobby renders until the user
presses Join, at which point the same page connects to LiveKit and renders the
meeting. Leaving a call returns the user to Home. `/history` is reachable from the
header only while signed in; an unauthenticated request to it redirects to Home
with the sign-in prompt open. Signing in never interrupts a call — the auth
callback returns the user to the page they started from.

## Core User Flow

### Starting a meeting

The user presses "New meeting" on Home. The browser generates a random room code
and a fresh 256-bit AES-GCM chat key, then navigates to
`/room/abc-defg-hij#k=<key>`. The server records the meeting row; the key never
leaves the browser because it sits in the URL fragment.

### Sharing the link

From the lobby or the in-call control bar, the user copies the full link —
fragment included — and sends it through whatever channel they like. The link is
the invitation and the chat key together, so anyone holding it can both join and
read chat.

### Entering the lobby

Every participant, invited or host, lands in the lobby first. The browser requests
camera and microphone permission and shows a live self-preview. The user picks
their camera, microphone, and speaker, toggles mic and camera to whatever state
they want to enter with, and — if they're a guest — types a display name. Signed-in
users get their Google name prefilled.

### Joining the call

Pressing Join sends the room code and desired identity to the server, which mints a
short-lived LiveKit access token scoped to that one room. The page connects, applies
the mic/camera state chosen in the lobby, and the participant appears in everyone's
grid.

### In the call

Participants see a responsive tile grid that reflows with headcount, switching to a
spotlight layout when someone shares their screen. The control bar toggles mic,
camera, screen share, chat, participants, and reactions, and always offers a way to
leave. Chat messages are encrypted in the browser before being published over the
LiveKit data channel and decrypted on arrival — the server relays bytes it cannot
read.

### Leaving and reviewing

Leaving disconnects the room and returns the user to Home. LiveKit webhooks tell
the server who joined, who left, and when the room emptied, which is what populates
the history rows. A signed-in user opens `/history` and sees each meeting they were
in, its duration, and the display names of everyone else who was there. No chat
content is stored anywhere.

## Data Architecture

### Identity

Signed-in users come from Supabase Auth via Google OAuth; a `profiles` row mirrors
each auth user and holds their display name and avatar. Guests have **no durable
cross-meeting identity**: they get a fresh participant identity generated at join
time and a display name they type themselves, and nothing links one guest
appearance to another.

That is a narrower promise than "nothing is stored." The participation record for a
guest — display name, the one-off identity, and join/leave timestamps — persists as
long as the meeting does, because it is what puts their name in other participants'
call history. What does not exist is any way to ask "which meetings did this person
attend," since the identity is discarded at the end of the call and never reused.

### Meetings

A meeting is a room code, who created it (null when a guest created it), when it
started, and when it ended. Meetings are created the moment someone presses "New
meeting" and are closed out by a LiveKit webhook when the room empties.

### Participation

Each join produces a participation record tying a meeting to either a user or a
guest, with the display name captured at join time plus join and leave timestamps.
This is the only source of call history: a user's history is the set of meetings
they have a participation record for, and the other names on that meeting are read
from the sibling records.

### Chat

Chat has no server-side data domain by design. Messages exist only as ciphertext in
flight over the LiveKit data channel and as plaintext in the memory of participants
who hold the key. Nothing is written to Postgres, and reloading the page clears the
transcript.

## Features In Scope

- Google sign-in via Supabase Auth, plus fully anonymous guest access
- Randomly generated, unguessable meeting codes and shareable join links
- Pre-join lobby with live self-preview, display-name entry, and mic/camera state selection
- Camera, microphone, and speaker device pickers, usable in the lobby and mid-call
- Multi-party video and audio calls sized for up to ~12 participants
- Responsive tile grid that reflows by participant count
- Spotlight/speaker view that activates on screen share
- Screen sharing on browsers that support `getDisplayMedia`
- In-meeting chat with AES-GCM end-to-end encryption, key carried in the URL fragment
- Participant list panel showing everyone's mic and camera state
- Ephemeral reactions as wide-tracked CAPS chips (the brand forbids emoji) and a raise-hand state, both over the data channel
- Copy-invite-link control in both the lobby and the call
- Call history for signed-in users: meeting, time, duration, and co-participants
- Full mobile web support — responsive layouts and touch-sized controls on iOS Safari and Android Chrome
- Connection-quality indicators and automatic reconnection handling
- Deployment to Render as a single Next.js web service

## Features Out of Scope

- Cloud or local recording, and recording playback
- End-to-end encryption of the video/audio streams themselves (media is DTLS/SRTP encrypted in transit but decryptable at the SFU)
- Virtual backgrounds and background blur
- Breakout rooms
- Live transcription, captions, or translation
- Waiting rooms, host admission, and host moderation controls (mute-others, remove-participant)
- Scheduled meetings, calendar integration, and an upcoming-meetings view
- Persistent personal/vanity rooms
- Native iOS and Android applications
- Dial-in / PSTN telephony
- File sharing, whiteboard, or polls
- Teams, organizations, and per-account billing
- Persisting chat transcripts (structurally impossible under the chosen encryption model, and deliberately so)

## Target User

Someone who needs to talk to a specific person or small group right now and wants
the shortest possible path from "let's hop on a call" to being on the call —
freelancers and clients, study partners, remote teammates, friends and family. Half
of them will never make an account; the other half sign in because they want to
look back at what they were on and with whom. Both halves care that a private
conversation stays private.

## Success Criteria

- A first-time visitor with no account can go from landing on Home to being in a call with a second person in under 30 seconds, using only a copied link.
- Opening a share link in a fresh browser profile reaches the lobby, shows a self-preview, and joins successfully without any sign-in.
- Mic and camera can be toggled in the lobby, the state carries into the call, and both can be toggled again at any point during the call.
- Switching camera or microphone mid-call swaps the published track without dropping the connection.
- A screen share is visible to every other participant and switches the layout to spotlight; on a browser without `getDisplayMedia` the control is absent rather than broken.
- A chat message sent by one participant is readable by every participant who opened the same full link, and a participant who opens `/room/[code]` without the `#k=` fragment is told they cannot read chat instead of seeing garbage or an empty panel.
- Network traffic captured during a chat exchange contains no plaintext message body, and the chat key appears in no request URL, header, or body.
- A signed-in user who joins and leaves a meeting sees that meeting in `/history` with a correct duration and the other participants' names.
- A signed-in user's `/history` never contains a meeting they did not join, verified with a second account.
- Guests appear in the participant list and in others' history by display name, and no query can link one guest's appearances across two meetings.
- A token request for an unknown, ended, or expired code is refused, verified by calling `/api/token` directly with a well-formed code that was never created.
- A meeting created but never joined is closed by the expiry sweep and appears in nobody's history.
- Every page and panel is usable at a 360px viewport width, with no horizontal scroll and all interactive targets at least 44px.
- A four-participant call runs on the deployed Render instance with stable video and audio for ten minutes.
- `npm run build`, `npm run lint`, `npm run test`, and `npm run test:e2e` all pass.
