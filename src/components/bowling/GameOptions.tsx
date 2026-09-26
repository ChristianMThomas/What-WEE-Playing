"use client";

import { useState } from "react";
import type { FrameCount, ScoringMode } from "@/lib/bowling/scoring";

const LENGTHS: { value: FrameCount; label: string; detail: string }[] = [
  { value: 5, label: "Swift Play", detail: "5 frames" },
  { value: 10, label: "Standard", detail: "10 frames" },
];

const SCORING: { value: ScoringMode; label: string; detail: string }[] = [
  { value: "standard", label: "Standard", detail: "Strikes & spares carry over" },
  { value: "basic", label: "Basic", detail: "Just pins per frame" },
];

/**
 * The two game settings (md/05): length and scoring, chosen independently.
 * Design pass: the choice lives in component state until games are created.
 */
export function GameOptions({ compact = false, disabled = false }: { compact?: boolean; disabled?: boolean }) {
  const [frameCount, setFrameCount] = useState<FrameCount>(10);
  const [scoring, setScoring] = useState<ScoringMode>("standard");

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
