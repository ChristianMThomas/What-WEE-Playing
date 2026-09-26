import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// Accounts inactive this long are signed out (md/02-authentication-and-sessions.md).
const INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000;

// Holds the user id whose activity was recorded within the last hour, so most
// requests skip the database. Forging it only delays the user's own logout.
const SEEN_COOKIE = "wwp-seen";
const SEEN_CHECK_INTERVAL_S = 60 * 60;

/**
 * Refreshes the Supabase session cookies and enforces the 30-day inactivity
 * logout. Returns the response the proxy should send on, and the signed-in
 * user's claims (null when signed out, including by the inactivity rule).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Update the request too, so pages rendered for this request see the new session.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Verifies the JWT and refreshes an expired session. Nothing may run between
  // creating the client and this call, or users get randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Phone controllers use anonymous sessions with no profile; the rule applies to accounts.
  if (!claims || claims.is_anonymous) return { response, claims: claims ?? null };
  if (request.cookies.get(SEEN_COOKIE)?.value === claims.sub) return { response, claims };

  // One round trip: record activity, but only if the user was active within the limit.
  const cutoff = new Date(Date.now() - INACTIVITY_LIMIT_MS).toISOString();
  const { data: active, error } = await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", claims.sub)
    .gt("last_seen_at", cutoff)
    .select("id");

  // Never log someone out over a failed query; the next request retries.
  if (error) return { response, claims };

  if (active.length === 0) {
    await supabase.auth.signOut();
    response.cookies.delete(SEEN_COOKIE);
    return { response, claims: null };
  }

  response.cookies.set(SEEN_COOKIE, claims.sub, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SEEN_CHECK_INTERVAL_S,
  });
  return { response, claims };
}
