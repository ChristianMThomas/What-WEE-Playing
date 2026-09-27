import type { FrameCount, GameConfig, ScoringMode } from "./scoring";

// Game settings travel in the URL (?frames=5&scoring=standard) from the setup
// screens to the game page until games are stored in the database.

export function gameConfigToSearch({ frameCount, scoringMode }: GameConfig): string {
  return new URLSearchParams({ frames: String(frameCount), scoring: scoringMode }).toString();
}

/** Reads the settings back, falling back to Swift Play with standard scoring for anything unknown. */
export function gameConfigFromSearch(params: Record<string, string | string[] | undefined>): GameConfig {
  const frames = Number(params.frames);
  const scoring = params.scoring;
  return {
    frameCount: (frames === 10 ? 10 : 5) satisfies FrameCount,
    scoringMode: (scoring === "basic" ? "basic" : "standard") satisfies ScoringMode,
  };
}
