"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { soundEnded, type SoundName } from "@/lib/sounds";

const VOLUME = 0.5;
const STOP_EVENT = "wwp:stop-menu-music";

/** The sports channels, whose menus share the sports menu music. */
const SPORTS_CHANNELS = ["/bowling"];

/** A sports channel's menus: past its title screen, and not in a game. */
const isSportsMenu = (path: string) =>
  SPORTS_CHANNELS.some((c) => path.startsWith(`${c}/`) && !path.startsWith(`${c}/game`));

interface Track {
  src: string;
  /** Where it loops. */
  playsOn: (path: string) => boolean;
  /** Where it downloads ahead of time, so it's ready the moment it's needed. */
  preloadOn: (path: string) => boolean;
  /** Start from the top each time it comes back, instead of resuming. */
  rewind?: boolean;
  /** Sounds to let finish first, like a channel's startup jingle. */
  after?: SoundName[];
}

const TRACKS: Track[] = [
  {
    src: "/audio/home-menu.mp3",
    playsOn: (path) => path === "/",
    // Preload on the notice too, since continuing from it opens the home menu.
    preloadOn: (path) => path === "/" || path === "/notice",
  },
  {
    // From the game menus until a game starts or the player leaves the channel.
    src: "/audio/sports_menu_music.mp3",
    playsOn: isSportsMenu,
    preloadOn: (path) => path === "/" || isSportsMenu(path),
    rewind: true,
    after: ["bowling-startup"],
  },
];

/**
 * Pauses the menu music right away, e.g. when a channel plays its startup sound
 * or a game starts. It resumes the next time a page with music opens.
 */
export function stopMenuMusic() {
  window.dispatchEvent(new Event(STOP_EVENT));
}

/**
 * Loops the menu music for the current page (the home menu's, or the sports
 * menus') and pauses it elsewhere. Lives in the root layout so the <audio>
 * elements survive page changes.
 *
 * Browsers only allow audio after the player has interacted with the page.
 * Clicking through the boot notice (src/app/notice) counts, so the music starts
 * as soon as the home menu opens. After a hard refresh it starts on the first
 * click or key press instead.
 */
export function MenuMusic() {
  const pathname = usePathname();
  // Static builds use trailing slashes (/bowling/play/).
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return TRACKS.map((track) => <MusicTrack key={track.src} track={track} path={path} />);
}

function MusicTrack({ track, path }: { track: Track; path: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const playing = track.playsOn(path);

  useEffect(() => {
    const pause = () => audio.current?.pause();
    window.addEventListener(STOP_EVENT, pause);
    return () => window.removeEventListener(STOP_EVENT, pause);
  }, []);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    if (!playing) {
      el.pause();
      if (track.rewind) el.currentTime = 0;
      return;
    }

    el.volume = VOLUME;
    let cancelled = false;
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

    Promise.all((track.after ?? []).map(soundEnded)).then(() => {
      if (cancelled) return;
      el.play().catch(() => {
        // Blocked until the player interacts with the page.
        if (!cancelled && el.paused) {
          waiting = true;
          window.addEventListener("pointerdown", startOnGesture);
          window.addEventListener("keydown", startOnGesture);
        }
      });
    });

    return () => {
      cancelled = true;
      stopWaiting();
    };
  }, [playing, track]);

  return (
    <audio ref={audio} src={track.src} loop preload={track.preloadOn(path) ? "auto" : "none"} aria-hidden="true" />
  );
}
