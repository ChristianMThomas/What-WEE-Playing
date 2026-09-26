# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Early scaffold: a Next.js 16 app (App Router, TypeScript, Tailwind v4, `src/` dir) plus the initial Supabase schema. The design specs in `md/` (numbered 01–11) are the source of truth for features, so read the relevant one before building.

## Commands

```bash
npm run dev          # Next dev server on http://localhost:3000
npm run build
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm run typecheck    # next typegen && tsc --noEmit (typegen creates the global LayoutProps/PageProps types)
npm test             # vitest run
npx vitest run path/to/file.test.ts   # single test file
npx vitest run -t "strike"            # tests matching a name

npm run db:start     # local Supabase stack (needs Docker running); prints the API URL and keys
npm run db:reset     # rebuild the local DB from supabase/migrations
npm run db:types     # regenerate src/lib/supabase/database.types.ts from the local DB
npx supabase migration new <name>     # new migration file in supabase/migrations
```

The Supabase CLI is a dev dependency, so run it with `npx supabase` or the npm scripts. Local ports: API 54321, Postgres 54322, Studio 54323, Inbucket (test email inbox) 54324. Anonymous sign-ins are enabled in `supabase/config.toml` for phone controllers.

## Database notes

- Schema, RLS policies and Realtime channel authorization are all in `supabase/migrations/`. Change the schema with a new migration, never by editing an applied one.
- The `on_auth_user_created` trigger creates the `profiles` row from `signUp()` user metadata (`username`, `skin_tone`, `hairstyle`, `outfit`). It skips anonymous users. A missing or taken username makes signup fail, so check availability first.
- Phones pair by calling the `claim_pairing(token)` RPC. `can_use_realtime_topic()` controls who can use `lobby:*` and `controller:*` channels, which must be joined as **private** channels.
- `leaderboard` is a view with `security_invoker` on, so RLS still applies.

## What this is

A web app that recreates the Wii system: a Wii-style channel menu where each channel is a game. **Bowling** comes first and **Just Dance** second. It's one responsive Next.js app. Phones act as Wii remotes through the browser, so there is no native mobile app.

## Planned stack (from `md/01-overview-and-tech-stack.md`)

- Next.js + React for the frontend. **Backend is Next.js API routes only**, with no separate Node or Spring server.
- Three.js for rendering and **Rapier's deterministic build** (`@dimforge/rapier3d-deterministic-compat`) for pin physics. Not Cannon.js.
- **Supabase Realtime** (Broadcast + Presence) for real-time play, with no custom WebSocket server. Supabase Postgres for persistence.
- The Device Orientation API reads phone accelerometer and gyroscope data.
- Avatars are 2D sprites rendered in Three.js, customized through dropdowns (skin tone, hairstyle, outfit).

## Core architecture (spans several specs)

**Auth** (`md/02-authentication-and-sessions.md`): **Supabase Auth**, not custom JWTs, because private Realtime channels authorize with its tokens. Users register with email, password and a unique username. The session lives in `@supabase/ssr` cookies, which page scripts can read, so never render usernames or other user content through `dangerouslySetInnerHTML`. Next.js middleware enforces the 30-day inactivity logout using `profiles.last_seen_at`. Phones use anonymous auth plus a `pairings` row.

**Flow:** register → Wii-menu home → pick a channel → Single Player (vs. a bot that bowls randomly) or Multiplayer → Create Lobby or Join Lobby (7-digit code, or browse open lobbies).

**Remote play:** each player uses their own desktop (the game screen) plus their own phone (the controller), both logged into the same account. They pair with a QR code that holds a short-lived token.

**Multiplayer bowling loop** (full design in `md/11-realtime-and-physics.md`):
1. The phone (`/controller` page) buffers motion while the button is held. On release, it computes the throw parameters (speed, angle, spin).
2. The phone sends them to the player's own desktop on the `controller:{userId}` channel.
3. That desktop broadcasts them to everyone on `lobby:{code}`. The phone never joins the lobby channel.
4. Every client simulates the throw locally with deterministic Rapier, so all clients get identical results.
5. The thrower's desktop broadcasts the standing pins as a safety check (any client that differs snaps to it) and writes the score to the database.

Turns rotate one bowler per frame. The host controls start, play again, and quit.

**Determinism rules (breaking any of them silently desyncs clients):** pin one exact Rapier version, use a fixed physics timestep separate from the render loop, build the starting state from shared constants, and never use randomness or wall-clock time inside the simulation.

**Game config is two independent axes** that can be combined freely:
- Length: Swift Play (5 frames) or Standard (10 frames).
- Scoring: Standard (real bowling rules, strikes and spares carry over) or Basic (pins per frame, no carry-over).

Keep frame count and the scoring algorithm decoupled. The "last frame" is `frameCount`, never a hardcoded 10. With Standard scoring, the last frame gets real 10th-frame bonus rolls, including frame 5 in Swift Play. With Basic scoring, it's a normal 2-roll frame.

**Data model** (`md/09-database-schema.md`): `profiles`, `lobbies`, `games` (store `frame_count` and `scoring_mode`), `game_players` (turn order, bots, final total and rank), `frames` (`roll1`–`roll3`), and `pairings`. **Only rolls are stored.** Per-frame scores come from one pure scoring function, so there is no `scores` table. Leaderboards are a query over `game_players`, grouped per game and per mode combination, not global.

**Phone controller:** iOS only gives motion data after `DeviceMotionEvent.requestPermission()` is called from a tap, over HTTPS, so testing on a phone during local development needs a tunnel such as ngrok. Use the Wake Lock API to keep the phone screen on.

## Out of scope for now

Global leaderboards, 3D or AI-generated avatars, a competitive bot, and Just Dance (see `md/10-future-considerations.md`).
