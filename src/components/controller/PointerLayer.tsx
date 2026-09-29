"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pointerAt, smooth, type Aim } from "@/lib/controller/aim";
import { useRemote } from "@/components/controller/RemoteProvider";
import { HOVERABLE } from "@/components/UiSounds";

/** The hand disappears once the phone has been still this long, like pointing away from the TV. */
const IDLE_MS = 3000;
/** Only hit-test again once the hand has moved this far, in pixels. */
const HIT_TEST_PX = 4;
/** Where the fingertip is in the hand's 48×60 drawing, at the size it's shown. */
const HOTSPOT = { x: 20, y: 4 };
/** The least time between buzzes, so sweeping the hand across a menu doesn't flood the phone. */
const RUMBLE_MS = 100;
/**
 * Controls the remote may point at but not press, marked with `data-no-remote`.
 * A paired phone is a separate anonymous session that stays authorized for 12
 * hours, so a pairing code someone else scanned off the screen could otherwise
 * press anything in the app. Losing a turn is recoverable; losing the account
 * isn't, so signing out and the account controls stay on the keyboard and mouse.
 */
const NO_REMOTE = "[data-no-remote]";

/**
 * The Wii Remote pointer (md/11): a hand that follows where the phone points,
 * with A as the click and B as Back.
 *
 * What it points at gets `data-pointed`, which the `hover` variant in
 * globals.css treats like the mouse hovering it, so every screen lights up the
 * way it already does. Hover sounds come from the pointerover event this
 * dispatches, and click sounds from the real click, so UiSounds needs no part
 * of this. While a game holds remote.grab() the hand keeps out of the way and
 * the buttons mean whatever the game says.
 */
export function PointerLayer() {
  const { connected, grabbed, onAim, onButton, rumble } = useRemote();
  const [awake, setAwake] = useState(false);
  const hand = useRef<HTMLDivElement>(null);

  const active = connected && !grabbed;

  // The latest aim from the phone, and where the hand is drawn, which chases it.
  const aim = useRef<Aim>({ yaw: 0, pitch: 0, roll: 0 });
  const at = useRef({ x: 0, y: 0, roll: 0 });
  const tested = useRef({ x: -1, y: -1 });
  /** Whatever is directly under the hand, hoverable or not, as a mouse would see it. */
  const under = useRef<Element | null>(null);
  const pointed = useRef<Element | null>(null);
  const lastAim = useRef(0);
  const rumbledAt = useRef(0);

  /** Moves `data-pointed` onto what the hand is over, and tells the phone about it. */
  const point = useCallback(
    (element: Element | null) => {
      const was = pointed.current;
      if (element === was) return;
      was?.removeAttribute("data-pointed");
      was?.removeAttribute("data-pointed-active");
      pointed.current = element;
      if (!element) return;
      element.setAttribute("data-pointed", "");
      const now = performance.now();
      if (now - rumbledAt.current >= RUMBLE_MS) {
        rumbledAt.current = now;
        rumble();
      }
    },
    [rumble],
  );

  useEffect(() => () => point(null), [point]);

  // Aim messages only set the target; the hand catches up in the frame loop below.
  useEffect(() => {
    if (!active) return;
    return onAim((message) => {
      aim.current = message;
      lastAim.current = performance.now();
      setAwake(true);
    });
  }, [active, onAim]);

  useEffect(() => {
    if (!active || !awake) {
      point(null);
      return;
    }
    let frame = 0;
    let previous = performance.now();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = now - previous;
      previous = now;

      if (now - lastAim.current > IDLE_MS) {
        setAwake(false);
        return;
      }

      const target = pointerAt(aim.current, { width: window.innerWidth, height: window.innerHeight });
      at.current = {
        x: smooth(at.current.x, target.x, dt),
        y: smooth(at.current.y, target.y, dt),
        roll: smooth(at.current.roll, aim.current.roll, dt),
      };
      const { x, y, roll } = at.current;
      if (hand.current) {
        hand.current.style.transform = `translate3d(${x - HOTSPOT.x}px, ${y - HOTSPOT.y}px, 0) rotate(${roll}deg)`;
      }

      // Only look again once the hand has moved, or when what it was over has gone away.
      const moved = Math.hypot(x - tested.current.x, y - tested.current.y) >= HIT_TEST_PX;
      if (!moved && (pointed.current === null || pointed.current.isConnected)) return;
      tested.current = { x, y };

      const hit = document.elementFromPoint(x, y);
      if (hit !== under.current) {
        under.current = hit;
        // A mouse fires this on whatever it is over, empty space included, and
        // UiSounds follows it to know what is hovered. Firing only on the things
        // worth pointing at would leave it believing the hand never left the
        // last one, and the sound wouldn't play when it came back.
        hit?.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
      }
      point(hit?.closest(HOVERABLE) ?? null);
    };

    // Start where the phone is pointing rather than sliding in from the corner.
    at.current = { ...pointerAt(aim.current, { width: window.innerWidth, height: window.innerHeight }), roll: aim.current.roll };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active, awake, point]);

  // A clicks what the hand is over; B goes back, like leaving a Wii menu.
  useEffect(() => {
    if (!active) return;
    return onButton(({ button, pressed }) => {
      if (button === "a") {
        const element = pointed.current;
        if (!pressed) return element?.removeAttribute("data-pointed-active");
        if (!(element instanceof HTMLElement) || element.closest(NO_REMOTE)) return;
        element.setAttribute("data-pointed-active", "");
        // The real activation behaviour: links navigate, forms submit, onClick runs.
        element.click();
      } else if (button === "b" && pressed && window.history.length > 1) {
        window.history.back();
      }
    });
  }, [active, onButton]);

  if (!active) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-100 overflow-hidden">
      <div
        ref={hand}
        style={{ transformOrigin: `${HOTSPOT.x}px ${HOTSPOT.y}px` }}
        className={`absolute top-0 left-0 transition-opacity duration-300 ${awake ? "opacity-100" : "opacity-0"}`}
      >
        <WiiHand />
      </div>
    </div>
  );
}

// Fingers and palm as plain rounded shapes, drawn twice: a fat dark copy
// underneath makes the outline, and the white copy on top hides the seams
// where the shapes overlap.
const HAND = (
  <>
    <rect x="15" y="4" width="10" height="28" rx="5" />
    <rect x="24" y="17" width="9" height="19" rx="4.5" />
    <rect x="31" y="20" width="9" height="17" rx="4.5" />
    <rect x="37" y="24" width="8.5" height="15" rx="4.25" />
    <rect x="2" y="26" width="9.5" height="20" rx="4.75" transform="rotate(-32 6.75 36)" />
    <rect x="11" y="29" width="30" height="25" rx="11" />
  </>
);

/** The Wii's pointing hand. Its fingertip is the hotspot, at HOTSPOT. */
function WiiHand() {
  return (
    <svg width="48" height="60" viewBox="0 0 48 60" className="drop-shadow-[0_3px_5px_rgb(0_0_0/0.35)]">
      <g fill="#3c4147" stroke="#3c4147" strokeWidth="5" strokeLinejoin="round">
        {HAND}
      </g>
      <g fill="#fff">{HAND}</g>
    </svg>
  );
}
