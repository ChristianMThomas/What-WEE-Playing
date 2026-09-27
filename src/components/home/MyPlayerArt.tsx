"use client";

import { useProfile } from "@/components/session/SessionProvider";
import { PlayerArt } from "./ChannelArt";

/** The My Player channel's art, showing the signed-in player. */
export function MyPlayerArt() {
  const me = useProfile();
  return <PlayerArt look={me.look} username={me.username} />;
}
