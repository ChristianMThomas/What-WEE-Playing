// NEXT_PUBLIC_ vars must be read with literal property access so Next inlines them in client bundles.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See README → Getting started.",
  );
}

// Without the trailing slash, so it can be compared against and joined onto.
// A local URL written with one would otherwise look remote to the checks that
// route a phone through the /supabase rewrite (controller.ts, next.config.ts).
export const SUPABASE_URL = url.replace(/\/+$/, "");
export const SUPABASE_PUBLISHABLE_KEY = publishableKey;

/**
 * Options for the Supabase auth cookies, shared by every client. @supabase/ssr
 * doesn't mark them Secure, so production does, keeping the session off any
 * plain-http request. Development stays on http://localhost.
 */
export const AUTH_COOKIE_OPTIONS = { secure: process.env.NODE_ENV === "production" };

/**
 * How many Realtime messages a second a client may broadcast. The default is
 * 10, which isn't enough for the pointer: the phone streams where it points at
 * POINTER_HZ (src/components/controller/phone/WiiRemote.tsx).
 */
export const REALTIME_EVENTS_PER_SECOND = 40;
