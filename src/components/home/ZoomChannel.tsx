"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { stopMenuMusic } from "@/components/MenuMusic";
import { ChannelGloss, TILE, TILE_HOVER } from "./Channel";

const ZOOM_MS = 550;

/**
 * A playable channel. Clicking it zooms the channel's art from the tile up to
 * full screen, like opening a channel on the Wii, then opens the channel page,
 * which starts on the same art so the hand-off is seamless.
 */
export function ZoomChannel({
  href,
  label,
  zoomArt,
  sound,
  children,
}: {
  href: string;
  label: string;
  /** What fills the screen while zooming; should match the top of the channel page. */
  zoomArt: ReactNode;
  /** A startup sound played on click, e.g. "/audio/bowling-startup.mp3". */
  sound?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [from, setFrom] = useState<DOMRect | null>(null);
  const [expanded, setExpanded] = useState(false);
  const navigated = useRef(false);
  const startup = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  // Load the startup sound ahead of time so it plays the instant the channel is clicked.
  useEffect(() => {
    if (!sound) return;
    const audio = new Audio(sound);
    audio.preload = "auto";
    startup.current = audio;
  }, [sound]);

  useEffect(() => {
    if (!from) return;
    // Paint the overlay at the tile's position first, then grow it, so the transition runs.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setExpanded(true));
    });
    // If transitionend never fires (tab hidden, etc.), navigate anyway.
    const fallback = setTimeout(open, ZOOM_MS + 250);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      clearTimeout(fallback);
    };
    // open only reads refs and props, so it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  function open() {
    if (navigated.current) return;
    navigated.current = true;
    router.push(href);
  }

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Let new-tab and other modified clicks behave like a normal link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (from) return;
    if (startup.current) {
      stopMenuMusic();
      // The click counts as the interaction browsers require, so this isn't blocked. The sound
      // keeps playing after the page changes, since it isn't tied to this component's DOM.
      startup.current.play().catch(() => {});
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return open();
    setFrom(e.currentTarget.getBoundingClientRect());
  }

  return (
    <>
      <Link
        href={href}
        onClick={onClick}
        aria-label={`${label} channel`}
        className={`${TILE} ${TILE_HOVER} block bg-white`}
      >
        {children}
        <ChannelGloss />
      </Link>
      {from &&
        createPortal(
          <div
            aria-hidden="true"
            onTransitionEnd={(e) => e.propertyName === "width" && open()}
            className="fixed z-50 overflow-hidden ease-in-out"
            style={{
              transitionProperty: "top, left, width, height, border-radius",
              transitionDuration: `${ZOOM_MS}ms`,
              ...(expanded
                ? { top: 0, left: 0, width: "100vw", height: "100dvh", borderRadius: 0 }
                : { top: from.top, left: from.left, width: from.width, height: from.height, borderRadius: 14 }),
            }}
          >
            {zoomArt}
          </div>,
          document.body,
        )}
    </>
  );
}
