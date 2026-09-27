import type { Metadata } from "next";
import { Suspense } from "react";
import { SinglePlayerGame } from "@/components/bowling/game/SinglePlayerGame";

export const metadata: Metadata = { title: "Bowling · WhatWiiPlaying" };

export default function BowlingGamePage() {
  // The game reads its settings from the URL in the browser; static export needs Suspense for that.
  return (
    <Suspense>
      <SinglePlayerGame />
    </Suspense>
  );
}
