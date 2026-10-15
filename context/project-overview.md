# Project Overview

> **Role:** The source of truth for what the product is, who it is for, and what is in and out of scope.
> Read this before any other context file.
> **Relates to:** `build-plan.md` follows this scope; `progress-tracker.md` records progress.

## About the Project

VideoCircle is a video calling product that runs in a browser. Anyone can start a
meeting, get a random share link, and send it to someone who joins by opening it.
There is no download, installation, or meeting ID to type, and an account is
optional. People who sign in with Google also get a history of their calls.

Every meeting starts in a lobby. Participants see their own camera preview and
choose whether their microphone and camera are on before anyone else sees or
hears them. Those controls remain available throughout the call.

Meetings support video, audio, screen sharing, and a chat panel. Chat messages are
end-to-end encrypted in the browser. The encryption key is in the share link's
fragment, the part after `#`, which browsers never send to a server. The meeting
link therefore provides both the invitation and the chat key.

## The Problem It Solves

Joining a video call often requires an account, an app installation, or a calendar
invite. These steps get in the way of talking to someone. People work around them
by choosing whichever platform everyone already has an account on.

With VideoCircle, a link is enough to join. An account is only needed for people
who want call history. The chat is designed so the operator cannot read it;
privacy does not depend on the operator promising not to look.

## Pages

| Page | Route or state | What it does |
| --- | --- | --- |
| Home | `/` | Start a meeting, paste a meeting code to join, or sign in with Google. |
| Lobby | `/room/[code]`, before joining | Show a camera self-preview, let guests enter a display name, and provide mic/camera toggles and device selection. |
| Meeting Room | `/room/[code]`, after joining | Show the live video grid, control bar, screen sharing, participant list, reactions, and encrypted chat panel. |
| Call History | `/history` | Show signed-in users their meetings, newest first, with time, duration, and co-participants. |
| Auth callback | `/auth/callback` | Complete the Google sign-in exchange (OAuth PKCE) and redirect onward. This route has no visual page. |

## Navigation

Users enter through Home or a shared meeting link. From Home they can create a
meeting, which generates a code and a chat key and opens `/room/[code]#k=…`. They
can also paste an existing code to reach the same route. A shared link opens
`/room/[code]` directly, without visiting Home.

`/room/[code]` has two states. It shows the lobby until the user presses Join.
The same page then connects to LiveKit, the call service, and shows the meeting. Leaving a call
returns the user to Home.

Signed-in users can open `/history` from the account menu. Requests from users who
are not signed in redirect to Home. Signing in never interrupts a call: the auth
callback returns the user to the page where they started.

## Core User Flow

### Starting a meeting

1. The user presses "New meeting" on Home.
2. The browser generates a random room code and a fresh 256-bit AES-GCM chat key.
3. The browser opens `/room/abc-defg-hjk#k=<key>`.
4. The server records the meeting row. The key stays in the browser because it is in the URL fragment.

### Sharing the link

The user copies the full link, including its fragment, from the lobby or the
in-call control bar. They can send it through any channel they choose. Anyone
holding that link can join the meeting and read its chat.

### Entering the lobby

Every participant starts in the lobby, including the host.

1. The browser asks for camera and microphone permission and shows a live self-preview.
2. The user picks a camera, microphone, and speaker, and chooses whether their mic and camera will be on when they join.
3. Guests type a display name. Signed-in users have their Google name filled in.

### Joining the call

1. Pressing Join sends the room code and desired identity to the server.
2. The server creates a short-lived LiveKit access token that grants access to that room only.
3. The page connects and applies the mic/camera settings chosen in the lobby.
4. The participant appears in everyone's grid.

### In the call

Participants see a responsive video grid that adjusts to the number of people.
When someone shares their screen, the layout switches to spotlight view.

The control bar provides mic, camera, screen share, chat, participant, and reaction
controls, plus a way to leave at any time.

The browser encrypts each chat message before sending it over the LiveKit data
channel. Receiving browsers decrypt it on arrival. The server relays encrypted
bytes that it cannot read.

### Leaving and reviewing

Leaving disconnects the room and returns the user to Home. LiveKit webhooks notify
the server when participants join or leave and when the room empties. Those events
populate call history.

Signed-in users can open `/history` to see their meetings, durations, and the
display names of everyone else who attended. Chat content is never stored.

## Data Architecture

### Identity

Signed-in users authenticate through Supabase Auth using Google OAuth. Each auth
user has a matching `profiles` row with their display name and avatar.

Guests have no persistent identity that links them across meetings. Each join
creates a fresh participant identity that is never reused. Guests supply their
own display name.

This does not mean that no guest data is stored. A guest's participation record
keeps their display name, one-off identity, and join/leave timestamps for as long
as the meeting exists. These records let other participants see the guest's name
in call history. The identity string persists in that row but links to nothing
else. Two appearances by the same guest share no identifier, so the records
cannot answer "which meetings did this person attend?"

### Meetings

A meeting records its room code, creator, start time, and end time. The creator is
null when a guest created it.

The meeting is created as soon as someone presses "New meeting". Its link stays
joinable for 24 hours, even if everyone leaves and later returns. An empty room
does not end the meeting. A nightly sweep closes the meeting after that period.

### Participation

Each join creates a participation record for a meeting and either a signed-in user
or a guest. It captures their display name at join time, along with join and leave
timestamps.

These records are the only source of call history. A user's history contains the
meetings for which they have a participation record. Other participants' names
come from the other records for that meeting.

### Chat

Chat deliberately has no server-side data model. Messages exist as ciphertext
(encrypted data) while travelling over the LiveKit data channel, and as plaintext
(readable text) in the memory of participants who hold the key. Nothing is written
to Postgres. Reloading the page clears the transcript.

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

VideoCircle is for people who need to talk to a specific person or small group
right now: freelancers and clients, study partners, remote teammates, friends,
and family. They want as few steps as possible between "let's hop on a call" and
being in the call.

Half will never make an account. The other half sign in to look back at their calls
and who attended. Both groups care that private conversations stay private.

## Success Criteria

### Joining and timing

- A first-time visitor with no account can join by opening a link. There is no download, installation, extension, meeting ID to type, or sign-up. Avoiding those extra steps is the product claim on every hosting tier; it is not a promise about total elapsed time.
- On a warm instance (one that is already running), the application takes under 10 seconds from navigation start to LiveKit reporting connected. This excludes time spent on the browser's camera and microphone permission prompt and on typing a display name. Those depend on the person, not the app.
- On a cold instance, the free Render service adds roughly a minute before the application can begin because it shuts down after 15 minutes idle. This accepted hosting cost is recorded in `constraints.md` → Hosting and must be disclosed wherever a link is shared. Do not treat it as an application regression.

### Features and verification
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

---

## Reading this folder

`context/` explains the product, how it is built, why it is built that way, and
the rules every change follows. It must make sense without access to `src/`.

| To find out | Read |
| ----------- | ---- |
| What it is, who it's for, what's out of scope | this file |
| Stack, folder layout, data model, boundaries, **invariants** | `architecture.md` |
| The rules every change must follow | `code-standards.md` |
| How to use a specific library here | `library-docs.md` — that library's section |
| What gets built, in what order | `build-plan.md` |
| What is done and what is next | `progress-tracker.md` |
| Decisions that still bind | `constraints.md` |
| How the build got here, feature by feature | `build-journal.md` |
| The visual language | `Design/README.md` |

Instructions for cloning the repository, obtaining LiveKit and Supabase
credentials, and running the app locally live in the repository `README.md`.
Keeping them in one place avoids conflicting instructions for newcomers.

