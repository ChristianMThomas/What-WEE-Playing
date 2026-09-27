import type { Metadata } from "next";
import { Users } from "lucide-react";
import { BowlingPanel, BowlingScreen } from "@/components/bowling/BowlingScreen";

export const metadata: Metadata = { title: "Join Lobby · WhatWiiPlaying" };

// Design pass: sample lobbies. The real list comes from open rows in the lobbies table.
const SAMPLE_LOBBIES = [
  { code: "5310284", host: "StrikeQueen", players: 2, length: "Standard", scoring: "Standard" },
  { code: "7740192", host: "gutterball_greg", players: 1, length: "Swift Play", scoring: "Basic" },
  { code: "1029384", host: "PinPal_42", players: 3, length: "Swift Play", scoring: "Standard" },
];

export default function JoinLobbyPage() {
  return (
    <BowlingScreen title="Join Lobby" backHref="/bowling/multiplayer">
      <div className="grid gap-6 lg:grid-cols-[26rem_1fr]">
        <BowlingPanel title="Enter a code.">
          <form className="flex flex-1 flex-col justify-center gap-5">
            <label htmlFor="lobby-code" className="text-center text-base text-white/80 sm:text-lg">
              Ask the host for their 7-digit lobby code.
            </label>
            <input
              id="lobby-code"
              name="code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={7}
              pattern="[0-9]{7}"
              placeholder="0000000"
              className="h-20 w-full rounded-2xl border-[3px] border-white bg-white text-center font-mono text-4xl font-bold tracking-[0.35em] text-[#222] placeholder:text-[#c5ccd1] focus:shadow-[0_0_0_4px_rgb(143_220_247/0.8)] focus:outline-none sm:text-5xl"
            />
            <button type="button" className="bowl-choice h-16 text-2xl font-extrabold sm:h-20 sm:text-3xl" aria-disabled="true" title="Coming soon">
              Join
            </button>
          </form>
        </BowlingPanel>

        <BowlingPanel title="Open lobbies">
          <ul className="flex flex-col gap-3 sm:gap-4">
            {SAMPLE_LOBBIES.map((lobby) => (
              <li key={lobby.code}>
                <button
                  type="button"
                  className="bowl-choice w-full flex-row justify-between gap-4 px-5 py-4 text-left sm:px-6"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  <span className="flex min-w-0 flex-col items-start">
                    <span className="max-w-full truncate text-xl font-extrabold sm:text-2xl">{lobby.host}&apos;s lobby</span>
                    <span className="text-sm font-semibold text-[#4a5a64] sm:text-base">
                      {lobby.length} · {lobby.scoring} scoring
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-lg font-bold text-[#1576c2] sm:text-xl">
                    <Users aria-hidden="true" className="size-5" />
                    {lobby.players}/4
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-sm text-white/75 sm:text-base">Sample lobbies for now. Real ones show up here live.</p>
        </BowlingPanel>
      </div>
    </BowlingScreen>
  );
}
