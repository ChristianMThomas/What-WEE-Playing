import Link from "next/link";
import { Settings } from "lucide-react";
import { Clock } from "./Clock";

const ROUND_BUTTON =
  "flex size-16 items-center justify-center rounded-full border-[3px] border-[#c3c8cd] bg-gradient-to-b from-white to-[#e6e9ec] shadow-[inset_0_0_0_3px_#fff,0_2px_6px_rgb(0_0_0/0.12)] transition sm:size-20 hover:border-wii-blue hover:shadow-[inset_0_0_0_3px_#fff,0_0_0_4px_rgb(52_191_237/0.35)]";

// The bar's top edge: raised at both corners around the round buttons, dipping in between.
const EDGE = "M0 10 C 90 10 120 52 220 52 L780 52 C 880 52 910 10 1000 10";

/** The Wii-style bar along the bottom of the home menu. */
export function HomeBar() {
  return (
    <footer className="relative h-40 shrink-0 sm:h-48">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 192"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="home-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f6f7" />
            <stop offset="1" stopColor="#d6dade" />
          </linearGradient>
        </defs>
        <path d={`${EDGE} L1000 192 L0 192Z`} fill="url(#home-bar)" />
        <path d={EDGE} fill="none" stroke="#34bfed" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="relative flex h-full items-end justify-between px-4 pb-5 sm:px-8 sm:pb-6">
        <Link href="/settings" data-sound="settings" className={ROUND_BUTTON} aria-label="Settings" title="Settings">
          <Settings aria-hidden="true" strokeWidth={2.25} className="size-8 text-[#8a8f94] sm:size-9" />
        </Link>

        {/* Spans the full width to center the clock, so it must let clicks through to the buttons below it. */}
        <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center sm:top-[34%]">
          <Clock />
        </div>

        <button
          type="button"
          className={`${ROUND_BUTTON} cursor-default`}
          aria-label="Messages (coming soon)"
          title="Messages · coming soon"
        >
          <svg viewBox="0 0 32 24" className="w-8 sm:w-9" aria-hidden="true">
            <rect x="1.5" y="1.5" width="29" height="21" rx="3" fill="#ffffff" stroke="#8a8f94" strokeWidth="2.5" />
            <path d="M3 4 L16 14 L29 4" fill="none" stroke="#8a8f94" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </footer>
  );
}
