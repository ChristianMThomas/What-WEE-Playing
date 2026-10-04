import { describe, expect, it } from "vitest";
import { aimFrom, pointerAt, relativeAim, smooth, SWEEP_DEG, wrapDegrees } from "./aim";

const SCREEN = { width: 1600, height: 900 };

describe("aim", () => {
  it("reads yaw, pitch and roll off the orientation angles", () => {
    expect(aimFrom({ alpha: 30, beta: 12, gamma: -5 })).toEqual({ yaw: -30, pitch: 12, roll: -5 });
  });

  it("wraps angles into (-180, 180]", () => {
    expect(wrapDegrees(0)).toBe(0);
    expect(wrapDegrees(190)).toBe(-170);
    expect(wrapDegrees(-190)).toBe(170);
    expect(wrapDegrees(360)).toBe(0);
    expect(wrapDegrees(540)).toBe(180);
  });

  it("measures the turn from the calibrated pose across the 0/360 seam", () => {
    const baseline = aimFrom({ alpha: 359, beta: 0, gamma: 0 });
    // alpha 359 -> 4 is turning 5° anticlockwise, which aims 5° to the right.
    expect(relativeAim(aimFrom({ alpha: 4, beta: 0, gamma: 0 }), baseline).yaw).toBeCloseTo(-5);
    expect(relativeAim(aimFrom({ alpha: 354, beta: 0, gamma: 0 }), baseline).yaw).toBeCloseTo(5);
  });

  it("points at the middle of the screen when it hasn't moved from the baseline", () => {
    expect(pointerAt({ yaw: 0, pitch: 0, roll: 0 }, SCREEN)).toEqual({ x: 800, y: 450 });
  });

  it("sweeps the full width over SWEEP_DEG, and uses the same scale going up", () => {
    expect(pointerAt({ yaw: SWEEP_DEG / 2, pitch: 0, roll: 0 }, SCREEN).x).toBe(1600);
    expect(pointerAt({ yaw: -SWEEP_DEG / 4, pitch: 0, roll: 0 }, SCREEN).x).toBe(400);
    // Up is positive pitch, and 10° moves as far vertically as 10° moves horizontally.
    const up = pointerAt({ yaw: 0, pitch: 10, roll: 0 }, SCREEN);
    const right = pointerAt({ yaw: 10, pitch: 0, roll: 0 }, SCREEN);
    expect(450 - up.y).toBeCloseTo(right.x - 800);
  });

  it("keeps the cursor on the screen", () => {
    expect(pointerAt({ yaw: 120, pitch: -90, roll: 0 }, SCREEN)).toEqual({ x: 1600, y: 900 });
    expect(pointerAt({ yaw: -120, pitch: 90, roll: 0 }, SCREEN)).toEqual({ x: 0, y: 0 });
  });

  it("closes most of the gap within a couple of time constants", () => {
    expect(smooth(0, 100, 55, 55)).toBeCloseTo(63.2, 1);
    expect(smooth(0, 100, 220, 55)).toBeGreaterThan(98);
    // A frame of no time, or no smoothing at all, leaves nothing to catch up with.
    expect(smooth(0, 100, 0, 55)).toBe(100);
    expect(smooth(0, 100, 16, 0)).toBe(100);
  });
});
