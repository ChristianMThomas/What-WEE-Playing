-- Initial schema. See md/09-database-schema.md.
-- Only rolls are stored; per-frame scores are derived in code (md/05-game-modes-and-scoring.md).

-- True for phone controller sessions (Supabase anonymous auth).
create function public.is_anonymous()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

---------------------------------------------------------------------------
-- profiles
---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  skin_tone    text not null default 'default',
  hairstyle    text not null default 'default',
  outfit       text not null default 'default',
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create unique index profiles_username_lower_key on public.profiles (lower(username));

-- Create a profile for every registered (non-anonymous) user.
-- Registration passes username and avatar choices as user metadata; a missing
-- or taken username makes signup fail, so check availability before signUp().
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_anonymous then
    return new;
  end if;

  insert into public.profiles (id, username, skin_tone, hairstyle, outfit)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'skin_tone', 'default'),
    coalesce(new.raw_user_meta_data ->> 'hairstyle', 'default'),
    coalesce(new.raw_user_meta_data ->> 'outfit', 'default')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

---------------------------------------------------------------------------
-- lobbies
---------------------------------------------------------------------------
create table public.lobbies (
  id         uuid primary key default gen_random_uuid(),
  code       text not null check (code ~ '^[0-9]{7}$'),
  host_id    uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'open' check (status in ('open', 'in_game', 'closed')),
  created_at timestamptz not null default now()
);

-- Codes only need to be unique among lobbies that are still live.
create unique index lobbies_live_code_key on public.lobbies (code) where status <> 'closed';
create index lobbies_host_id_idx on public.lobbies (host_id);

---------------------------------------------------------------------------
-- games
---------------------------------------------------------------------------
create table public.games (
  id           uuid primary key default gen_random_uuid(),
  lobby_id     uuid references public.lobbies (id) on delete set null, -- null for single player
  created_by   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_type    text not null default 'bowling' check (game_type in ('bowling')),
  frame_count  smallint not null check (frame_count in (5, 10)),
  scoring_mode text not null check (scoring_mode in ('standard', 'basic')),
  status       text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index games_lobby_id_idx on public.games (lobby_id);
create index games_created_by_idx on public.games (created_by);

---------------------------------------------------------------------------
-- game_players
---------------------------------------------------------------------------
create table public.game_players (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade, -- null for bots
  is_bot      boolean not null default false,
  turn_order  smallint not null check (turn_order >= 0),
  final_total integer check (final_total >= 0),
  final_rank  smallint check (final_rank >= 1),
  check (is_bot = (user_id is null)),
  unique (game_id, turn_order),
  unique (game_id, user_id)
);

create index game_players_user_id_idx on public.game_players (user_id);

---------------------------------------------------------------------------
-- frames
---------------------------------------------------------------------------
-- Frame-level validity (pin totals, when roll3 is allowed) depends on the
-- game's frame_count and scoring_mode, so it is enforced in the scoring code.
create table public.frames (
  id             uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players (id) on delete cascade,
  frame_number   smallint not null check (frame_number between 1 and 10),
  roll1          smallint check (roll1 between 0 and 10),
  roll2          smallint check (roll2 between 0 and 10),
  roll3          smallint check (roll3 between 0 and 10),
  check (roll2 is null or roll1 is not null),
  check (roll3 is null or roll2 is not null),
  unique (game_player_id, frame_number)
);

---------------------------------------------------------------------------
-- pairings (phone controller <-> desktop)
---------------------------------------------------------------------------
create table public.pairings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  token         text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  phone_user_id uuid references auth.users (id) on delete cascade, -- anonymous phone session
  expires_at    timestamptz not null default now() + interval '5 minutes', -- deadline to claim
  claimed_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index pairings_user_id_idx on public.pairings (user_id);
create index pairings_phone_user_id_idx on public.pairings (phone_user_id);

-- Called by the phone after scanning the QR code. Returns the desktop user's id,
-- which names the controller:{userId} channel.
create function public.claim_pairing(pairing_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  desktop_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.pairings
     set phone_user_id = auth.uid(),
         claimed_at = now()
   where token = pairing_token
     and phone_user_id is null
     and expires_at > now()
  returning user_id into desktop_user_id;

  if desktop_user_id is null then
    raise exception 'invalid or expired pairing token';
  end if;

  return desktop_user_id;
end;
$$;

revoke execute on function public.claim_pairing(text) from public, anon;
grant execute on function public.claim_pairing(text) to authenticated;

---------------------------------------------------------------------------
-- leaderboard (derived, per game type and per mode combination)
---------------------------------------------------------------------------
create view public.leaderboard
with (security_invoker = on)
as
select g.game_type,
       g.frame_count,
       g.scoring_mode,
       gp.user_id,
       p.username,
       gp.final_total,
       g.completed_at
  from public.game_players gp
  join public.games g on g.id = gp.game_id
  join public.profiles p on p.id = gp.user_id
 where g.status = 'completed'
   and not gp.is_bot
   and gp.final_total is not null;

---------------------------------------------------------------------------
-- Row level security
---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.lobbies      enable row level security;
alter table public.games        enable row level security;
alter table public.game_players enable row level security;
alter table public.frames       enable row level security;
alter table public.pairings     enable row level security;

-- profiles: everyone signed in can see usernames/avatars; users edit their own.
create policy "profiles are readable" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- lobbies: registered users can browse; the host manages their lobby.
create policy "lobbies are readable" on public.lobbies
  for select to authenticated using (not (select public.is_anonymous()));
create policy "users create lobbies they host" on public.lobbies
  for insert to authenticated
  with check (host_id = (select auth.uid()) and not (select public.is_anonymous()));
create policy "host updates lobby" on public.lobbies
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

-- games: the creator (host, or the single player) manages the game.
create policy "games are readable" on public.games
  for select to authenticated using (not (select public.is_anonymous()));
create policy "users create games" on public.games
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and not (select public.is_anonymous())
    and (
      lobby_id is null
      or exists (select 1 from public.lobbies l
                  where l.id = lobby_id and l.host_id = (select auth.uid()))
    )
  );
create policy "creator updates game" on public.games
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- game_players: the game creator adds players and writes final totals/ranks.
create policy "game players are readable" on public.game_players
  for select to authenticated using (not (select public.is_anonymous()));
create policy "creator adds players" on public.game_players
  for insert to authenticated
  with check (exists (select 1 from public.games g
                       where g.id = game_id and g.created_by = (select auth.uid())));
create policy "creator updates players" on public.game_players
  for update to authenticated
  using (exists (select 1 from public.games g
                  where g.id = game_id and g.created_by = (select auth.uid())));

-- frames: each thrower writes their own rolls; the game creator writes bot rolls.
create policy "frames are readable" on public.frames
  for select to authenticated using (not (select public.is_anonymous()));
create policy "thrower or creator writes frames" on public.frames
  for insert to authenticated
  with check (exists (
    select 1 from public.game_players gp
      join public.games g on g.id = gp.game_id
     where gp.id = game_player_id
       and (gp.user_id = (select auth.uid())
            or (gp.is_bot and g.created_by = (select auth.uid())))
  ));
create policy "thrower or creator updates frames" on public.frames
  for update to authenticated
  using (exists (
    select 1 from public.game_players gp
      join public.games g on g.id = gp.game_id
     where gp.id = game_player_id
       and (gp.user_id = (select auth.uid())
            or (gp.is_bot and g.created_by = (select auth.uid())))
  ));

-- pairings: the desktop user creates/revokes; the paired phone can see its row.
-- Phones claim through claim_pairing(), never by direct update.
create policy "pairing parties can read" on public.pairings
  for select to authenticated
  using (user_id = (select auth.uid()) or phone_user_id = (select auth.uid()));
create policy "desktop creates pairing" on public.pairings
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select public.is_anonymous()));
create policy "desktop revokes pairing" on public.pairings
  for delete to authenticated
  using (user_id = (select auth.uid()));

---------------------------------------------------------------------------
-- Realtime authorization for private channels (md/11-realtime-and-physics.md)
--   lobby:{code}         registered users (desktops) only
--   controller:{userId}  that user's desktop, plus phones paired to them
---------------------------------------------------------------------------
create function public.can_use_realtime_topic(topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when topic like 'lobby:%' then
      auth.uid() is not null and not public.is_anonymous()
    when topic like 'controller:%' then
      topic = 'controller:' || auth.uid()::text
      or exists (
        select 1 from public.pairings pr
         where pr.phone_user_id = auth.uid()
           and topic = 'controller:' || pr.user_id::text
      )
    else false
  end;
$$;

create policy "authorized topics can receive" on realtime.messages
  for select to authenticated
  using ((select public.can_use_realtime_topic(realtime.topic())));

create policy "authorized topics can send" on realtime.messages
  for insert to authenticated
  with check ((select public.can_use_realtime_topic(realtime.topic())));
