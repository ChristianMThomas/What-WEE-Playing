# Authentication & Sessions

- Registration page with Wii-style UI
- Registration fields: **email, password, username** (username is the display name shown in lobbies and leaderboards; must be unique)
- Auth uses **Supabase Auth** (no hand-rolled JWTs): it issues the JWT + refresh token, hashes passwords, and handles refresh
  - Required because private Realtime channels (e.g. `controller:{userId}`) authorize using Supabase Auth JWTs
- Session stored in cookies via `@supabase/ssr` so both Next.js server code and the browser can use it
  - These cookies are readable by page scripts (the browser Realtime connection needs the token), so XSS prevention matters: rely on React escaping, never render user content (usernames!) with `dangerouslySetInnerHTML`, and set a Content Security Policy

## Session Lifetime
- Token auto-refreshes while the user is active (no forced logout mid-session) — handled by Supabase
- After **30 days of inactivity**, the user must log in again
  - Implemented in Next.js middleware: store `last_seen_at` on the profile, update it on activity, and sign the user out if it's more than 30 days old
  - (Supabase's built-in inactivity timeout may be paid-plan only; don't rely on it)

## Phone Controller Sessions
- The phone signs in with Supabase **anonymous auth**
- Scanning the desktop's QR code (short-lived pairing token) creates a row in `pairings`
- An RLS policy lets the anonymous phone session use only its paired `controller:{userId}` channel
- Fallback: log in on the phone with email + password
