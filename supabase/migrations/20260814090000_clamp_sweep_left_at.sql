-- Clamp the expiry sweep's left_at so it cannot violate the row's own CHECK.
--
-- THE BUG. The sweep closed open participation rows with `left_at = m.expires_at`,
-- which assumes nobody joined after expiry. They can: /api/token only requires
-- `now() < expires_at` at the moment it MINTS, and the token then lives for up to an
-- hour. A token minted a second before expiry produces a join a few seconds after
-- it, and `meeting_participants_left_after_joined` rejects `left_at < joined_at`.
--
-- WHY IT MATTERS MORE THAN IT LOOKS. The failure is not scoped to the offending row.
-- Both statements run inside one plpgsql function, so the CHECK violation aborts the
-- whole call and NOTHING is swept that night — one late joiner in one meeting stops
-- the backstop for every meeting, silently, until someone reads the cron logs.
--
-- Unreachable until feature 20, because until then no participation row existed to
-- violate anything. Verified by reproducing it against the live schema first:
-- `23514 meeting_participants_left_after_joined`, raised from the update below.
--
-- THE FIX. `greatest(p.joined_at, m.expires_at)` records a zero-length participation
-- for the late joiner rather than a negative one. That is the honest answer: the
-- sweep is a backstop reconciling rows whose real leave time was never delivered, so
-- it never knew the true duration — and an unknown duration should read as nothing,
-- not as a constraint violation. The normal path, `room_finished`, is unaffected.
create or replace function private.sweep_expired_meetings()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  grace constant interval := interval '2 hours';
begin
  -- Participation rows first, while ended_at is still null on the parent — the
  -- second statement is what makes these meetings stop matching.
  update public.meeting_participants p
  set left_at = greatest(p.joined_at, m.expires_at)
  from public.meetings m
  where p.meeting_id = m.id
    and p.left_at is null
    and m.ended_at is null
    and m.expires_at < now() - grace;

  update public.meetings m
  set ended_at = m.expires_at
  where m.ended_at is null
    and m.expires_at < now() - grace;
end;
$$;

comment on function private.sweep_expired_meetings() is
  'Backstop for a dropped room_finished. Closes meetings more than 2h past expiry, and any participation rows still open on them, clamping left_at to joined_at for anyone who joined after expiry.';
