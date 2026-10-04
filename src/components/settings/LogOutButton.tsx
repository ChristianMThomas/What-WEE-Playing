"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogOutButton({ iconClassName }: { iconClassName: string }) {
  const router = useRouter();
  return (
    // Not pressable by a paired phone: see NO_REMOTE in PointerLayer.
    <button
      type="button"
      data-no-remote
      className="wii-pill"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
      }}
    >
      <LogOut aria-hidden="true" className={iconClassName} />
      Log Out
    </button>
  );
}
