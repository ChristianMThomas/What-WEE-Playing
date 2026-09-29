"use client";

import { useEffect, useState } from "react";
import { useRemote } from "@/components/controller/RemoteProvider";
import { soundsLocked } from "@/lib/sounds";

/** How often to look at whether sound has started. */
const CHECK_MS = 700;

/**
 * Asks for the one click browsers insist on before they will play anything.
 *
 * Only shown when a phone is connected, because that's when it can't be worked
 * out from the app alone: the remote's presses arrive over a websocket, so they
 * never count as the interaction the browser is waiting for, and every menu
 * sound stays silent with nothing on screen to explain why. Once sound starts
 * this never comes back.
 */
export function SoundPrompt() {
  const { connected } = useRemote();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!connected) return;
    const check = () => {
      const still = soundsLocked();
      setLocked(still);
      return still;
    };
    if (!check()) return;
    const timer = setInterval(() => check() || clearInterval(timer), CHECK_MS);
    return () => clearInterval(timer);
  }, [connected]);

  if (!connected || !locked) return null;

  return (
    <p
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto w-fit rounded-full border-2 border-wii-line bg-white/95 px-5 py-2 text-sm font-bold text-wii-ink shadow-[0_4px_16px_rgb(0_0_0/0.18)]"
    >
      Click this screen once to turn sound on.
    </p>
  );
}
