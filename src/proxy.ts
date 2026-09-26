import { NextResponse, type NextRequest } from "next/server";
import { NOTICE_COOKIE } from "@/lib/notice";
import { contentSecurityPolicy } from "@/lib/csp";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { updateSession } from "@/lib/supabase/proxy";

// Pages for signed-out visitors; signed-in players get sent home.
const AUTH_PAGES = ["/login", "/register"];
// Phones open the controller with an anonymous session, so it isn't behind login.
const PUBLIC_PREFIXES = ["/controller"];

export async function proxy(request: NextRequest) {
  // Next reads the nonce from the request's CSP header and adds it to its scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, SUPABASE_URL, process.env.NODE_ENV === "development");
  request.headers.set("Content-Security-Policy", csp);

  const { response, claims } = withCsp(await updateSession(request), csp);
  const { pathname, search } = request.nextUrl;
  const hasAccount = claims !== null && !claims.is_anonymous;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (AUTH_PAGES.includes(pathname)) {
    return hasAccount ? redirect(request, response, "/") : response;
  }
  if (!hasAccount && !isPublic) {
    return redirect(request, response, "/login");
  }

  // Signed-in players see the boot notice once per browser session, like the Wii at
  // power-on (login and register also send them there directly). Clicking through it
  // is what lets the home menu music start. Only page visits are redirected; form
  // posts and API calls pass through.
  if (
    hasAccount &&
    request.method === "GET" &&
    pathname !== "/notice" &&
    !pathname.startsWith("/api/") &&
    !request.cookies.has(NOTICE_COOKIE)
  ) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirect(request, response, `/notice${next}`);
  }
  return response;
}

function withCsp<T extends { response: NextResponse }>(result: T, csp: string): T {
  result.response.headers.set("Content-Security-Policy", csp);
  return result;
}

// Keeps any session cookies updateSession set (refreshes, inactivity logout) on the redirect.
function redirect(request: NextRequest, from: NextResponse, to: string) {
  const response = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) response.cookies.set(cookie);
  const cacheControl = from.headers.get("Cache-Control");
  if (cacheControl) response.headers.set("Cache-Control", cacheControl);
  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images and audio.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|ogg|wav)$).*)",
  ],
};
