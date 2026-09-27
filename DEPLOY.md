# Deploying WhatWiiPlaying

Production is two services:

- **Hostinger** serves the site at `whatwiiplaying.com` as plain static files. Any Hostinger web hosting plan works; no Node.js needed.
- **Supabase (hosted)** is the backend: Auth, Postgres and Realtime, the same as local development.

`npm run build` turns the app into a folder of static files, `out/`, and you upload that folder. There's no server of ours running anywhere: sign-in, the page guards and the 30-day inactivity logout run in the browser (`src/components/session/SessionProvider.tsx`), and the data is protected by Supabase's row-level security, which doesn't depend on the website at all.

## 1. Hosted Supabase project (once)

1. Create a project at [supabase.com](https://supabase.com/dashboard) (the free tier is fine). Save the database password somewhere safe.
2. Push the schema from this repo:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>     # the id in the project's URL
   npx supabase db push                               # applies supabase/migrations
   ```
3. In the Supabase dashboard:
   - **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**. Phones pair with anonymous sessions.
   - **Authentication → Sign In / Providers → Email**: keep **Confirm email** on. With it off, signup tells anyone whether an email already has an account. Supabase's built-in mailer only sends a couple of emails an hour, so add your own SMTP (**Authentication → Emails → SMTP Settings**) before inviting people. Also turn on **Secure password change**.
   - **Authentication → Policies** (or **Sign In / Providers → Email**): set the minimum password length to **8** and require lowercase, uppercase, digits and symbols. The app and `supabase/config.toml` assume this, but a hosted project starts at 6 characters with no rules.
   - **Authentication → URL Configuration**: Site URL `https://whatwiiplaying.com`.
4. **Project Settings → API**: copy the project URL and the **publishable** key. Never put the secret key in this app: everything in the build is public.

A free Supabase project pauses after a week without activity; open the dashboard to wake it up.

## 2. Build the site

1. Create `.env.production.local` in the repo root (it's gitignored). It overrides `.env.local`, which points at your local Supabase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
2. Build and pack it:
   ```bash
   npm run build      # writes out/, including out/.htaccess with the security headers
   npm run package    # packs out/ into whatwiiplaying-site.tar.gz
   ```
   If the build prints **"This build uses the LOCAL Supabase"**, step 1 didn't take; don't upload that one.

## 3. Upload to Hostinger

1. In hPanel, open **Websites → whatwiiplaying.com → File Manager** and go into `public_html`.
2. The first time, delete what Hostinger put there (e.g. `default.php`).
3. Upload `whatwiiplaying-site.tar.gz`, then right-click it → **Extract** into `public_html` itself (not a subfolder), and delete the archive. (If Extract isn't offered, zip the contents of `out/` yourself instead: select everything inside it, including `.htaccess`, and compress.) `public_html` should now hold `index.html`, `.htaccess`, `_next/`, `bowling/` and so on.
4. **Security → SSL**: make sure the free SSL certificate is active, and turn on **Force HTTPS**. The phone needs HTTPS for motion data and the camera.

To update the site later: build and package again, delete the old files in `public_html` (keeping nothing but what you upload), and upload and extract the new archive.

## 4. Try it

1. Open `https://whatwiiplaying.com`, create an account (confirm it from the email), and open **Bowling**.
2. Start a Single Player game and press **Pair your phone to bowl**. Scan the code with your phone's camera.
3. On the phone, tap **Start** and allow motion access. The remote's first light turns blue once it's connected.
4. Arrows move you, A switches to turning, and hold B, swing, and let go to bowl. Home opens the menu.

## If something's wrong

- **Blank or unstyled pages:** the archive was extracted into a subfolder. Everything, including `_next/`, has to sit directly in `public_html`.
- **Login fails, or the remote never connects:** the build used the wrong Supabase URL or key (rebuild with step 2), or the Supabase project is paused.
- **The phone says the code expired:** codes last 5 minutes and work once. Press Pair again for a new one.
- **Check the security headers:** `curl -I https://whatwiiplaying.com` should list `content-security-policy`. If it doesn't, `.htaccess` is missing from `public_html` (some tools hide files starting with a dot).
