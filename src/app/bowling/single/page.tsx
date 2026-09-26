import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { BowlingPanel, BowlingScreen } from "@/components/bowling/BowlingScreen";
import { GameOptions } from "@/components/bowling/GameOptions";
import { getCurrentProfile } from "@/lib/profile";
import type { AvatarLook } from "@/lib/avatar";

export const metadata: Metadata = { title: "Single Player · WhatWiPlaying" };

// The bot's look is fixed so it's recognizable from game to game.
const BOT_LOOK: AvatarLook = { skinTone: "porcelain", hairstyle: "spiky", hairColor: "gray", outfit: "blue-jersey" };

// Design pass: Start does nothing until the game itself exists.
export default async function SinglePlayerPage() {
  const me = await getCurrentProfile();

  return (
    <BowlingScreen
      title="Single Player"
      backHref="/bowling/play"
      footerRight={
        <button type="button" className="wii-pill h-14 w-48 sm:h-16 sm:w-64" aria-disabled="true" title="Coming soon">
          Start
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <BowlingPanel title="Choose your game.">
          <GameOptions />
        </BowlingPanel>

        <BowlingPanel title="Matchup">
          <div className="flex flex-1 items-center justify-center gap-2 text-white">
            <figure className="flex flex-col items-center gap-2">
              <Avatar look={me.look} size={96} title={`${me.username}'s avatar`} />
              <figcaption className="max-w-[8rem] truncate text-lg font-bold">{me.username}</figcaption>
            </figure>
            <span className="px-2 text-3xl font-black italic text-[#f7941d]">VS</span>
            <figure className="flex flex-col items-center gap-2">
              <Avatar look={BOT_LOOK} size={96} title="Bot's avatar" />
              <figcaption className="text-lg font-bold">Bot</figcaption>
            </figure>
          </div>
          <p className="mt-4 text-center text-sm text-white/75 sm:text-base">
            The bot bowls at random for now. It&apos;ll get competitive later.
          </p>
        </BowlingPanel>
      </div>
    </BowlingScreen>
  );
}
