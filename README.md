# WhatWiPlaying

A web app that recreates the Wii: a channel menu where each channel is a game, with your phone as the Wii remote. Bowling is the first channel and Just Dance is planned next.

There's no native mobile app. The game runs in a desktop browser, and your phone joins as a controller through its own browser by scanning a QR code. Throwing the ball means actually swinging your phone.

> **Status:** early development. The Next.js scaffold and the Supabase schema are in place, and the games themselves are still being built.

## How it works

- **Sign up** with an email, password and a unique username, then customize a 2D avatar (skin tone, hairstyle, outfit).
- **Pick a channel** from the Wii-style home menu.
- **Play single player** against a bot, or **multiplayer** by creating a lobby or joining one with a 7-digit code.
- **Pair your phone** by scanning a QR code on your desktop. Hold the button, swing, and release to throw.

Each player uses their own desktop screen and their own phone, so you can play with friends who aren't in the same room.

### Game modes

Bowling has two settings you can combine however you like:

| Length | Scoring |
| --- | --- |
| **Swift Play**: 5 frames | **Standard**: real bowling rules, with strike and spare bonuses |
| **Standard**: 10 frames | **Basic**: pins knocked down per frame, no carry-over |

### Multiplayer

Real-time play runs on Supabase Realtime, with no custom WebSocket server. When you throw, your phone sends the swing's speed, angle and spin to your desktop, which shares it with everyone in the lobby. Every player's browser then runs the same physics simulation with deterministic Rapier, so all screens show exactly the same pins falling.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) with React, TypeScript and Tailwind CSS v4
- Next.js API routes for the backend
- [Three.js](https://threejs.org) for rendering
- [Rapier](https://rapier.rs) (deterministic build) for pin physics
- [Supabase](https://supabase.com) for auth, Postgres and Realtime
- The Device Orientation API for phone motion controls
- Vitest for tests

## Getting started

### Prerequisites

- Node.js 20.9+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), running, for the local Supabase stack

### Setup

```bash
npm install
npm run db:start   # starts local Supabase and prints the API URL and keys
```

Create `.env.local` with the values `db:start` printed:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from db:start>
```

Then start the app:

```bash
npm run dev        # http://localhost:3000
```

Supabase Studio runs at http://localhost:54323, and the test email inbox is at http://localhost:54324.

### Testing on a phone

iOS only gives websites motion data over HTTPS, and only after you tap to grant permission. To try the controller on a real phone during development, expose the dev server through a tunnel such as [ngrok](https://ngrok.com).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Run the Vitest suite |
| `npm run db:start` | Start the local Supabase stack |
| `npm run db:reset` | Rebuild the local database from `supabase/migrations` |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |

## Project layout

```
md/                    design specs (01â€“11), the source of truth for features
src/app/               Next.js App Router pages
src/lib/supabase/      Supabase client code and generated types
supabase/migrations/   database schema, RLS policies and Realtime auth
```

## Roadmap

- [x] Project scaffold and database schema
- [ ] Accounts and avatars
- [ ] Wii-style home menu
- [ ] Bowling: single player vs. bot
- [ ] Phone controller and QR pairing
- [ ] Bowling: multiplayer lobbies
- [ ] Per-game leaderboards
- [ ] Just Dance
