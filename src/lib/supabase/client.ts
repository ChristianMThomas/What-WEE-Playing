import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { AUTH_COOKIE_OPTIONS, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Supabase client for Client Components. The session comes from the auth cookies. */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
