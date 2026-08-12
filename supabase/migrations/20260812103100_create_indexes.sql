-- Indexes.
--
-- `meetings.code` is already indexed by its UNIQUE constraint in the previous
-- migration, so it is deliberately absent here — a second index on the same
-- column would be dead weight on every write.

-- The nightly sweep scans for open meetings past their expiry. Partial, because
-- a closed meeting is never a candidate and there will eventually be far more
-- closed meetings than open ones.
create index meetings_expiry_sweep_idx
  on public.meetings (expires_at)
  where ended_at is null;

-- Foreign-key column with no other index. Without this, deleting a profile has
-- to scan meetings to apply `on delete set null`.
create index meetings_created_by_idx
  on public.meetings (created_by);

-- The history query: a user's meetings, newest first. Covers the user_id foreign
-- key as its leading column, so no separate FK index is needed.
create index meeting_participants_user_history_idx
  on public.meeting_participants (user_id, joined_at desc);

-- Co-participant lookup, and the meeting_id foreign key.
create index meeting_participants_meeting_idx
  on public.meeting_participants (meeting_id);

-- A participant has at most one OPEN row per meeting, so a `participant_left`
-- webhook always resolves to exactly one row. Partial, so a rejoin after a
-- clean leave is still allowed — that is a second row with the first one closed.
create unique index meeting_participants_open_row_idx
  on public.meeting_participants (meeting_id, identity)
  where left_at is null;
