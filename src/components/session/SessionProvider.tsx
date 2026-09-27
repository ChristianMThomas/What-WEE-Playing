"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { avatarFromProfile, type AvatarLook } from "@/lib/avatar";
import { noticeSeen } from "@/lib/notice";
import { createClient } from "@/lib/supabase/client";

// The site is static files (DEPLOY.md), so there's no server to check who's
// signed in. This does in the browser what a server would: it loads the
// session, sends signed-out visitors to /login and signed-in ones away from
// it, shows the boot notice once per browser session, and enforces the 30-day
// inactivity logout (md/02-authentication-and-sessions.md).
//
// It only decides what to show. The data stays protected by Supabase's RLS
// either way, since anyone can call the API with the public key.

export interface Profile {
  id: string;
  username: string;
  look: AvatarLook;
}

type Session = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; profile: Profile };

// Pages for signed-out visitors; signed-in players get sent home.
const AUTH_PAGES = ["/login", "/register"];
// Phones open the controller with their own anonymous session, so it's outside all of this.
const PUBLIC_PREFIXES = ["/controller"];
/** How often to record activity, and check the 30-day rule. */
const SEEN_INTERVAL_MS = 60 * 60 * 1000;
const SEEN_KEY = "wwp-seen";

const ProfileContext = createContext<Profile | null>(null);

/** The signed-in player. Only for pages behind the session guard, where there always is one. */
export function useProfile(): Profile {
  const profile = useContext(ProfileContext);
  if (!profile) throw new Error("useProfile must be used on a signed-in page");
  return profile;
}

const withoutSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

async function loadSession(): Promise<Session> {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.is_anonymous) return { status: "signed-out" };

  // Records activity, but only if the account was active within the last 30
  // days; the limit lives in touch_last_seen(). Checked at most once an hour.
  let seen: { user?: string; at?: number } = {};
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {}
  if (seen.user !== claims.sub || !seen.at || Date.now() - seen.at > SEEN_INTERVAL_MS) {
    const { data: active, error } = await supabase.rpc("touch_last_seen");
    // Never log someone out over a failed request; the next page load retries.
    if (!error && !active) {
      await supabase.auth.signOut();
      return { status: "signed-out" };
    }
    if (!error) {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify({ user: claims.sub, at: Date.now() }));
      } catch {}
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, skin_tone, hairstyle, hair_color, outfit")
    .eq("id", claims.sub)
    .single();
  if (!profile) return { status: "signed-out" };
  return { status: "signed-in", profile: { id: profile.id, username: profile.username, look: avatarFromProfile(profile) } };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = withoutSlash(usePathname());
  const [session, setSession] = useState<Session>({ status: "loading" });

  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthPage = AUTH_PAGES.includes(path);

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    const refresh = () => loadSession().then((s) => !cancelled && setSession(s));
    refresh();
    // Signing in or out in this tab (or another) re-checks.
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") refresh();
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [isPublic]);

  // Where this visitor should be instead, if anywhere.
  let redirect: string | null = null;
  if (!isPublic && session.status === "signed-out" && !isAuthPage) redirect = "/login";
  if (!isPublic && session.status === "signed-in") {
    if (isAuthPage) redirect = "/";
    else if (path !== "/notice" && !noticeSeen()) {
      const here = path + window.location.search;
      redirect = path === "/" ? "/notice" : `/notice?next=${encodeURIComponent(here)}`;
    }
  }

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  if (isPublic) return children;
  if (session.status === "loading" || redirect) return <div className="min-h-dvh bg-black" aria-busy="true" />;
  if (session.status === "signed-out") return children; // an auth page
  return <ProfileContext.Provider value={session.profile}>{children}</ProfileContext.Provider>;
}
