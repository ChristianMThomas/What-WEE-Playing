"use client";

import { Copy, Crown, Smartphone, User } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BowlingPanel, BowlingScreen } from "@/components/bowling/BowlingScreen";
import { GameOptions } from "@/components/bowling/GameOptions";
import { useProfile } from "@/components/session/SessionProvider";

const MAX_PLAYERS = 4;
// Design pass: a sample code. Real lobbies get a unique 7-digit code from the lobbies table.
const SAMPLE_CODE = "4829175";

export function LobbyScreen() {
  const me = useProfile();
  const players = [{ username: me.username, look: me.look, isHost: true, phonePaired: false }];

  return (
    <BowlingScreen
      title="Lobby"
      backHref="/bowling/multiplayer"
      backLabel="Leave"
      footerRight={
        <button type="button" className="wii-pill h-14 w-52 sm:h-16 sm:w-72" aria-disabled="true" title="Coming soon">
          Start Game
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <BowlingPanel
          title={
            <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              Lobby code
              <span className="font-mono tracking-[0.2em] text-[#8fdcf7]">
                {SAMPLE_CODE.slice(0, 3)} {SAMPLE_CODE.slice(3)}
              </span>
              <button
                type="button"
                className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                aria-label="Copy lobby code"
                title="Copy code"
              >
                <Copy aria-hidden="true" className="size-6" />
              </button>
            </span>
          }
        >
          <p className="mb-4 text-center text-base text-white/80 sm:text-lg">
            Share the code with friends. Waiting for players to join…
          </p>
          <ul className="grid flex-1 grid-cols-2 gap-4 sm:gap-6">
            {Array.from({ length: MAX_PLAYERS }, (_, i) => {
              const player = players[i];
              return (
                <li key={i}>
                  {player ? (
                    <div className="bowl-choice h-full min-h-44 gap-1 py-4 sm:min-h-56">
                      {player.isHost && (
                        <span className="absolute top-2 left-3 flex items-center gap-1 rounded-full bg-[#f7941d] px-2 py-0.5 text-xs font-extrabold text-white sm:text-sm">
                          <Crown aria-hidden="true" className="size-3.5" /> Host
                        </span>
                      )}
                      <span
                        className="absolute top-2 right-3 flex items-center gap-1 text-xs font-bold text-[#4a5a64] sm:text-sm"
                        title={player.phonePaired ? "Phone paired" : "Phone not paired"}
                      >
                        <Smartphone aria-hidden="true" className="size-4" />
                        <span className={`size-2.5 rounded-full ${player.phonePaired ? "bg-emerald-500" : "bg-[#9a9a9a]"}`} />
                        <span className="sr-only">{player.phonePaired ? "Phone paired" : "Phone not paired"}</span>
                      </span>
                      <Avatar look={player.look} size={80} title={`${player.username}'s avatar`} />
                      <span className="max-w-full truncate px-2 text-xl font-extrabold sm:text-2xl">{player.username}</span>
                      <span className="text-sm font-semibold text-[#4a5a64]">Player {i + 1}</span>
                    </div>
                  ) : (
                    <div className="flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-white/35 text-white/60 sm:min-h-56">
                      <User aria-hidden="true" className="size-10 animate-pulse motion-reduce:animate-none" />
                      <span className="text-lg font-bold">Waiting for player…</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </BowlingPanel>

        <BowlingPanel title="Game Settings">
          <GameOptions compact />
          <p className="mt-4 text-center text-sm text-white/75">Only the host can change these.</p>
        </BowlingPanel>
      </div>
    </BowlingScreen>
  );
}
