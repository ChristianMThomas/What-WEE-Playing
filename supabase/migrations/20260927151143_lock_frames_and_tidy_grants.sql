-- Findings from the 2026-09-27 security audit.
--
-- 1. Rolls are write-once. The update grant covered every roll and
--    validate_frame only looked at the edited frame and the one before it, so
--    a player could rewrite or blank a finished frame mid-game (and blanking
--    one made finish_game fail for the whole lobby). An update may now only
--    fill in the next empty roll, and a roll can't be written past a gap.
-- 2. lobby_members: clients could set joined_at. Inserts are now limited to
--    the two key columns, like the other tables' column grants.
-- 3. Leftover grants that nothing could use but shouldn't exist: writes on the
--    leaderboard view, and TRUNCATE on the tables.

create or replace function public.validate_frame()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  frame_count  smallint;
  scoring_mode text;
  bonus_frame  boolean;
  rolls        int[] := array_remove(array[new.roll1, new.roll2, new.roll3]::int[], null);
  previous     int[];
  standing     int := 10;
  i            int;
begin
  -- Rolls fill in order: no roll2 without roll1, no roll3 without roll2.
  if (new.roll2 is not null and new.roll1 is null) or (new.roll3 is not null and new.roll2 is null) then
    raise exception 'frame %: rolls must be written in order', new.frame_number
      using errcode = 'check_violation';
  end if;

  -- A roll that's been written never changes.
  if tg_op = 'UPDATE' and (
       (old.roll1 is not null and new.roll1 is distinct from old.roll1)
    or (old.roll2 is not null and new.roll2 is distinct from old.roll2)
    or (old.roll3 is not null and new.roll3 is distinct from old.roll3)
  ) then
    raise exception 'frame %: rolls already bowled can''t be changed', new.frame_number
      using errcode = 'check_violation';
  end if;

  select g.frame_count, g.scoring_mode
    into frame_count, scoring_mode
    from public.game_players gp
    join public.games g on g.id = gp.game_id
   where gp.id = new.game_player_id;

  if new.frame_number > frame_count then
    raise exception 'frame % is outside 1-%', new.frame_number, frame_count
      using errcode = 'check_violation';
  end if;

  if new.frame_number > 1 and cardinality(rolls) > 0 then
    select array_remove(array[f.roll1, f.roll2, f.roll3]::int[], null)
      into previous
      from public.frames f
     where f.game_player_id = new.game_player_id
       and f.frame_number = new.frame_number - 1;
    if previous is null or not public.frame_done(previous, false) then
      raise exception 'frame % has rolls but frame % is unfinished',
        new.frame_number, new.frame_number - 1
        using errcode = 'check_violation';
    end if;
  end if;

  bonus_frame := new.frame_number = frame_count and scoring_mode = 'standard';
  for i in 1 .. cardinality(rolls) loop
    if i > 1 and public.frame_done(rolls[1:i - 1], bonus_frame) then
      raise exception 'frame % has too many rolls', new.frame_number
        using errcode = 'check_violation';
    end if;
    if rolls[i] > standing then
      raise exception 'frame %, roll %: % pins with % standing', new.frame_number, i, rolls[i], standing
        using errcode = 'check_violation';
    end if;
    standing := standing - rolls[i];
    -- Clearing the deck mid-frame only happens in the bonus frame, which resets the rack.
    if standing = 0 then
      standing := 10;
    end if;
  end loop;

  return new;
end;
$$;

---------------------------------------------------------------------------
-- lobby_members: only the key columns; joined_at keeps its default.
---------------------------------------------------------------------------
revoke insert on public.lobby_members from anon, authenticated;
grant insert (lobby_id, user_id) on public.lobby_members to authenticated;

---------------------------------------------------------------------------
-- leftover grants
---------------------------------------------------------------------------
revoke all on public.leaderboard from anon, authenticated;
grant select on public.leaderboard to authenticated;

revoke truncate on all tables in schema public from anon, authenticated;
