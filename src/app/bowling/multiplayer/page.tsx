import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, Plus } from "lucide-react";
import { BowlingPanel, BowlingScreen } from "@/components/bowling/BowlingScreen";
import { PhoneRemotePanel } from "@/components/bowling/PhoneRemotePanel";

export const metadata: Metadata = { title: "Multiplayer · WhatWiiPlaying" };

const OPTIONS = [
  { href: "/bowling/lobby", label: "Create Lobby", detail: "Get a code to share with friends", Icon: Plus },
  { href: "/bowling/join", label: "Join Lobby", detail: "Enter a code or browse open lobbies", Icon: LogIn },
];

export default function MultiplayerPage() {
  return (
    <BowlingScreen title="Multiplayer" backHref="/bowling/play">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <BowlingPanel title="Create or join a lobby.">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 sm:gap-6">
            {OPTIONS.map(({ href, label, detail, Icon }) => (
              <Link key={href} href={href} className="bowl-choice min-h-40 gap-2 px-4 py-6 sm:min-h-64">
                <Icon aria-hidden="true" strokeWidth={1.75} className="size-12 text-[#1576c2] sm:size-16" />
                <span className="text-3xl font-extrabold sm:text-5xl">{label}</span>
                <span className="text-base font-semibold text-[#4a5a64] sm:text-xl">{detail}</span>
              </Link>
            ))}
          </div>
        </BowlingPanel>
        <PhoneRemotePanel />
      </div>
    </BowlingScreen>
  );
}
