// Bowling scoring (md/05-game-modes-and-scoring.md). Only rolls are stored, so
// every score shown anywhere comes from scoreGame(). Frame count and scoring
// mode are independent: the last frame is always config.frameCount.

export type ScoringMode = "standard" | "basic";
export type FrameCount = 5 | 10;

export interface GameConfig {
  frameCount: FrameCount;
  scoringMode: ScoringMode;
}

export const PINS = 10;

export type FrameState =
  | { complete: true }
  | { complete: false; pinsStanding: number };

export interface ScoredFrame {
  rolls: readonly number[];
  /** Points for this frame, or null until it and any bonus rolls it needs have been bowled. */
  score: number | null;
  /** Total through this frame, or null while this or an earlier frame is unsettled. */
  runningTotal: number | null;
}

export interface Scorecard {
  /** Always frameCount entries; frames not yet bowled have no rolls. */
  frames: ScoredFrame[];
  /** Running total through the last settled frame. */
  total: number;
  isComplete: boolean;
}

export class InvalidRollsError extends Error {
  override name = "InvalidRollsError";
}

// Only the last frame under standard scoring gets 10th-frame bonus rolls.
// Under basic scoring it stays a normal 2-roll frame.
function isBonusFrame(frameNumber: number, config: GameConfig): boolean {
  return frameNumber === config.frameCount && config.scoringMode === "standard";
}

function isFrameDone(rolls: readonly number[], bonusFrame: boolean): boolean {
  if (bonusFrame) {
    return rolls.length === 3 || (rolls.length === 2 && rolls[0] + rolls[1] < PINS);
  }
  return rolls.length === 2 || (rolls.length === 1 && rolls[0] === PINS);
}

const sum = (rolls: readonly number[]) => rolls.reduce((a, b) => a + b, 0);

/**
 * Whether a frame is finished and, if not, how many pins the next roll faces.
 * Throws InvalidRollsError for impossible rolls.
 */
export function frameState(
  rolls: readonly number[],
  frameNumber: number,
  config: GameConfig,
): FrameState {
  if (!Number.isInteger(frameNumber) || frameNumber < 1 || frameNumber > config.frameCount) {
    throw new InvalidRollsError(`Frame ${frameNumber} is outside 1–${config.frameCount}`);
  }
  const bonusFrame = isBonusFrame(frameNumber, config);

  let standing = PINS;
  for (const [i, pins] of rolls.entries()) {
    if (i > 0 && isFrameDone(rolls.slice(0, i), bonusFrame)) {
      throw new InvalidRollsError(`Frame ${frameNumber} has too many rolls`);
    }
    if (!Number.isInteger(pins) || pins < 0 || pins > standing) {
      throw new InvalidRollsError(
        `Frame ${frameNumber}, roll ${i + 1}: ${pins} pins with ${standing} standing`,
      );
    }
    standing -= pins;
    // Clearing the deck mid-frame only happens in the bonus frame, which resets the rack.
    if (standing === 0) standing = PINS;
  }

  return isFrameDone(rolls, bonusFrame)
    ? { complete: true }
    : { complete: false, pinsStanding: standing };
}

/**
 * Scores a game from its rolls, one array per frame in order (frames[0] is frame 1).
 * Missing trailing frames count as not yet bowled.
 */
export function scoreGame(
  frames: readonly (readonly number[])[],
  config: GameConfig,
): Scorecard {
  if (frames.length > config.frameCount) {
    throw new InvalidRollsError(`${frames.length} frames given for a ${config.frameCount}-frame game`);
  }
  const padded = Array.from({ length: config.frameCount }, (_, i) => frames[i] ?? []);

  let unfinished = false;
  const complete = padded.map((rolls, i) => {
    if (unfinished && rolls.length > 0) {
      throw new InvalidRollsError(`Frame ${i + 1} has rolls but an earlier frame is unfinished`);
    }
    const state = frameState(rolls, i + 1, config);
    if (!state.complete) unfinished = true;
    return state.complete;
  });

  const allRolls = padded.flat();
  let offset = 0;
  let running: number | null = 0;
  let total = 0;

  const scored = padded.map((rolls, i): ScoredFrame => {
    let score: number | null = null;
    if (complete[i]) {
      const pins = sum(rolls);
      // The bonus frame already contains its own bonus rolls.
      const bonusCount =
        config.scoringMode === "standard" && i < config.frameCount - 1
          ? rolls[0] === PINS ? 2 : pins === PINS ? 1 : 0
          : 0;
      const start = offset + rolls.length;
      const bonus = allRolls.slice(start, start + bonusCount);
      if (bonus.length === bonusCount) score = pins + sum(bonus);
    }
    offset += rolls.length;

    running = running !== null && score !== null ? running + score : null;
    if (running !== null) total = running;
    return { rolls, score, runningTotal: running };
  });

  return { frames: scored, total, isComplete: !unfinished };
}
