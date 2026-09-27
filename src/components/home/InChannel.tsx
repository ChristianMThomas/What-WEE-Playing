"use client";

import { useEffect } from "react";

// The channel the player is in, so the home menu knows which tile to zoom back
// out to. Module state, so it survives client-side navigation but not a reload.
let current: string | null = null;

/** Whether the player just came back from this channel. */
export function isReturningFrom(href: string) {
  return current === href;
}

export function clearChannel() {
  current = null;
}

/**
 * Rendered in a channel's layout. Marks the player as inside the channel, so
 * going back to the home menu, by the Wii Menu button or the browser's Back,
 * zooms out to its tile.
 */
export function InChannel({ href }: { href: string }) {
  useEffect(() => {
    current = href;
  }, [href]);
  return null;
}
