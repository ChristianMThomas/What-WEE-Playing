import { PINS } from "./scoring";

/**
 * How a roll is written on a scorecard: X for a strike, / for a spare, - for a
 * miss, otherwise the pin count. lastFrame matters because the bonus frame
 * resets the rack after a strike or spare.
 */
export function rollMark(rolls: readonly number[], index: number, lastFrame: boolean): string {
  const pins = rolls[index];
  if (pins === undefined) return "";
  const previous = rolls[index - 1];
  // A spare finishes the rack the roll before it started: that roll wasn't a
  // strike, and in the last frame the first two rolls didn't already clear it.
  const sameRack = index > 0 && previous !== PINS && !(lastFrame && index === 2 && rolls[0] + rolls[1] === PINS);
  if (sameRack && previous + pins === PINS) return "/";
  if (pins === PINS) return "X";
  return pins === 0 ? "-" : String(pins);
}
