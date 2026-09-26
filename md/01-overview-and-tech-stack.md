# Wii Recreation App — Overview & Tech Stack

## Overview
- Web app and desktop app that recreates the Wii system and its games
- Starting with Bowling, then moving to Just Dance
- Built for fun to play with friends, with potential to scale later
- Accessed via a single responsive web app — no separate mobile app needed; phones connect through the browser

## Tech Stack
- **Frontend:** Next.js with React
- **Backend:** Next.js API routes (no separate Spring Boot or Node server)
- **3D Rendering:** Three.js
- **Physics Engine:** Rapier, deterministic build (`@dimforge/rapier3d-deterministic-compat`) — identical results on every client (see 11-realtime-and-physics.md)
- **Real-time Communication:** Supabase Realtime (Broadcast + Presence) — no custom WebSocket server
- **Database:** Supabase (PostgreSQL with real-time subscriptions)
- **Phone Motion Controls:** Device Orientation API (accelerometer/gyroscope)
- **Avatar Graphics:** 2D sprites rendered in Three.js (upgrade to 3D later)
- **Avatar Customization:** Basic dropdowns for now (skin tone, hairstyle, outfit); AI sprite generation considered for the future
