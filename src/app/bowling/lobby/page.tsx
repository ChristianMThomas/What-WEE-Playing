import type { Metadata } from "next";
import { LobbyScreen } from "@/components/bowling/LobbyScreen";

export const metadata: Metadata = { title: "Lobby · WhatWiiPlaying" };

export default function LobbyPage() {
  return <LobbyScreen />;
}
