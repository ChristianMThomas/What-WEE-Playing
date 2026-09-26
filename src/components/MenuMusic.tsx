"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const TRACK = "/audio/home-menu.mp3";
const VOLUME = 0.5;
const STOP_EVENT = "wwp:stop-menu-music";

/**
 * Pauses the menu music right away, e.g. when a channel plays its startup sound.
 * It resumes the next time the home menu opens.
 */
export function stopMenuMusic() {
  window.dispatchEvent(new Event(STOP_EVENT));
}

/**
 * Loops the home menu music while on the home menu and pauses elsewhere.
 * Lives in the root layout so the same <audio> survives page changes and
 * resumes where it left off.
 *
 * Browsers only allow audio after the player has interacted with the page.
 * Clicking through the boot notice (src/app/notice) counts, so the music starts
 * as soon as the home menu opens. After a hard refresh it starts on the first
 * click or key press instead.
 */
export function MenuMusic() {
  const pathname = usePathname();
  const audio = useRef<HTMLAudioElement>(null);
  const onHomeMenu = pathname === "/";

  useEffect(() => {
    const pause = () => audio.current?.pause();
    window.addEventListener(STOP_EVENT, pause);
    return () => window.removeEventListener(STOP_EVENT, pause);
  }, []);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    if (!onHomeMenu) {
      el.pause();
      return;
    }

    el.volume = VOLUME;
    let waiting = false;
    const startOnGesture = () => {
      stopWaiting();
      el.play().catch(() => {});
    };
    const stopWaiting = () => {
      if (!waiting) return;
      waiting = false;
      window.removeEventListener("pointerdown", startOnGesture);
      window.removeEventListener("keydown", startOnGesture);
    };

    el.play().catch(() => {
      // Blocked until the player interacts with the page.
      if (el.paused) {
        waiting = true;
        window.addEventListener("pointerdown", startOnGesture);
        window.addEventListener("keydown", startOnGesture);
      }
    });

    return stopWaiting;
  }, [onHomeMenu]);

  // Preload on the notice too, so the music is ready the moment the player continues.
  return (
    <audio
      ref={audio}
      src={TRACK}
      loop
      preload={onHomeMenu || pathname === "/notice" ? "auto" : "none"}
      aria-hidden="true"
    />
  );
}
