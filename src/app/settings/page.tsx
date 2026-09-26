import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, UserCog, type LucideIcon } from "lucide-react";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

export const metadata: Metadata = { title: "Settings · WhatWiPlaying" };

const SECTIONS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/settings/account", label: "Account Management", Icon: UserCog },
  { href: "/settings/system", label: "System Settings", Icon: SlidersHorizontal },
];

export default function SettingsPage() {
  return (
    <SettingsScreen title="Settings" backHref="/">
      <nav aria-label="Settings" className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 sm:gap-16">
        {SECTIONS.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="wii-tile aspect-[5/4]">
            <span className="flex flex-1 items-center justify-center">
              <Icon aria-hidden="true" strokeWidth={1.5} className="size-2/5 text-[#7a7a7a]" />
            </span>
            <span className="border-t-2 border-[#d0d0d0] py-4 text-center text-2xl font-semibold sm:py-6 sm:text-3xl">
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </SettingsScreen>
  );
}
