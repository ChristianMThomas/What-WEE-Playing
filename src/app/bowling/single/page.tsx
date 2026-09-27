import type { Metadata } from "next";
import { SinglePlayerSetup } from "@/components/bowling/SinglePlayerSetup";

export const metadata: Metadata = { title: "Single Player · WhatWiiPlaying" };

export default function SinglePlayerPage() {
  return <SinglePlayerSetup />;
}
