"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Login and signup live in client-auth.ts; see the note there.

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
