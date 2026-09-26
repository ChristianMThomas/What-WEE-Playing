import type { Metadata } from "next";
import { Channel, EmptyChannel } from "@/components/home/Channel";
import { BowlingArt, JustDanceArt, LeaderboardsArt, PlayerArt } from "@/components/home/ChannelArt";
import { HomeBar } from "@/components/home/HomeBar";
import { ZoomChannel } from "@/components/home/ZoomChannel";
import { getCurrentProfile } from "@/lib/profile";

export const metadata: Metadata = { title: "WhatWiPlaying" };

// The home menu shows 12 channel slots, like one page of the Wii menu.
const SLOTS = 12;
const PHONE_SLOTS = 6;

// Wii-style channel menu (md/03-home-page-and-navigation.md). Bowling is
// playable; the others are static until their games exist.
export default async function Home() {
  const me = await getCurrentProfile();

  const channels = [
    <ZoomChannel
      key="bowling"
      href="/bowling"
      label="Bowling"
      zoomArt={<BowlingArt showTitle={false} />}
      sound="/audio/bowling-startup.mp3"
    >
      <BowlingArt />
    </ZoomChannel>,
    <Channel key="just-dance" label="Just Dance">
      <JustDanceArt />
    </Channel>,
    <Channel key="player" label="My Player">
      <PlayerArt look={me.look} username={me.username} />
    </Channel>,
    <Channel key="leaderboards" label="Leaderboards">
      <LeaderboardsArt />
    </Channel>,
  ];

  return (
    <main className="flex min-h-dvh flex-col">
      <h1 className="sr-only">Channels</h1>
      <section className="flex flex-1 items-center justify-center px-4 py-6 sm:px-10 sm:py-8">
        {/* On wider screens, cap the width by the screen height so all three rows
            and the bottom bar fit without scrolling, like the Wii. Three rows of
            16:10 tiles in four columns are about 2.1× as wide as they are tall;
            16rem is the bar plus padding. */}
        <div className="grid w-full max-w-6xl grid-cols-2 gap-3 sm:max-w-[min(72rem,calc((100dvh-16rem)*2.1))] sm:grid-cols-4 sm:gap-4">
          {channels}
          {Array.from({ length: SLOTS - channels.length }, (_, i) => (
            // Phones get 6 slots (3 rows of 2) to keep scrolling short.
            <EmptyChannel key={i} className={i >= PHONE_SLOTS - channels.length ? "hidden sm:block" : ""} />
          ))}
        </div>
      </section>
      <HomeBar />
    </main>
  );
}
