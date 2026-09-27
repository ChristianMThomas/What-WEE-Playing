---
name: secure
description: Security audit for WhatWiiPlaying. Sub-agents sweep every folder for leaked credentials and check Supabase RLS, Realtime channel auth, sessions, input trust, XSS, headers and dependencies in parallel. Then it reports findings, fixes the safe ones, and asks before risky changes. Use when the user says "secure", "security check", "audit", "is this safe", "check for leaked keys", "vulnerabilities", or before shipping auth, database, or multiplayer code.
---

# Secure

You're auditing WhatWiiPlaying: a Next.js 16 app (App Router), exported as static files with no server code (DEPLOY.md), on Supabase (Auth, Postgres with RLS, Realtime). Phones join as controllers through anonymous auth, and game clients send throws and scores to each other. Your job is to find security problems, fix the safe ones, and ask before the risky ones.

**Audit first, act second.** Run the whole audit and report it before changing anything.

## Know the trust boundaries

Everything the browser can do, an attacker can do by hand with the publishable key:

- **The publishable key and URL are public by design.** RLS policies are the real access control. A table or view without correct RLS is fully exposed.
- **Anonymous phone sessions** are authenticated users (`is_anonymous` claim). They should only be able to claim a pairing and use their paired `controller:{userId}` channel, never write games, frames, lobbies or profiles.
- **Realtime payloads are untrusted.** Any lobby member can broadcast anything on `lobby:{code}`. Throw parameters, pin states and host commands (start, play again, quit) must be validated or ignored if they come from the wrong sender.
- **Rolls are client-written.** The `frames` table accepts rolls from the thrower. The `validate_frame` trigger and `game_player_total()` mirror `src/lib/bowling/scoring.ts`, and `finish_game()` computes totals, so check that the SQL and TypeScript rules still match and that no path lets clients write `final_total`.
- **Auth cookies are readable by page scripts** (the browser Realtime connection needs them), so any XSS means session theft.

## Known non-issues (don't flag as leaks)

The local Supabase stack uses fixed, publicly documented dev values. These are **informational only** when they appear in `.env.local`, docs or `supabase/config.toml`:

- `sb_publishable_ACJW…` and `sb_secret_N7UND…`
- The demo JWTs whose payload has `"iss":"supabase-demo"`
- `super-secret-jwt-token-with-at-least-32-characters-long`
- The `postgres:postgres@127.0.0.1:54322` connection string

They *are* a finding if they show up in production config or deployment settings, or if any other `sb_secret_` or `service_role` key appears anywhere.

## Fan out with sub-agents

Sub-agents **find and report**; you **fix**. Tell every agent: read-only, don't edit files, and **never print a full secret**. Show only the first 6–8 characters followed by `…`. Launch all the agents below in a single message so they run in parallel.

### Step 1: map the tree

List every top-level folder and root file. Cover the whole repo: `src/`, `supabase/`, `public/`, `md/`, `.claude/`, root config files (`next.config.ts`, `package.json`, `.gitignore`, `.env*`), and any CI or infra folders that exist by then. Skip `node_modules/`, `.git/` and `.next/`, except that `.next/static` gets checked for leaked secrets by the frontend agent.

### Step 2: secret sweep (one `Explore` agent per folder group)

Group folders so each agent gets a balanced share. Right now that's about three agents: `src/`; `supabase/` and root config; `md/`, `public/` and `.claude/`. Add more as the repo grows. Each agent searches its files for:

- `sb_secret_`, `service_role`, `SUPABASE_SERVICE_ROLE`, `SUPABASE_SECRET`, `SUPABASE_JWT_SECRET`
- JWTs (`eyJhbGciOi`), `-----BEGIN` private keys, `postgres://` or `postgresql://` URLs with passwords
- Generic tokens: `sk_live_`, `ghp_`, `github_pat_`, `AKIA`, `xox[bp]-`, and anything matching `[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)\s*[:=]\s*["'][^"']{16,}["']`
- An ngrok authtoken, or a hardcoded ngrok or production URL with credentials

Format for reports: `file:line | pattern | redacted value | (verify)` if unsure. Placeholders and the known local dev values above get skipped or marked informational. Report "checked, nothing found" for clean folders.

Also run yourself: `git log -p --all | grep -n -E "sb_secret_|service_role|BEGIN .*PRIVATE KEY|ghp_|sk_live_"` (redact output) to catch secrets in history.

### Step 3: deep checks (one `general-purpose` agent per area)

Give each agent its checklist below, the trust boundaries section above, and the read-only and redaction rules. Tell it to report findings as `file:line | severity | issue | suggested fix`.

**A. Database and RLS** (`supabase/migrations/`)
- Every table in `public` has RLS enabled and has policies for each operation it should allow. Deny should be the default.
- Policies that use `using (true)` or `to authenticated` without excluding `is_anonymous()` where phones shouldn't have access.
- `security definer` functions: must `set search_path = ''`, check `auth.uid()`, and have `execute` revoked from `public` and `anon` where appropriate. Pay special attention to `claim_pairing` and `handle_new_user`.
- Pairing tokens: enough entropy (`gen_random_bytes`), short expiry, single use, can't be claimed twice or by a registered account unexpectedly.
- `can_use_realtime_topic()` and the `realtime.messages` policies: a user can't join or send on another user's `controller:` channel or a lobby they aren't in.
- Views are `security_invoker` (the `leaderboard` view must be).
- Players can't edit `final_total` or `final_rank` at all (only `finish_game()` writes them), or other players' frames, or someone else's lobby or game. Column grants still match what the app writes.

**B. Auth, sessions and rate limits** (`src/components/session/SessionProvider.tsx`, `src/lib/supabase/`, `supabase/config.toml`, auth pages)
- There's no server: the session guard runs in the browser and only decides what to show. Anything it hides must also be enforced by RLS, since anyone can call the API directly.
- No server-only code crept back in (no `src/proxy.ts`, Server Actions or Route Handlers; `npm run build` must still export).
- Auth checks use `getClaims()` or `getUser()`, never trust `getSession()`'s user.
- The 30-day inactivity logout: `last_seen_at` is only written by `touch_last_seen()`, which refuses accounts idle over 30 days, and the guard signs those out.
- `[auth.rate_limit]` in `config.toml` is sensible; enumeration of 7-digit lobby codes and of usernames is rate limited or harmless.
- Password rules and email confirmation settings in `config.toml`. Auth errors don't reveal whether an email or username exists (except for the deliberate username availability check).

**C. Input trust, injection and XSS** (`src/`)
- Frame writes run through `scoreGame`/`frameState`, and RPC inputs are validated in SQL.
- Realtime handlers validate broadcast payloads: throw parameters bounded and finite (no `NaN`/`Infinity` fed into Rapier), host-only commands checked against the lobby's `host_id`, and the pin-state safety check only accepted from the current thrower.
- Supabase filter injection: user input interpolated into `.or()`, `.filter()`, `.textSearch()` or raw RPC SQL strings.
- `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, and user content (usernames) rendered outside React escaping, including Three.js text or sprite labels and `<canvas>` code.
- Open redirects, such as a `?next=` or `redirectTo` taken from the URL without checking it's a relative path.
- Nothing secret is in the build: every env var the site uses is public (`NEXT_PUBLIC_`).

**D. Headers, frontend exposure, dependencies and logging**
- A Content Security Policy (required by md/02). It must allow the Supabase URL and `wss:` for Realtime, and the Rapier WASM (`'wasm-unsafe-eval'`). Plus `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` and HSTS in production. They come from `src/lib/csp.ts`: `next.config.ts` sends them in dev, and `scripts/finish-export.mjs` writes them into `out/.htaccess` for production.
- `Permissions-Policy` still allows the motion sensors and wake lock that `/controller` needs.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are `NEXT_PUBLIC_` (plus `NEXT_PUBLIC_APP_URL` for the dev tunnel). Nothing sensitive is in `out/` or `.next/static` if a build exists.
- `npm audit --omit=dev` with high and critical findings. Note that `@dimforge/rapier3d-deterministic-compat` must stay pinned to an exact version (it's a determinism requirement, not a finding).
- No tokens, pairing tokens, passwords or full request bodies in `console.log`. Errors shown to users don't include stack traces.

## Step 4: merge and triage

Collect all the reports, dedupe them (the same issue can come from a folder agent and an area agent), and discard anything you can't confirm by reading the code yourself. Don't invent problems. If an area has no code yet (for example, no Route Handlers), say "not built yet, nothing to check" so the user knows it was covered.

## Step 5: fix

- **Fix without asking:** `.gitignore` gaps, missing non-CSP security headers in `next.config.ts`, input validation on a route, removing a `console.log` of a token, escaping or rendering fixes for XSS, and redacting a real secret from a working-tree file (the user still has to rotate it).
- **Ask first:** anything that changes RLS or the schema (always as a **new** migration via `npx supabase migration new <name>`, never by editing an applied one), changes to `SessionProvider` or auth flows, CSP changes (they can break Next's scripts, Supabase Realtime or Rapier WASM until tuned), `config.toml` auth settings, and new dependencies such as `zod`. Give the risk in one line.
- **Never do:** rotate keys, rewrite git history, force-push, commit or push (that's `/ship`), change settings on a hosted Supabase project, or run `npm audit fix --force`. Tell the user how to do these themselves.

After fixing, run `npm run lint`, `npm run typecheck` and `npm test`. If you added a migration, run `npm run db:reset` and `npm run db:types` and confirm the reset succeeds.

## Report

Use this structure. Keep one line per finding. Explain in more detail only where the user has to decide something.

```markdown
## 🔒 Security Audit Results

### 🔴 Critical (fix immediately)
- [file:line] Issue: one-line explanation

### 🟡 High / Medium
- [file:line] Issue: one-line explanation

### 🟢 Low / Informational
- ...

### ✅ Fixed
- [file:line] What changed

### ⚠️ Needs your OK
For each: the risk, what the fix does, and what could break.

### 🔧 You need to do
Rotating keys, purging history, and hosted Supabase settings, with exact commands where they help.

### 📋 Checked, nothing found
One line per area and folder group that came back clean.
```
