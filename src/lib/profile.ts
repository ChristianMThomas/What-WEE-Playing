import { redirect } from "next/navigation";
import { avatarFromProfile } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in player's profile for server-rendered pages. Sends anyone
 * without an account to /login (the proxy normally does this first).
 */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims || claims.is_anonymous) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, skin_tone, hairstyle, hair_color, outfit")
    .eq("id", claims.sub)
    .single();
  if (!profile) redirect("/login");

  return { id: profile.id, username: profile.username, look: avatarFromProfile(profile) };
}
