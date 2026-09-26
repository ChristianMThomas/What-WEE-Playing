"use client";

import { useState } from "react";
import { SettingsScreen } from "@/components/settings/SettingsScreen";

interface Setting {
  id: string;
  label: string;
  /** Choices in the order a click cycles through them; the first is the default. */
  options: string[];
}

// Four per page, like the Wii's System Settings.
const PAGES: Setting[][] = [
  [
    { id: "screenShake", label: "Screen Shake", options: ["On", "Off"] },
    { id: "brightFlashes", label: "Bright Flashes", options: ["On", "Reduced"] },
    { id: "reduceMotion", label: "Reduce Motion", options: ["Off", "On"] },
    { id: "highContrast", label: "High Contrast", options: ["Off", "On"] },
  ],
  [
    { id: "textSize", label: "Text Size", options: ["Normal", "Large", "Extra Large"] },
    { id: "soundEffects", label: "Sound Effects", options: ["High", "Medium", "Low", "Off"] },
    { id: "music", label: "Music", options: ["High", "Medium", "Low", "Off"] },
    { id: "vibration", label: "Phone Vibration", options: ["On", "Off"] },
  ],
];

// Design pass: choices live in component state only. Saving them comes next.
export function SystemSettings() {
  const [page, setPage] = useState(0);
  const [choices, setChoices] = useState<Record<string, number>>({});

  const cycle = (setting: Setting) =>
    setChoices((c) => ({ ...c, [setting.id]: ((c[setting.id] ?? 0) + 1) % setting.options.length }));

  const pageButtons = (
    <nav aria-label="Pages" className="flex gap-3">
      {PAGES.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => setPage(i)}
          aria-current={i === page ? "page" : undefined}
          aria-label={`Page ${i + 1}`}
          className={`size-12 rounded-lg border-2 text-3xl font-bold transition sm:size-14 ${
            i === page
              ? "border-white bg-white text-[#1c1c1c]"
              : "border-[#5e5e5e] bg-gradient-to-b from-[#9a9a9a] to-[#6e6e6e] text-[#2a2a2a] hover:border-wii-blue"
          }`}
        >
          {i + 1}
        </button>
      ))}
    </nav>
  );

  return (
    <SettingsScreen title={`System Settings ${page + 1}`} backHref="/settings" footerRight={pageButtons}>
      <div className="mx-auto flex max-w-5xl items-center gap-4 sm:gap-8">
        <PageArrow direction="previous" hidden={page === 0} onClick={() => setPage(page - 1)} />
        {/* Keyed by page so each page plays the open animation. */}
        <ul key={page} className="wii-enter flex flex-1 flex-col gap-5 sm:gap-7">
          {PAGES[page].map((setting) => {
            const value = setting.options[choices[setting.id] ?? 0];
            return (
              <li key={setting.id}>
                <button type="button" className="wii-pill" onClick={() => cycle(setting)}>
                  {setting.label}
                  <span
                    className={`absolute right-6 rounded-full px-4 py-1 text-base font-extrabold text-white sm:right-8 sm:text-lg ${
                      value === "Off" ? "bg-[#9a9a9a]" : "bg-wii-blue"
                    }`}
                  >
                    {value}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <PageArrow direction="next" hidden={page === PAGES.length - 1} onClick={() => setPage(page + 1)} />
      </div>
    </SettingsScreen>
  );
}

/** The Wii's blue triangle for flipping pages. Keeps its space when hidden so the list doesn't shift. */
function PageArrow({
  direction,
  hidden,
  onClick,
}: {
  direction: "previous" | "next";
  hidden: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "next" ? "Next page" : "Previous page"}
      className={`shrink-0 transition hover:scale-110 hover:drop-shadow-[0_0_10px_rgb(52_191_237/0.9)] ${hidden ? "invisible" : ""}`}
    >
      <svg viewBox="0 0 24 32" className={`w-8 sm:w-10 ${direction === "previous" ? "-scale-x-100" : ""}`} aria-hidden="true">
        <defs>
          <linearGradient id={`arrow-${direction}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fe0ff" />
            <stop offset="1" stopColor="#1a9ccc" />
          </linearGradient>
        </defs>
        <path d="M3 2 L22 16 L3 30 Q7 16 3 2Z" fill={`url(#arrow-${direction})`} />
      </svg>
    </button>
  );
}
