-- The nightly expiry sweep.
--
-- This is a BACKSTOP, not a reaper. The normal path is the LiveKit
-- `room_finished` webhook setting ended_at when the room empties. The sweep
-- exists for two cases the webhook cannot cover:
--
--   1. A meeting created and never joined — pressing "New meeting" and closing
--      the tab produces exactly that, and no room is ever created to finish.
--   2. A dropped `room_finished` delivery.
--
-- THE GRACE PERIOD. Case 2 usually means `participant_left` was dropped too, so
-- a sweep that skipped meetings with open participation rows would never fix the
-- case it exists for. But closing a meeting people are still sitting in would
-- write a left_at for participants who have not left — and expiry deliberately
-- lets a connected call drain rather than cutting it off. Two hours past a
-- 24-hour expiry resolves both: a call genuinely still running then is
-- implausible, and anything older is stale bookkeeping rather than a live room.
create extension if not exists pg_cron;

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
  set left_at = m.expires_at
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
  'Backstop for a dropped room_finished. Closes meetings more than 2h past expiry, and any participation rows still open on them.';

-- 03:17 UTC daily. An odd minute rather than the hour, so it does not contend
-- with everything else on the internet that runs at :00.
select
  cron.schedule(
    'sweep-expired-meetings',
    '17 3 * * *',
    $$select private.sweep_expired_meetings()$$
  );
