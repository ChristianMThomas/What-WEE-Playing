// NEXT_PUBLIC_ vars must be read with literal property access so Next inlines them in client bundles.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See README → Getting started.",
  );
}

export const SUPABASE_URL = url;
export const SUPABASE_PUBLISHABLE_KEY = publishableKey;

/**
 * Options for the Supabase auth cookies, shared by every client. @supabase/ssr
 * doesn't mark them Secure, so production does, keeping the session off any
 * plain-http request. Development stays on http://localhost.
 */
export const AUTH_COOKIE_OPTIONS = { secure: process.env.NODE_ENV === "production" };
