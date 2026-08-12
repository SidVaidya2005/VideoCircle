-- Row-level security.
--
-- THE RECURSION TRAP: the natural policy — "you may read a participation row if
-- you have a participation row in the same meeting" — is a policy on
-- meeting_participants that queries meeting_participants. Postgres re-applies
-- RLS to that inner query and recurses until it errors. A `security definer`
-- function does not re-enter the policy, which is what breaks the cycle.

-- Security definer helpers must never sit in an API-exposed schema: a function
-- in `public` is callable as RPC by any authenticated user. `private` is not in
-- PostgREST's exposed schemas, so nothing here has an HTTP surface.
create schema if not exists private;

comment on schema private is
  'Internal helpers for RLS policies. Never exposed over the API; nothing here is callable as RPC.';

-- `search_path = ''` (empty, not `public`) forces every relation below to be
-- fully qualified, so this function cannot be tricked into resolving
-- meeting_participants to something an attacker controls.
--
-- The auth.uid() check lives INSIDE the body. A security definer function
-- bypasses RLS on what it touches, so without that check this would answer
-- "is anyone a participant", not "am I".
create or replace function private.is_meeting_participant(target_meeting uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.meeting_participants
    where meeting_id = target_meeting
      and user_id = (select auth.uid())
  );
$$;

comment on function private.is_meeting_participant(uuid) is
  'Does the CALLING user have a participation row in this meeting? Breaks the RLS recursion cycle.';

-- Not callable directly by any client role.
revoke all on function private.is_meeting_participant(uuid) from public;
revoke all on function private.is_meeting_participant(uuid) from anon;
revoke all on function private.is_meeting_participant(uuid) from authenticated;

alter table public.profiles enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;

-- auth.uid() is wrapped in a subselect throughout: bare, it is re-evaluated once
-- per row; wrapped, Postgres evaluates it once for the whole query.

create policy "read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "read own participation"
  on public.meeting_participants
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "read co-participants"
  on public.meeting_participants
  for select
  to authenticated
  using ((select private.is_meeting_participant(meeting_id)));

create policy "read joined meetings"
  on public.meetings
  for select
  to authenticated
  using ((select private.is_meeting_participant(id)));

-- There are no insert, update or delete policies anywhere, and that is not an
-- omission. Every write goes through the service-role client inside a route
-- handler, which bypasses RLS. Guests have no Supabase session and therefore no
-- JWT to write with, so there is no client-side write path to authorize.
--
-- RLS is NOT forced. `force row level security` subjects the table OWNER to its
-- own policies, which would fight migrations; service_role bypasses RLS through
-- its bypassrls attribute either way, so forcing would buy nothing.
