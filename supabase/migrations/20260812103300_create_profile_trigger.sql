-- A profiles row for every new auth user.
--
-- Lives in `private` for the same reason the RLS helper does: security definer
-- functions do not belong in an API-exposed schema. (PostgREST would not expose
-- a function returning `trigger` in any case, but keeping the rule unconditional
-- means nobody has to remember the exception.)
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    -- Google has sent this under different keys over the years, and a display
    -- name is NOT NULL, so fall through rather than fail a sign-up. The exact
    -- payload gets confirmed against a real Google sign-in in feature 04.
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Someone'
    ),
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture'
      ),
      ''
    )
  )
  -- Idempotent: a replayed or duplicated insert must not fail the sign-up.
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function private.handle_new_user() is
  'Mirrors a new auth.users row into public.profiles. Never fails a sign-up.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();
