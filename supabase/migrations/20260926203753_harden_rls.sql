-- Security hardening. The browser holds the publishable key, so anything RLS
-- and column grants allow, a player can do by hand. This migration:
--   * limits which columns clients can write, and moves activity tracking and
--     game results into security definer functions
--   * validates rolls in the database, mirroring src/lib/bowling/scoring.ts
--   * adds lobby membership and restricts lobby:{code} channels to members
--   * tightens phone pairing

---------------------------------------------------------------------------
-- profiles
---------------------------------------------------------------------------
-- Avatar ids must match src/lib/avatar.ts. 'default' is the column default.
alter table public.profiles
  add constraint profiles_skin_tone_check check (skin_tone in (
    'default', 'porcelain', 'light', 'medium', 'tan', 'brown', 'deep')),
  add constraint profiles_hairstyle_check check (hairstyle in (
    'default', 'short', 'spiky', 'high-top-fade', 'afro', 'dreadlocks', 'curly',
    'long', 'long-curly', 'ponytail', 'big-bun', 'bald')),
  add constraint profiles_hair_color_check check (hair_color in (
    'default', 'dark-brown', 'black', 'brown', 'auburn', 'red', 'blonde', 'platinum',
    'gray', 'pink', 'blue', 'purple', 'green')),
  add constraint profiles_outfit_check check (outfit in (
    'default', 'red-tee', 'blue-jersey', 'bowling-shirt', 'green-hoodie', 'purple-sweater'));

-- Players can change their name and look. last_seen_at is only written by
-- touch_last_seen(), otherwise a player could set it far in the future and
-- never hit the 30-day inactivity logout. It isn't readable by other players.
revoke insert, update, select on public.profiles from anon, authenticated;
grant select (id, username, skin_tone, hairstyle, hair_color, outfit, created_at)
  on public.profiles to authenticated;
grant update (username, skin_tone, hairstyle, hair_color, outfit)
  on public.profiles to authenticated;

-- Phones only see the profile of the desktop they're paired with.
drop policy "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles
  for select to authenticated
  using (
    not (select public.is_anonymous())
    or id in (select pr.user_id from public.pairings pr
               where pr.phone_user_id = (select auth.uid()))
  );

-- Records activity for the 30-day inactivity logout (md/02). Returns false,
-- without touching anything, when the account has already been inactive too
-- long (or has no profile), and the proxy then signs the session out.
create function public.touch_last_seen()
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  with touched as (
    update public.profiles
       set last_seen_at = now()
     where id = auth.uid()
       and last_seen_at > now() - interval '30 days'
    returning 1
  )
  select exists (select 1 from touched);
$$;

revoke execute on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

---------------------------------------------------------------------------
-- lobby membership
---------------------------------------------------------------------------
create table public.lobby_members (
  lobby_id  uuid not null references public.lobbies (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);

create index lobby_members_user_id_idx on public.lobby_members (user_id);

alter table public.lobby_members enable row level security;

revoke update on public.lobby_members from anon, authenticated;

create policy "lobby members are readable" on public.lobby_members
  for select to authenticated using (not (select public.is_anonymous()));
create policy "users join open lobbies" on public.lobby_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not (select public.is_anonymous())
    and exists (select 1 from public.lobbies l
                 where l.id = lobby_id and l.status = 'open')
  );
create policy "members leave, host removes" on public.lobby_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.lobbies l
                where l.id = lobby_id and l.host_id = (select auth.uid()))
  );

-- The host is always a member of their own lobby.
create function public.add_lobby_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lobby_members (lobby_id, user_id) values (new.id, new.host_id);
  return new;
end;
$$;

create trigger on_lobby_created
  after insert on public.lobbies
  for each row execute function public.add_lobby_host();

-- Only the status changes after creation (open -> in_game -> closed).
revoke insert, update on public.lobbies from anon, authenticated;
grant insert (code, host_id) on public.lobbies to authenticated;
grant update (status) on public.lobbies to authenticated;

---------------------------------------------------------------------------
-- games
---------------------------------------------------------------------------
-- Clients pick the settings when creating a game. Afterwards they can only
-- abandon it; finish_game() is the only way to mark it completed.
revoke insert, update on public.games from anon, authenticated;
grant insert (lobby_id, game_type, frame_count, scoring_mode) on public.games to authenticated;
grant update (status) on public.games to authenticated;

drop policy "creator updates game" on public.games;
create policy "creator abandons game" on public.games
  for update to authenticated
  using (created_by = (select auth.uid()) and status = 'in_progress')
  with check (created_by = (select auth.uid()) and status in ('in_progress', 'abandoned'));

---------------------------------------------------------------------------
-- game_players
---------------------------------------------------------------------------
alter table public.game_players
  add constraint game_players_final_total_max check (final_total <= 300);

-- final_total and final_rank are written by finish_game() only.
revoke insert, update on public.game_players from anon, authenticated;
grant insert (game_id, user_id, is_bot, turn_order) on public.game_players to authenticated;

drop policy "creator adds players" on public.game_players;
drop policy "creator updates players" on public.game_players;

-- The creator can add bots, themselves, and members of the game's lobby.
create policy "creator adds players" on public.game_players
  for insert to authenticated
  with check (exists (
    select 1 from public.games g
     where g.id = game_id
       and g.created_by = (select auth.uid())
       and g.status = 'in_progress'
       and (
         game_players.user_id is null
         or game_players.user_id = (select auth.uid())
         or exists (select 1 from public.lobby_members m
                     where m.lobby_id = g.lobby_id
                       and m.user_id = game_players.user_id)
       )
  ));

---------------------------------------------------------------------------
-- frames
---------------------------------------------------------------------------
revoke insert, update on public.frames from anon, authenticated;
grant insert (game_player_id, frame_number, roll1, roll2, roll3) on public.frames to authenticated;
grant update (roll1, roll2, roll3) on public.frames to authenticated;

drop policy "thrower or creator writes frames" on public.frames;
drop policy "thrower or creator updates frames" on public.frames;

-- Rolls can only be written while the game is in progress.
create policy "thrower or creator writes frames" on public.frames
  for insert to authenticated
  with check (exists (
    select 1 from public.game_players gp
      join public.games g on g.id = gp.game_id
     where gp.id = game_player_id
       and g.status = 'in_progress'
       and (gp.user_id = (select auth.uid())
            or (gp.is_bot and g.created_by = (select auth.uid())))
  ));
create policy "thrower or creator updates frames" on public.frames
  for update to authenticated
  using (exists (
    select 1 from public.game_players gp
      join public.games g on g.id = gp.game_id
     where gp.id = game_player_id
       and g.status = 'in_progress'
       and (gp.user_id = (select auth.uid())
            or (gp.is_bot and g.created_by = (select auth.uid())))
  ));

-- Whether a frame's rolls finish it. Mirrors isFrameDone() in
-- src/lib/bowling/scoring.ts; keep the two in sync.
create function public.frame_done(rolls int[], bonus_frame boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when bonus_frame then
      cardinality(rolls) = 3 or (cardinality(rolls) = 2 and rolls[1] + rolls[2] < 10)
    else
      cardinality(rolls) = 2 or (cardinality(rolls) = 1 and rolls[1] = 10)
  end;
$$;

revoke execute on function public.frame_done(int[], boolean) from public, anon;
grant execute on function public.frame_done(int[], boolean) to authenticated;

-- Rejects impossible frames. Mirrors frameState() in src/lib/bowling/scoring.ts:
-- the frame must exist in this game, the previous frame must be finished, no
-- roll may knock down more pins than are standing, and no roll may come after
-- the frame is done. Frames have to be written in order.
create function public.validate_frame()
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

create trigger validate_frame
  before insert or update on public.frames
  for each row execute function public.validate_frame();

---------------------------------------------------------------------------
-- finishing a game
---------------------------------------------------------------------------
-- A player's final score, or null if their game isn't complete. Mirrors
-- scoreGame() in src/lib/bowling/scoring.ts; keep the two in sync.
create function public.game_player_total(player_id uuid)
returns int
language plpgsql
stable
set search_path = ''
as $$
declare
  frame_count  smallint;
  scoring_mode text;
  f            record;
  all_rolls    int[] := '{}';
  starts       int[] := '{}';
  expected     int := 1;
  total        int := 0;
  s            int;
  n            int;
  pins         int;
  i            int;
begin
  select g.frame_count, g.scoring_mode
    into frame_count, scoring_mode
    from public.game_players gp
    join public.games g on g.id = gp.game_id
   where gp.id = player_id;

  for f in
    select frame_number, array_remove(array[roll1, roll2, roll3]::int[], null) as rolls
      from public.frames
     where game_player_id = player_id
     order by frame_number
  loop
    if f.frame_number <> expected
       or not public.frame_done(f.rolls, f.frame_number = frame_count and scoring_mode = 'standard') then
      return null;
    end if;
    starts := starts || (cardinality(all_rolls) + 1);
    all_rolls := all_rolls || f.rolls;
    expected := expected + 1;
  end loop;

  if expected <> frame_count + 1 then
    return null;
  end if;
  -- Sentinel so the last frame's length can be read like the others.
  starts := starts || (cardinality(all_rolls) + 1);

  for i in 1 .. frame_count loop
    s := starts[i];
    n := starts[i + 1] - s;
    pins := (select sum(x) from unnest(all_rolls[s:s + n - 1]) as x);
    total := total + pins;
    -- The bonus frame already contains its own bonus rolls.
    if scoring_mode = 'standard' and i < frame_count then
      if all_rolls[s] = 10 then
        total := total + all_rolls[s + 1] + all_rolls[s + 2];
      elsif pins = 10 then
        total := total + all_rolls[s + n];
      end if;
    end if;
  end loop;

  return total;
end;
$$;

revoke execute on function public.game_player_total(uuid) from public, anon;
grant execute on function public.game_player_total(uuid) to authenticated;

-- Called by the game's creator once every player has bowled every frame.
-- Scores each player from their stored rolls, ranks them (ties share a rank)
-- and marks the game completed, so the leaderboard never trusts client totals.
create function public.finish_game(finished_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.games
    where id = finished_game_id
      and created_by = auth.uid()
      and status = 'in_progress'
    for update;
  if not found then
    raise exception 'game not found or not in progress';
  end if;

  update public.game_players
     set final_total = public.game_player_total(id)
   where game_id = finished_game_id;

  if exists (select 1 from public.game_players
              where game_id = finished_game_id and final_total is null) then
    raise exception 'every player must finish every frame first';
  end if;

  update public.game_players gp
     set final_rank = ranked.final_rank
    from (select id, rank() over (order by final_total desc) as final_rank
            from public.game_players
           where game_id = finished_game_id) as ranked
   where gp.id = ranked.id;

  update public.games
     set status = 'completed', completed_at = now()
   where id = finished_game_id;
end;
$$;

revoke execute on function public.finish_game(uuid) from public, anon;
grant execute on function public.finish_game(uuid) to authenticated;

---------------------------------------------------------------------------
-- pairings
---------------------------------------------------------------------------
-- The desktop only says who it is; the token, expiry and claim come from
-- defaults and claim_pairing().
alter table public.pairings alter column user_id set default auth.uid();
revoke insert, update on public.pairings from anon, authenticated;
grant insert (user_id) on public.pairings to authenticated;

-- Only phones (anonymous sessions) can claim, and a new phone replaces any
-- earlier pairing for that desktop.
create or replace function public.claim_pairing(pairing_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id      uuid;
  desktop_user_id uuid;
begin
  if auth.uid() is null or not public.is_anonymous() then
    raise exception 'only a phone controller can claim a pairing';
  end if;

  update public.pairings
     set phone_user_id = auth.uid(),
         claimed_at = now()
   where token = pairing_token
     and phone_user_id is null
     and expires_at > now()
  returning id, user_id into claimed_id, desktop_user_id;

  if desktop_user_id is null then
    raise exception 'invalid or expired pairing token';
  end if;

  delete from public.pairings
   where user_id = desktop_user_id
     and id <> claimed_id;

  return desktop_user_id;
end;
$$;

---------------------------------------------------------------------------
-- Realtime authorization
--   lobby:{code}         members of that live lobby
--   controller:{userId}  that user's desktop, plus a phone paired in the last 12 hours
---------------------------------------------------------------------------
create or replace function public.can_use_realtime_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when topic like 'lobby:%' then
      not public.is_anonymous()
      and exists (
        select 1 from public.lobby_members m
          join public.lobbies l on l.id = m.lobby_id
         where m.user_id = auth.uid()
           and l.code = substr(topic, length('lobby:') + 1)
           and l.status <> 'closed'
      )
    when topic like 'controller:%' then
      topic = 'controller:' || auth.uid()::text
      or exists (
        select 1 from public.pairings pr
         where pr.phone_user_id = auth.uid()
           and pr.claimed_at > now() - interval '12 hours'
           and topic = 'controller:' || pr.user_id::text
      )
    else false
  end;
$$;

-- Helpers the policies use; nobody signed out needs them.
revoke execute on function public.can_use_realtime_topic(text) from public, anon;
grant execute on function public.can_use_realtime_topic(text) to authenticated;
revoke execute on function public.is_anonymous() from public, anon;
grant execute on function public.is_anonymous() to authenticated;
