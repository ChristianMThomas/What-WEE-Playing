# Real-time Architecture & Physics

## Play Model
- Remote play: each player has their own desktop/laptop (shows the game) and their own phone (the controller), both logged into the same account

## Real-time Layer: Supabase Realtime
- Next.js API routes can't hold WebSocket connections (and serverless hosts like Vercel can't at all), so all real-time traffic goes through Supabase Realtime
- **`lobby:{code}`** — joined by every player's desktop
  - Presence: who's in the lobby, disconnect detection
  - Broadcast: game start, turn changes, throws, pin results, play again / quit
- **`controller:{userId}`** — private link between one player's phone and their own desktop
- Throw flow: phone → own desktop (`controller:{userId}`) → everyone (`lobby:{code}`)
- The phone never joins the lobby channel; the desktop decides whether it's that player's turn
- Fine for friend-scale; move to a custom server or PartyKit later if scale or cheating becomes a concern

## Controller Pairing
- **Primary:** desktop shows a QR code containing a short-lived pairing token; scanning it connects the phone with no login
- **Fallback:** log in on the phone; it finds the desktop via user ID
- Phone controller page needs:
  - A "Tap to enable motion" step — iOS requires `DeviceMotionEvent.requestPermission()` from a tap, over HTTPS
  - Wake Lock API to keep the screen on while in use
- Local dev on a phone needs HTTPS (ngrok / Cloudflare Tunnel, or a local cert)

## Throw Input
- Phone buffers motion samples while the button is held
- On release, the phone computes throw parameters (speed, angle, spin) and sends one small message (~100 bytes) — no raw motion streaming

## Physics: Deterministic Rapier
- Engine: Rapier deterministic build (`@dimforge/rapier3d-deterministic-compat`), which gives bit-identical results across platforms
- Every client receives the throw parameters and simulates the roll locally, so everyone sees it at the same time
- Rules that must hold, or clients silently get different results:
  - Pin one exact Rapier version for all clients
  - Fixed physics timestep, never tied to the render frame rate
  - Identical starting state (pin positions, ball, world settings) built from shared constants
  - No randomness or wall-clock time inside the simulation
  - Throw parameters are sent exactly as the phone computed them; don't round them differently on different clients
- **Safety check:** the thrower's desktop broadcasts the final list of standing pins; any client whose result differs snaps to it (should never happen, but catches bugs)
- Preload Rapier's WASM (~1–2 MB) while players wait in the lobby

## Score Authority
- The thrower's desktop reports the pin result and writes the frame score to the database
- A modified client could cheat; acceptable for friends
- **Future anti-cheat:** a server re-runs the ~100-byte throw and checks the reported score
