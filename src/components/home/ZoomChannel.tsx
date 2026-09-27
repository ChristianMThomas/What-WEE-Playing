"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { stopMenuMusic } from "@/components/MenuMusic";
import { playSound, type SoundName } from "@/lib/sounds";
import { ChannelGloss, TILE, TILE_HOVER } from "./Channel";
import { clearChannel, isReturningFrom } from "./InChannel";

const ZOOM_MS = 550;

interface Zoom {
  direction: "in" | "out";
  /** The tile's position on screen; unknown until measured when zooming out. */
  tile: DOMRect | null;
  /** Whether the art currently fills the screen. */
  full: boolean;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A playable channel. Clicking it zooms the channel's art from the tile up to
 * full screen, like opening a channel on the Wii, then opens the channel page,
 * which starts on the same art so the hand-off is seamless. Coming back from the
 * channel (see InChannel) does the reverse: the art starts full screen and
 * shrinks back into the tile.
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
  const link = useRef<HTMLAnchorElement>(null);
  const navigated = useRef(false);
  // Start full screen when coming back from this channel, so the home menu never shows without it.
  const [zoom, setZoom] = useState<Zoom | null>(() =>
    typeof window !== "undefined" && isReturningFrom(href) && !reducedMotion()
      ? { direction: "out", tile: null, full: true }
      : null,
  );

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  useEffect(() => {
    if (!isReturningFrom(href)) return;
    clearChannel();
    playSound("zoom-out-game");
  }, [href]);

  useEffect(() => {
    if (!zoom || zoom.full === (zoom.direction === "in")) return;
    // Paint the overlay where the zoom starts first, then move it, so the transition runs.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() =>
        setZoom((z) =>
          z?.direction === "in"
            ? { ...z, full: true }
            : z && { ...z, tile: link.current?.getBoundingClientRect() ?? null, full: false },
        ),
      );
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [zoom]);

  // If transitionend never fires (tab hidden, etc.), finish anyway.
  const direction = zoom?.direction;
  useEffect(() => {
    if (!direction) return;
    const fallback = setTimeout(finish, ZOOM_MS + 250);
    return () => clearTimeout(fallback);
    // finish only reads refs, props and the setter, so it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  function finish() {
    if (direction === "out") return setZoom(null);
    open();
  }

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
    if (zoom?.direction === "in") return;
    stopMenuMusic();
    playSound("zoom-in-game");
    if (reducedMotion()) return open();
    setZoom({ direction: "in", tile: e.currentTarget.getBoundingClientRect(), full: false });
  }

  const tile = zoom?.tile;
  return (
    <>
      <Link
        ref={link}
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
            onTransitionEnd={(e) => e.propertyName === "width" && finish()}
            className="fixed z-50 overflow-hidden ease-in-out"
            style={{
              transitionProperty: "top, left, width, height, border-radius",
              transitionDuration: `${ZOOM_MS}ms`,
              ...(zoom.full || !tile
                ? { top: 0, left: 0, width: "100vw", height: "100dvh", borderRadius: 0 }
                : { top: tile.top, left: tile.left, width: tile.width, height: tile.height, borderRadius: 14 }),
            }}
          >
            {zoomArt}
          </div>,
          document.body,
        )}
    </>
  );
}
