"use client";

import { useEffect } from "react";
import { isSoundName, playSound, preloadSounds, unlockSounds } from "@/lib/sounds";

/** What counts as clickable. */
const CLICKABLE =
  'a[href], button, [role="button"], summary, input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"]';

/** Clickable things plus anything marked `data-hoverable`, like the channels that aren't playable yet. */
const HOVERABLE = `${CLICKABLE}, [data-hoverable]`;

/**
 * Menu sound effects for the whole app. Lives in the root layout and listens at
 * the window, so pages choose sounds with data attributes instead of handlers:
 *
 * - `data-sound="settings"` on an element or an ancestor picks what a click plays
 *   (default "home-click"). `data-sound="none"` keeps it silent, e.g. when a
 *   component plays its own sound.
 * - `data-hover-sound="home-hover"` on an element or an ancestor plays when the
 *   mouse moves onto it, or keyboard focus lands on it. Nothing plays by default.
 *
 * Sound names are the keys in src/lib/sounds.ts.
 */
export function UiSounds() {
  useEffect(() => {
    preloadSounds();
    let hovered: Element | null = null;

    function play(el: Element, attribute: "data-sound" | "data-hover-sound", fallback?: string) {
      const name = el.closest(`[${attribute}]`)?.getAttribute(attribute) ?? fallback;
      if (name && isSoundName(name)) playSound(name);
    }

    function onClick(e: MouseEvent) {
      const el = e.target instanceof Element ? e.target.closest(CLICKABLE) : null;
      if (el) play(el, "data-sound", "home-click");
    }

    function onPointerOver(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const el = e.target instanceof Element ? e.target.closest(HOVERABLE) : null;
      // Moving between parts of the same button shouldn't replay the sound.
      if (el === hovered) return;
      hovered = el;
      if (el) play(el, "data-hover-sound");
    }

    function onFocusIn(e: FocusEvent) {
      if (e.target instanceof Element && e.target.matches(":focus-visible")) play(e.target, "data-hover-sound");
    }

    // Capture phase, so these still fire when a handler stops propagation or navigates away.
    window.addEventListener("pointerdown", unlockSounds, true);
    window.addEventListener("keydown", unlockSounds, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("pointerover", onPointerOver, true);
    window.addEventListener("focusin", onFocusIn, true);
    return () => {
      window.removeEventListener("pointerdown", unlockSounds, true);
      window.removeEventListener("keydown", unlockSounds, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("pointerover", onPointerOver, true);
      window.removeEventListener("focusin", onFocusIn, true);
    };
  }, []);

  return null;
}
