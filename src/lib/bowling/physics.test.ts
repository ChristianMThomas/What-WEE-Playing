import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import { beforeAll, describe, expect, it } from "vitest";
import { simulateRoll } from "./physics";
import { ALL_PINS, countPins } from "./pins";
import { launchFrom, STRAIGHT } from "./shot";

const swing = (speed: number, spin = 0) => ({ speed, angle: 0, spin });

describe("simulateRoll", () => {
  beforeAll(async () => {
    await RAPIER.init();
  });

  it("gives the same result every time for the same throw", () => {
    const launch = launchFrom({ position: 0.05, angle: -0.6 }, swing(7.3, 4));
    const a = simulateRoll(RAPIER, launch, ALL_PINS);
    const b = simulateRoll(RAPIER, launch, ALL_PINS);
    expect(b.standing).toBe(a.standing);
    expect(Buffer.from(b.recording.buffer).equals(Buffer.from(a.recording.buffer))).toBe(true);
  });

  it("knocks down most of the rack with a firm ball into the pocket", () => {
    const { standing } = simulateRoll(RAPIER, launchFrom({ position: 0.06, angle: 0 }, swing(8)), ALL_PINS);
    expect(countPins(standing)).toBeLessThanOrEqual(3);
  });

  it("knocks nothing down from the gutter", () => {
    const { standing } = simulateRoll(RAPIER, launchFrom({ position: 0.4, angle: 20 }, swing(8)), ALL_PINS);
    expect(standing).toBe(ALL_PINS);
  });

  it("only simulates the pins that are standing", () => {
    // Just the 7 pin (bit 6) left, and a straight ball down the middle misses it.
    const { standing } = simulateRoll(RAPIER, launchFrom(STRAIGHT, swing(8)), 1 << 6);
    expect(standing).toBe(1 << 6);
  });

  it("hooks a ball with side spin", () => {
    const end = (spin: number) => {
      const { recording, frames } = simulateRoll(RAPIER, launchFrom({ position: -0.3, angle: 0 }, swing(8, spin)), 0);
      // Ball x in the frame where it's closest to the head pin's row.
      for (let f = 0; f < frames; f++) if (recording[f * 77 + 2] < -18) return recording[f * 77];
      return NaN;
    };
    expect(end(15)).toBeGreaterThan(end(0) + 0.2);
  });
});
