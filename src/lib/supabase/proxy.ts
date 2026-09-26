import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import { SEEN_CHECK_INTERVAL_S, SEEN_COOKIE, signSeen, verifySeen } from "./seen-cookie";

// Signs the wwp-seen cookie, which lets most requests skip the database. Without
// it, activity is checked on every request.
const SEEN_SECRET = process.env.SESSION_COOKIE_SECRET;

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
  const nowS = Math.floor(Date.now() / 1000);
  if (SEEN_SECRET && (await verifySeen(SEEN_SECRET, request.cookies.get(SEEN_COOKIE)?.value, claims.sub, nowS))) {
    return { response, claims };
  }

  // Records activity, but only if the account was active within the last 30 days
  // (md/02-authentication-and-sessions.md). The limit lives in touch_last_seen().
  const { data: active, error } = await supabase.rpc("touch_last_seen");

  // Never log someone out over a failed query; the next request retries.
  if (error) return { response, claims };

  if (!active) {
    await supabase.auth.signOut();
    response.cookies.delete(SEEN_COOKIE);
    return { response, claims: null };
  }

  if (!SEEN_SECRET) return { response, claims };
  response.cookies.set(SEEN_COOKIE, await signSeen(SEEN_SECRET, claims.sub, nowS), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: SEEN_CHECK_INTERVAL_S,
  });
  return { response, claims };
}
