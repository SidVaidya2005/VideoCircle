-- Core schema: profiles, meetings, meeting_participants.
--
-- See context/architecture.md → Data Model for what each column is for. Notes
-- here cover only what the SQL cannot say for itself.

-- ---------------------------------------------------------------------------
-- profiles — mirrors auth.users, populated by a trigger (see the trigger
-- migration). Not user-editable: profile editing is out of scope, which is why
-- there is no update policy anywhere in this schema.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Mirror of auth.users for signed-in users. Written once by a trigger; never edited.';

-- ---------------------------------------------------------------------------
-- meetings — a room code, who made it, and when it opened, expires and closed.
-- ---------------------------------------------------------------------------
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  -- Null means a guest created it. `on delete set null` keeps the meeting (and
  -- everyone else's history of it) alive when its creator deletes their account.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  ended_at timestamptz,

  -- The same shape ROOM_CODE_PATTERN enforces in src/lib/room-code.ts. Duplicated
  -- deliberately: the application check is for the user, this one is for the
  -- database, and neither should trust the other.
  constraint meetings_code_shape check (
    code ~ '^[a-hj-km-z2-9]{3}-[a-hj-km-z2-9]{4}-[a-hj-km-z2-9]{3}$'
  ),
  constraint meetings_expires_after_creation check (expires_at > created_at),
  constraint meetings_ended_after_creation check (ended_at is null or ended_at >= created_at)
);

comment on column public.meetings.expires_at is
  'After this, /api/token refuses to mint. A call already connected is allowed to drain.';

-- ---------------------------------------------------------------------------
-- meeting_participants — one row per join. A rejoin produces a second row.
-- This is the only source of call history.
-- ---------------------------------------------------------------------------
create table public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  -- Null for guests. A guest identity is single-use, so nothing links one guest
  -- appearance to another.
  user_id uuid references public.profiles (id) on delete cascade,
  -- The LiveKit participant identity. How the webhook matches a leave to a join.
  identity text not null,
  -- Snapshot at join time, not a live lookup: history should show the name the
  -- person used in that meeting.
  display_name text not null,
  -- Generated, never written by application code, so it cannot drift from user_id.
  is_guest boolean generated always as (user_id is null) stored,
  joined_at timestamptz not null default now(),
  left_at timestamptz,

  constraint meeting_participants_left_after_joined check (
    left_at is null or left_at >= joined_at
  )
);

comment on column public.meeting_participants.is_guest is
  'Generated from user_id. Never include this column in an insert or update.';
