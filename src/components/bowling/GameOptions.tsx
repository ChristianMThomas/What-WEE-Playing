"use client";

import { useState } from "react";
import type { FrameCount, GameConfig, ScoringMode } from "@/lib/bowling/scoring";

const LENGTHS: { value: FrameCount; label: string; detail: string }[] = [
  { value: 5, label: "Swift Play", detail: "5 frames" },
  { value: 10, label: "Standard", detail: "10 frames" },
];

const SCORING: { value: ScoringMode; label: string; detail: string }[] = [
  { value: "standard", label: "Standard", detail: "Strikes & spares carry over" },
  { value: "basic", label: "Basic", detail: "Just pins per frame" },
];

export const DEFAULT_GAME_CONFIG: GameConfig = { frameCount: 10, scoringMode: "standard" };

/**
 * The two game settings (md/05): length and scoring, chosen independently.
 * Pass value and onChange to read the choice; without them it keeps its own state.
 */
export function GameOptions({
  compact = false,
  disabled = false,
  value,
  onChange,
}: {
  compact?: boolean;
  disabled?: boolean;
  value?: GameConfig;
  onChange?: (config: GameConfig) => void;
}) {
  const [own, setOwn] = useState(DEFAULT_GAME_CONFIG);
  const config = value ?? own;
  const set = (change: Partial<GameConfig>) => {
    const next = { ...config, ...change };
    setOwn(next);
    onChange?.(next);
  };
  const { frameCount, scoringMode: scoring } = config;
  const setFrameCount = (frameCount: FrameCount) => set({ frameCount });
  const setScoring = (scoringMode: ScoringMode) => set({ scoringMode });

  return (
    <div className={`flex flex-col ${compact ? "gap-4" : "gap-6"}`}>
      <OptionGroup label="Length" options={LENGTHS} value={frameCount} onChange={setFrameCount} compact={compact} disabled={disabled} />
      <OptionGroup label="Scoring" options={SCORING} value={scoring} onChange={setScoring} compact={compact} disabled={disabled} />
    </div>
  );
}

function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  compact,
  disabled,
}: {
  label: string;
  options: { value: T; label: string; detail: string }[];
  value: T;
  onChange: (value: T) => void;
  compact: boolean;
  disabled: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-lg font-bold text-white sm:text-xl">{label}</legend>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`bowl-choice px-3 ${compact ? "h-20" : "h-24 sm:h-28"}`}
          >
            <span className={`font-extrabold ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>{option.label}</span>
            <span className="text-sm font-semibold text-[#4a5a64] sm:text-base">{option.detail}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
