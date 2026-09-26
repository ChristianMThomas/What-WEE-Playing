"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOTICE_COOKIE, safeNext } from "@/lib/notice";

export async function acknowledgeNotice(form: FormData) {
  const cookieStore = await cookies();
  // No maxAge: a session cookie, so the notice shows again next time the browser opens.
  cookieStore.set(NOTICE_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(safeNext(form.get("next")));
}
