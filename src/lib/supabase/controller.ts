import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// A local Supabase stack (http://127.0.0.1) is only reachable from this machine,
// so a phone uses the same stack through this site's /supabase rewrite (next.config.ts).
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;

let client: SupabaseClient<Database> | null = null;

/**
 * Supabase client for the phone controller (/controller). The phone signs in
 * anonymously and keeps that session in localStorage: nothing server-side
 * needs it, and it stays separate from a desktop's cookie session.
 */
export function createControllerClient() {
  if (client) return client;
  const url = LOCAL.test(SUPABASE_URL) ? `${window.location.origin}/supabase` : SUPABASE_URL;
  client = createSupabaseClient<Database>(url, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "wwp-controller-auth" },
  });
  return client;
}
