# Lobbies & Multiplayer

- Host creates a lobby with a 7-digit code
- Players join by entering the code or browsing a list of open lobbies
- Play is remote: each player uses their own desktop screen plus their own phone as controller
- Lobby screen shows a list of player usernames (via Supabase Realtime Presence)
- Host can start the game whenever ready
- Turn-based bowling: one player bowls per frame, then rotation to the next player
- Per-game leaderboards (not global, at least for now)
