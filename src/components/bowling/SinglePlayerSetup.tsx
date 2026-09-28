"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { stopMenuMusic } from "@/components/MenuMusic";
import { useProfile } from "@/components/session/SessionProvider";
import { BOT_LOOK, BOT_NAME } from "@/lib/bowling/bot";
import { gameConfigToSearch } from "@/lib/bowling/gameConfig";
import type { GameConfig } from "@/lib/bowling/scoring";
import { BowlingPanel, BowlingScreen } from "./BowlingScreen";
import { DEFAULT_GAME_CONFIG, GameOptions } from "./GameOptions";

const FADE_MS = 450;

/**
 * The Single Player screen. Start fades to black, then opens the game page,
 * which loads the 3D scene behind the same black screen.
 */
export function SinglePlayerSetup() {
  const { username, look } = useProfile();
  const router = useRouter();
  const [config, setConfig] = useState<GameConfig>(DEFAULT_GAME_CONFIG);
  const [starting, setStarting] = useState(false);
  const href = `/bowling/game?${gameConfigToSearch(config)}`;

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  useEffect(() => {
    if (!starting) return;
    const timer = setTimeout(() => router.push(href), FADE_MS);
    return () => clearTimeout(timer);
  }, [starting, router, href]);

  return (
    <>
      <BowlingScreen
        title="Single Player"
        backHref="/bowling/play"
        footerRight={
          <button
            type="button"
            className="wii-pill h-14 w-48 sm:h-16 sm:w-64"
            disabled={starting}
            data-sound="sports-ready"
            onClick={() => {
              stopMenuMusic();
              setStarting(true);
            }}
          >
            Start
          </button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <BowlingPanel title="Choose your game.">
            <GameOptions value={config} onChange={setConfig} disabled={starting} />
          </BowlingPanel>

          <BowlingPanel title="Matchup">
            <div className="flex flex-1 items-center justify-center gap-2 text-white">
              <figure className="flex flex-col items-center gap-2">
                <Avatar look={look} size={96} title={`${username}'s avatar`} />
                <figcaption className="max-w-[8rem] truncate text-lg font-bold">{username}</figcaption>
              </figure>
              <span className="px-2 text-3xl font-black italic text-[#f7941d]">VS</span>
              <figure className="flex flex-col items-center gap-2">
                <Avatar look={BOT_LOOK} size={96} title="Bot's avatar" />
                <figcaption className="text-lg font-bold">{BOT_NAME}</figcaption>
              </figure>
            </div>
            <p className="mt-4 text-center text-sm text-white/75 sm:text-base">
              The bot bowls at random for now. It&apos;ll get competitive later.
            </p>
          </BowlingPanel>
        </div>
      </BowlingScreen>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-50 bg-black transition-opacity ease-in ${starting ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      />
    </>
  );
}
