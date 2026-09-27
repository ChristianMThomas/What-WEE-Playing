import type { Metadata } from "next";
import Link from "next/link";
import { WiiBowlingLogo } from "@/components/bowling/WiiBowlingLogo";
import { BowlingArt } from "@/components/home/ChannelArt";

export const metadata: Metadata = { title: "Wii Bowling · WhatWiiPlaying" };

// The game's title screen. The home menu's Bowling channel zooms up to fill the
// screen with the same art, so it reads as one continuous motion.
export default function BowlingTitlePage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#173a6b]">
      <div className="absolute inset-0">
        <BowlingArt showTitle={false} />
      </div>

      <div className="title-rise relative flex flex-1 flex-col justify-center pt-[6vh]">
        <div className="bg-white/80 py-5 text-center backdrop-blur-sm sm:py-8">
          <h1>
            <WiiBowlingLogo className="text-6xl sm:text-8xl lg:text-9xl" />
          </h1>
        </div>
        {/* Orange and blue stripes, like the Wii Sports title screen. */}
        <div className="h-3 bg-[#f7941d] sm:h-4" />
        <div className="h-2 bg-white/80" />
        <div className="h-3 bg-[#4aaee0] sm:h-4" />
      </div>

      <nav
        aria-label="Title screen"
        className="title-rise relative grid grid-cols-2 gap-4 border-t-4 border-[#b9b9b9] bg-[repeating-linear-gradient(to_bottom,#e9e9e9_0_3px,#f5f5f5_3px_6px)] px-[6%] py-6 sm:gap-16 sm:px-[14%] sm:py-10"
      >
        {/* Silent: the home menu plays the zoom-out sound as it shrinks back into the tile. */}
        <Link href="/" data-sound="none" className="wii-pill">
          Wii Menu
        </Link>
        <Link href="/bowling/play" className="wii-pill">
          Start
        </Link>
      </nav>
    </div>
  );
}
