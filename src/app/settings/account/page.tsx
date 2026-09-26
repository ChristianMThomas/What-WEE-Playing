import type { Metadata } from "next";
import { LogOut, Trash2, UserPen } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export const metadata: Metadata = { title: "Account Management · WhatWiPlaying" };

const icon = "absolute left-8 size-8 text-[#8a8a8a] sm:left-10 sm:size-9";

// Design pass: Log out works; the other two get wired up next.
export default function AccountPage() {
  return (
    <SettingsScreen title="Account Management" backHref="/settings">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-8">
        <form action={logout}>
          <button type="submit" className="wii-pill">
            <LogOut aria-hidden="true" className={icon} />
            Log Out
          </button>
        </form>
        <button type="button" className="wii-pill" aria-disabled="true" title="Coming soon">
          <UserPen aria-hidden="true" className={icon} />
          Change Account Info
        </button>
        <button type="button" className="wii-pill text-[#b3261e]" aria-disabled="true" title="Coming soon">
          <Trash2 aria-hidden="true" className={`${icon} text-[#d9534f]`} />
          Delete Account
        </button>
      </div>
    </SettingsScreen>
  );
}
