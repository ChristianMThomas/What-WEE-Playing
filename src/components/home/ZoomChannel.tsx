"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { stopMenuMusic } from "@/components/MenuMusic";
import { playSound, type SoundName } from "@/lib/sounds";
import { ChannelGloss, TILE, TILE_HOVER } from "./Channel";

const ZOOM_MS = 550;

interface Zoom {
  /** The tile's position on screen. */
  tile: DOMRect;
  /** Whether the art currently fills the screen. */
  full: boolean;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A playable channel. Clicking it zooms the channel's art from the tile up to
 * full screen, like opening a channel on the Wii, then opens the channel page,
 * which starts on the same art so the hand-off is seamless. Leaving the channel
 * goes back through a black screen instead (see InChannel).
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
  /** The channel's startup sound, played as its page opens. */
  sound?: SoundName;
  children: ReactNode;
}) {
  const router = useRouter();
  const navigated = useRef(false);
  const [zoom, setZoom] = useState<Zoom | null>(null);

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  useEffect(() => {
    if (!zoom || zoom.full) return;
    // Paint the overlay over the tile first, then grow it, so the transition runs.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setZoom((z) => z && { ...z, full: true }));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [zoom]);

  // If transitionend never fires (tab hidden, etc.), open anyway.
  const zooming = zoom !== null;
  useEffect(() => {
    if (!zooming) return;
    const fallback = setTimeout(open, ZOOM_MS + 250);
    return () => clearTimeout(fallback);
    // open only reads refs, props and the router, so it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zooming]);

  function open() {
    if (navigated.current) return;
    navigated.current = true;
    // Web Audio keeps playing after the page changes.
    if (sound) playSound(sound);
    router.push(href);
  }

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Let new-tab and other modified clicks behave like a normal link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (zoom) return;
    stopMenuMusic();
    playSound("zoom-in-game");
    if (reducedMotion()) return open();
    setZoom({ tile: e.currentTarget.getBoundingClientRect(), full: false });
  }

  return (
    <>
      <Link
        href={href}
        onClick={onClick}
        aria-label={`${label} channel`}
        data-sound="none"
        className={`${TILE} ${TILE_HOVER} block bg-white`}
      >
        {children}
        <ChannelGloss />
      </Link>
      {zoom &&
        createPortal(
          <div
            aria-hidden="true"
            onTransitionEnd={(e) => e.propertyName === "width" && open()}
            className="fixed z-50 overflow-hidden ease-in-out"
            style={{
              transitionProperty: "top, left, width, height, border-radius",
              transitionDuration: `${ZOOM_MS}ms`,
              ...(zoom.full
                ? { top: 0, left: 0, width: "100vw", height: "100dvh", borderRadius: 0 }
                : { top: zoom.tile.top, left: zoom.tile.left, width: zoom.tile.width, height: zoom.tile.height, borderRadius: 14 }),
            }}
          >
            {zoomArt}
          </div>,
          document.body,
        )}
    </>
  );
}
