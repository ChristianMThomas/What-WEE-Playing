# Database Schema

**Database:** Supabase (PostgreSQL with real-time subscriptions)

## Tables
- **profiles** — one per Supabase Auth user (`auth.users` holds email/password)
  - `id` (= auth user id), `username` (unique), avatar fields (skin tone, hairstyle, outfit), `last_seen_at`
- **lobbies** — `id`, `code` (7 digits, unique among open lobbies), `host_id`, `status`
- **games** — `id`, `lobby_id` (null for single player), `frame_count` (5 or 10), `scoring_mode` (standard or basic), `status`
- **game_players** — who played in which game
  - `id`, `game_id`, `user_id` (null for bots), `is_bot`, `turn_order`, `final_total`, `final_rank`
- **frames** — one per player per frame
  - `id`, `game_player_id`, `frame_number`, `roll1`, `roll2`, `roll3` (`roll3` only used in the last frame)
- **pairings** — links a phone's anonymous session to a user's desktop
  - `id`, `user_id`, `token`, `phone_user_id` (the phone's anonymous auth user), `expires_at` (claim deadline), `claimed_at`
- **games** also has `created_by` (host or single player; controls who may write game/player rows) and `game_type` (`bowling` for now)

## Derived Data (not stored as tables)
- **Per-frame scores** — calculated in code from rolls (see 05-game-modes-and-scoring.md); there is no `scores` table
- **Leaderboards** — a view/query over `game_players.final_total`, grouped per game **and per (frame_count, scoring_mode)**, since scores from different modes aren't comparable. Not global yet.

## Relationships
- A Lobby has Games
- A Game has many Game Players
- A Game Player has many Frames
- A Game Player belongs to a Profile (or is a bot)
- A Pairing belongs to a Profile
