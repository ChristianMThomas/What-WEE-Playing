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
- Clients get **column-level grants**, not whole-table writes. A client insert or update that names a column outside the grant fails with "permission denied". Check `*_harden_rls.sql` before writing to a table.
- Some writes go only through `security definer` RPCs:
  - `touch_last_seen()`: the activity bump behind the 30-day logout, called by the session guard.
  - `finish_game(game_id)`: scores every player from `frames`, sets `final_total`/`final_rank`, and marks the game completed. Clients never write totals.
  - `claim_pairing(token)`: phones only. A new claim replaces the desktop's earlier pairings.
- A `validate_frame` trigger rejects impossible rolls, and frames must be written in order. Rolls are write-once: an update can only fill in the next empty roll, never change or clear one, so there is no "undo roll". It and `game_player_total()` mirror `src/lib/bowling/scoring.ts`, so change them together.
- Avatar ids have CHECK constraints matching `src/lib/avatar.ts`. Adding an option needs a migration.
- Lobby players must be in `lobby_members`; the host is added automatically. Only members can use `lobby:{code}`, and the game creator can only add lobby members, bots or themselves to `game_players`.

## Deployment

`DEPLOY.md` has the steps. Production is a **static export**: `npm run build` writes `out/` (`output: "export"`, `trailingSlash: true`, set only for builds in `next.config.ts`), `npm run package` packs it, and it's uploaded to Hostinger's plain web hosting at whatwiiplaying.com, with hosted Supabase as the backend. So there is **no server code**: no proxy, Server Actions, Route Handlers, `cookies()`/`headers()`, dynamic routes without `generateStaticParams`, or reading `searchParams` in a page (use `useSearchParams` in a client component inside `<Suspense>`). `scripts/finish-export.mjs` runs after `next build`: it writes `out/.htaccess` (the security headers from `src/lib/csp.ts`) and flattens Next's nested segment prefetch files, which otherwise 404. Builds for upload need `.env.production.local` with the hosted Supabase URL and key.

## What this is

A web app that recreates the Wii system: a Wii-style channel menu where each channel is a game. **Bowling** comes first and **Just Dance** second. It's one responsive Next.js app. Phones act as Wii remotes through the browser, so there is no native mobile app.

## Planned stack (from `md/01-overview-and-tech-stack.md`)

- Next.js + React for the frontend. **Backend is Next.js API routes only**, with no separate Node or Spring server.
- Three.js for rendering and **Rapier's deterministic build** (`@dimforge/rapier3d-deterministic-compat`) for pin physics. Not Cannon.js.
- **Supabase Realtime** (Broadcast + Presence) for real-time play, with no custom WebSocket server. Supabase Postgres for persistence.
- The Device Orientation API reads phone accelerometer and gyroscope data.
- Avatars are 2D sprites rendered in Three.js, customized through dropdowns (skin tone, hairstyle, outfit).

## Core architecture (spans several specs)

**Auth** (`md/02-authentication-and-sessions.md`): **Supabase Auth**, not custom JWTs, because private Realtime channels authorize with its tokens. Users register with email, password and a unique username. The session lives in `@supabase/ssr` cookies in the browser (marked Secure in production via `AUTH_COOKIE_OPTIONS` in `src/lib/supabase/env.ts`), which page scripts can read, so never render usernames or other user content through `dangerouslySetInnerHTML`. With no server, `SessionProvider` (`src/components/session/SessionProvider.tsx`, in the root layout) does the guarding: it sends signed-out visitors to `/login` and signed-in ones away from it, shows the boot notice once per browser session, and enforces the 30-day inactivity logout by calling `touch_last_seen()` at most hourly. Pages get the player from `useProfile()`. This only decides what to show; RLS is what protects data. The CSP can't use a nonce on static files, so scripts are `'self' 'unsafe-inline'`; new external origins (scripts, APIs, websockets) must be added in `src/lib/csp.ts`. Login and signup call Supabase from the browser (`src/app/(auth)/client-auth.ts`). Use `@/lib/supabase/client` and authenticate with `getClaims()` rather than `getSession()`. Phones use anonymous auth plus a `pairings` row.

**Flow:** register → Wii-menu home → pick a channel → Single Player (vs. a bot that bowls randomly) or Multiplayer → Create Lobby or Join Lobby (7-digit code, or browse open lobbies).

**Remote play:** each player uses their own desktop (the game screen) plus their own phone (the controller), both logged into the same account. They pair with a QR code that holds a short-lived token.

**Multiplayer bowling loop** (full design in `md/11-realtime-and-physics.md`):
1. The phone (`/controller` page) buffers motion while the button is held. On release, it computes the throw parameters (speed, angle, spin).
2. The phone sends them to the player's own desktop on the `controller:{userId}` channel.
3. That desktop broadcasts them to everyone on `lobby:{code}`. The phone never joins the lobby channel.
4. Every client simulates the throw locally with deterministic Rapier, so all clients get identical results.
5. The thrower's desktop broadcasts the standing pins as a safety check (any client that differs snaps to it) and writes the score to the database.

Turns rotate one bowler per frame. The host controls start, play again, and quit.

**Bowling code:** `src/lib/bowling/physics.ts` (`simulateRoll`) simulates a whole roll up front from a `Launch` and a `PinMask` (`pins.ts`), and `alley.ts` plays the recording back. The thrower's desktop turns aim plus swing into a `Launch` with `launchFrom` (`shot.ts`); broadcast that Launch (checked with `isLaunch`), never the aim and swing, because the trig in `launchFrom` isn't guaranteed to round the same way in every browser. Standing pins are re-spotted between rolls, so the pin mask is the only state carried over. `BowlingGame.tsx` runs the turn loop, and the keyboard (arrows, A/Enter, hold Space, Esc) works as well as the phone.

**Determinism rules (breaking any of them silently desyncs clients):** pin one exact Rapier version, use a fixed physics timestep separate from the render loop, build the starting state from shared constants, and never use randomness or wall-clock time inside the simulation.

**Game config is two independent axes** that can be combined freely:
- Length: Swift Play (5 frames) or Standard (10 frames).
- Scoring: Standard (real bowling rules, strikes and spares carry over) or Basic (pins per frame, no carry-over).

Keep frame count and the scoring algorithm decoupled. The "last frame" is `frameCount`, never a hardcoded 10. With Standard scoring, the last frame gets real 10th-frame bonus rolls, including frame 5 in Swift Play. With Basic scoring, it's a normal 2-roll frame.

**Data model** (`md/09-database-schema.md`): `profiles`, `lobbies`, `games` (store `frame_count` and `scoring_mode`), `game_players` (turn order, bots, final total and rank), `frames` (`roll1`–`roll3`), and `pairings`. **Only rolls are stored.** Per-frame scores come from one pure scoring function, so there is no `scores` table. Leaderboards are a query over `game_players`, grouped per game and per mode combination, not global.

**Phone controller:** iOS only gives motion data after `DeviceMotionEvent.requestPermission()` is called from a tap, over HTTPS, so testing on a phone during local development needs the ngrok tunnel (README → Testing on a phone) and `NEXT_PUBLIC_APP_URL`, the origin put in the pairing QR code (in production it's just the site's own address). The phone can't reach local Supabase, so a dev-only rewrite serves it at `/supabase` (Realtime websocket included) and `src/lib/supabase/controller.ts` uses that; the phone keeps its anonymous session in localStorage, separate from desktop cookies. The desktop end is `RemoteProvider` in the root layout (`src/app/layout.tsx`), so the remote works on every screen, not just in a channel; the phone is `/controller`. Throw math is `src/lib/controller/throw.ts`, pointing math `src/lib/controller/aim.ts`, and the message format `src/lib/controller/protocol.ts` (desktops must run throws through `parseThrow`, buttons through `parseButton` and aims through `parseAim`). The phone is a Wii Remote (`WiiRemote.tsx`): d-pad, A, the B trigger (hold, swing, release = throw) and Home. It sends raw button down/up events and games give them meaning through `useRemote().onButton`, so keep game logic off the phone. Use the Wake Lock API to keep the phone screen on.

**Pointing** (md/11 → Pointer Input): the phone streams where it points as angles relative to a pose it calibrates itself, and `PointerLayer.tsx` draws the hand, marks what it is over with `data-pointed` and clicks it with A. Because `globals.css` redefines Tailwind's `hover` and `active` variants to include those attributes, every existing `hover:` style lights up for the pointer too — so style new screens with `hover:` as usual and they work with the remote for free. A game that wants the buttons for itself calls `useRemote().grab()` while it is being played.

## Out of scope for now

Global leaderboards, 3D or AI-generated avatars, a competitive bot, and Just Dance (see `md/10-future-considerations.md`).
