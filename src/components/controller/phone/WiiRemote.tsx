"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Button, ThrowParams } from "@/lib/controller/protocol";
import { computeThrow, type MotionSample } from "@/lib/controller/throw";

// Motion kept while B is held; a swing is well under this.
const BUFFER_MS = 3000;

type Feedback = { kind: "sent"; params: ThrowParams } | { kind: "soft" } | { kind: "no-motion" } | null;

/** Keeps the screen on while the remote is showing; re-requested when the page comes back. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, []);
}

/**
 * The phone as a Wii Remote (md/06): d-pad at the top, A below it, the B
 * trigger under A, then Home. Every button reports down and up to the desktop,
 * and the game on screen decides what they do. B is also the swing: hold it,
 * swing, and let go, and the motion in between becomes the throw.
 */
export function WiiRemote({
  online,
  onButton,
  onThrow,
}: {
  online: boolean;
  onButton: (button: Button, pressed: boolean) => void;
  onThrow: (params: ThrowParams) => void;
}) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [swinging, setSwinging] = useState(false);
  const samples = useRef<MotionSample[]>([]);
  const recording = useRef(false);
  useWakeLock();

  useEffect(() => {
    const record = (e: DeviceMotionEvent) => {
      if (!recording.current) return;
      const r = e.rotationRate;
      const g = e.accelerationIncludingGravity;
      const t = e.timeStamp;
      samples.current.push({
        t,
        alpha: r?.alpha ?? 0,
        beta: r?.beta ?? 0,
        gamma: r?.gamma ?? 0,
        gx: g?.x ?? 0,
        gy: g?.y ?? 0,
        gz: g?.z ?? 0,
      });
      while (samples.current.length > 0 && samples.current[0].t < t - BUFFER_MS) samples.current.shift();
    };
    window.addEventListener("devicemotion", record);
    return () => window.removeEventListener("devicemotion", record);
  }, []);

  function trigger(pressed: boolean) {
    if (pressed) {
      samples.current = [];
      recording.current = true;
      setSwinging(true);
      onButton("b", true);
      return;
    }
    recording.current = false;
    setSwinging(false);
    const result = computeThrow(samples.current);
    if (result.ok) {
      onThrow(result.params);
      setFeedback({ kind: "sent", params: result.params });
    } else {
      setFeedback({ kind: result.reason === "too-soft" ? "soft" : "no-motion" });
    }
    onButton("b", false);
  }

  const press = (button: Button) => (pressed: boolean) => onButton(button, pressed);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
      {/* Sized off the screen height, so the whole remote fits and nothing scrolls mid-swing. */}
      <div className="relative flex min-h-0 w-[min(84vw,20rem)] flex-1 flex-col items-center rounded-[4.5rem] border border-[#d9dee2] bg-gradient-to-b from-white via-[#fbfbfc] to-[#eceff1] px-6 pt-[5dvh] pb-[2.5dvh] shadow-[0_18px_40px_rgb(0_0_0/0.18),inset_0_-6px_12px_rgb(0_0_0/0.05)]">
        <DPad onPress={press} />

        <HoldButton
          label="A button"
          onChange={press("a")}
          className="mt-[3dvh] size-[clamp(4.5rem,12dvh,6rem)] shrink-0 rounded-full border border-[#cfd4da] bg-gradient-to-b from-white to-[#e6e8ee] text-4xl font-black text-[#8d93a5] shadow-[0_6px_0_#c9ced6,0_10px_18px_rgb(0_0_0/0.15)]"
          pressedClassName="translate-y-1 !shadow-[0_2px_0_#c9ced6,0_0_22px_#7fc8ff] !text-[#4aaee0]"
        >
          A
        </HoldButton>

        <HoldButton
          label="B trigger: hold it, swing, and let go to bowl"
          onChange={trigger}
          className="mt-[3dvh] flex h-[clamp(4.75rem,13dvh,7rem)] w-44 shrink-0 flex-col items-center justify-center rounded-t-[2rem] rounded-b-[3.5rem] border border-[#c9d0d8] bg-gradient-to-b from-[#f4f6f8] to-[#d6dce2] text-5xl font-black text-[#8d93a5] shadow-[0_7px_0_#b9c1ca,0_12px_22px_rgb(0_0_0/0.18)]"
          pressedClassName="translate-y-1.5 !from-[#4aaee0] !to-[#1576c2] !text-white !shadow-[0_2px_0_#0f5b96,0_0_26px_#7fc8ff]"
        >
          B
          <span className="text-[0.7rem] font-extrabold tracking-[0.2em] opacity-70">TRIGGER</span>
        </HoldButton>

        <div className="mt-[3dvh] flex flex-col items-center gap-1">
          <HoldButton
            label="Home button"
            onChange={press("home")}
            className="flex size-[clamp(2.75rem,7dvh,3.5rem)] shrink-0 items-center justify-center rounded-full border border-[#cfd4da] bg-gradient-to-b from-white to-[#e4e7eb] text-[#4aaee0] shadow-[0_4px_0_#c9ced6,0_6px_12px_rgb(0_0_0/0.12)]"
            pressedClassName="translate-y-1 !shadow-[0_1px_0_#c9ced6,0_0_18px_#7fc8ff]"
          >
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
              <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor" />
            </svg>
          </HoldButton>
          <span className="text-[0.65rem] font-extrabold tracking-[0.2em] text-[#9aa1ad]">HOME</span>
        </div>

        {/* Speaker grille, on screens tall enough for it. */}
        <div aria-hidden="true" className="mt-auto grid grid-cols-5 gap-1.5 pt-4 [@media(max-height:760px)]:hidden">
          {Array.from({ length: 15 }, (_, i) => (
            <span key={i} className="size-1.5 rounded-full bg-[#c4cad1]" />
          ))}
        </div>

        {/* Player lights: the first one is lit while the screen is connected. */}
        <div className="mt-auto flex gap-3 pt-4" role="img" aria-label={online ? "Connected" : "Not connected"}>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full ${i === 0 && online ? "bg-[#3fb1ff] shadow-[0_0_8px_#3fb1ff]" : "bg-[#cdd3d9]"}`}
            />
          ))}
        </div>
        <p aria-hidden="true" className="mt-1 text-xl font-black tracking-tight text-[#b4bac3]">
          Wii
        </p>
      </div>

      <p role="status" className="min-h-6 text-center text-sm font-semibold text-[#555]">
        {!online
          ? "Reconnecting to your screen…"
          : swinging
            ? "Swing!"
            : feedback?.kind === "sent"
              ? `Bowled! ${feedback.params.speed} m/s · spin ${feedback.params.spin}`
              : feedback?.kind === "soft"
                ? "Swing harder, then let go of B."
                : feedback?.kind === "no-motion"
                  ? "No motion data. Check that this site has motion access."
                  : "Hold B, swing, and let go to bowl."}
      </p>
    </div>
  );
}

/**
 * A button that reports going down and coming back up. Pointer capture keeps
 * the release on this button even if the thumb slides off it mid-swing.
 */
function HoldButton({
  label,
  onChange,
  className,
  pressedClassName,
  children,
}: {
  label: string;
  onChange: (pressed: boolean) => void;
  className: string;
  pressedClassName: string;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const down = useRef(false);

  function start(e: PointerEvent<HTMLButtonElement>) {
    if (down.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    down.current = true;
    setPressed(true);
    navigator.vibrate?.(12);
    onChange(true);
  }

  function end() {
    if (!down.current) return;
    down.current = false;
    setPressed(false);
    onChange(false);
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      data-sound="none"
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-none select-none transition-[transform,box-shadow,color] duration-75 [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent] ${className} ${pressed ? pressedClassName : ""}`}
    >
      {children}
    </button>
  );
}

const ARROWS: { button: Button; label: string; area: string; rotate: string }[] = [
  { button: "up", label: "Up", area: "col-start-2 row-start-1 rounded-t-lg", rotate: "rotate-0" },
  { button: "left", label: "Left", area: "col-start-1 row-start-2 rounded-l-lg", rotate: "-rotate-90" },
  { button: "right", label: "Right", area: "col-start-3 row-start-2 rounded-r-lg", rotate: "rotate-90" },
  { button: "down", label: "Down", area: "col-start-2 row-start-3 rounded-b-lg", rotate: "rotate-180" },
];

/** The + shaped d-pad. Each arm is its own button, so a held arrow keeps moving. */
function DPad({ onPress }: { onPress: (button: Button) => (pressed: boolean) => void }) {
  return (
    <div className="grid size-[clamp(7rem,20dvh,10rem)] shrink-0 grid-cols-3 grid-rows-3 drop-shadow-[0_5px_0_#c3c9d0]">
      {ARROWS.map(({ button, label, area, rotate }) => (
        <HoldButton
          key={button}
          label={label}
          onChange={onPress(button)}
          className={`${area} flex items-center justify-center bg-gradient-to-b from-[#fafbfc] to-[#dfe3e8] text-[#8d93a5]`}
          pressedClassName="!from-[#d4e9f8] !to-[#a9d4f2] !text-[#1576c2]"
        >
          <svg viewBox="0 0 12 12" className={`size-4 ${rotate}`} aria-hidden="true">
            <path d="M6 2 11 9H1z" fill="currentColor" />
          </svg>
        </HoldButton>
      ))}
      <span aria-hidden="true" className="col-start-2 row-start-2 bg-[#e3e7eb]">
        <span className="m-auto mt-[calc(50%-0.625rem)] block size-5 rounded-full bg-[#d3d8de]" />
      </span>
    </div>
  );
}
