"use client";

import { useSearchParams } from "next/navigation";
import { useProfile } from "@/components/session/SessionProvider";
import { BOT_LOOK, BOT_NAME } from "@/lib/bowling/bot";
import { gameConfigFromSearch } from "@/lib/bowling/gameConfig";
import { BowlingGame } from "./BowlingGame";

/** Single player against the bot, with the settings from the Single Player screen's URL. */
export function SinglePlayerGame() {
  const me = useProfile();
  const params = useSearchParams();
  return (
    <BowlingGame
      me={{ username: me.username, look: me.look }}
      bot={{ username: BOT_NAME, look: BOT_LOOK }}
      config={gameConfigFromSearch(Object.fromEntries(params))}
    />
  );
}
