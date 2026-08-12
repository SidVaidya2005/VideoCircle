-- Drops "read own participation" as redundant.
--
-- Found by the Supabase performance advisor, which flagged
-- `multiple_permissive_policies`: meeting_participants had two permissive SELECT
-- policies for `authenticated`, and Postgres must evaluate every permissive
-- policy on a table for every candidate row, OR-ing the results.
--
-- The two were not merely overlapping, they were nested. "read own
-- participation" allowed rows where user_id = auth.uid(). Every such row belongs
-- to a meeting in which the caller has a participation row — that is what the
-- row IS — so private.is_meeting_participant(meeting_id) already returns true
-- for all of them. The co-participant policy is a strict superset.
--
-- Keeping both cost a second policy evaluation per row and bought nothing, so
-- the narrower one goes. Reading a co-participant's row is still gated on having
-- been in that meeting; nothing widens.
drop policy "read own participation" on public.meeting_participants;

-- Renamed so the remaining policy describes the whole rule rather than half of it.
alter policy "read co-participants"
  on public.meeting_participants
  rename to "read participation in meetings you joined";
