import { describe, expect, it } from "vitest";
import { computeThrow, type MotionSample } from "./throw";

const HZ = 60;

/**
 * A swing at 60 Hz with the phone upright: still, a backswing, then a forward
 * swing until release. Rates are degrees per second on the device axes.
 */
function swing({
  forward = -500,
  yaw = 0,
  twist = 0,
  gravity = 9.81,
}: { forward?: number; yaw?: number; twist?: number; gravity?: number } = {}): MotionSample[] {
  const samples: MotionSample[] = [];
  const add = (beta: number, gamma: number) =>
    samples.push({ t: (samples.length * 1000) / HZ, alpha: 0, beta, gamma, gx: 0, gy: gravity, gz: 0 });
  for (let i = 0; i < 6; i++) add(0, 0);
  for (let i = 0; i < 20; i++) add(200, 0);
  // Yaw (about the upright phone's long axis) mid-swing, then any twist in the last 120 ms.
  for (let i = 0; i < 20; i++) add(forward, i < 10 ? yaw : 0);
  for (let i = 0; i < 7; i++) add(forward, twist);
  return samples;
}

describe("computeThrow", () => {
  it("throws a straight swing straight, with no spin", () => {
    const result = computeThrow(swing());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params.angle).toBe(0);
    expect(result.params.spin).toBe(0);
    expect(result.params.speed).toBeGreaterThan(2);
  });

  it("throws faster for a faster swing", () => {
    const slow = computeThrow(swing({ forward: -300 }));
    const fast = computeThrow(swing({ forward: -600 }));
    expect(slow.ok && fast.ok).toBe(true);
    if (!slow.ok || !fast.ok) return;
    expect(fast.params.speed).toBeGreaterThan(slow.params.speed);
  });

  it("aims left or right when the swing turns", () => {
    const left = computeThrow(swing({ yaw: 60 }));
    const right = computeThrow(swing({ yaw: -60 }));
    expect(left.ok && right.ok).toBe(true);
    if (!left.ok || !right.ok) return;
    expect(left.params.angle).toBeLessThan(0);
    expect(right.params.angle).toBeGreaterThan(0);
  });

  it("reads a wrist twist at release as spin", () => {
    const result = computeThrow(swing({ twist: 300 }));
    expect(result.ok && result.params.spin).toBeGreaterThan(0);
    const other = computeThrow(swing({ twist: -300 }));
    expect(other.ok && other.params.spin).toBeLessThan(0);
  });

  it("gives the same aim when the browser reports gravity inverted", () => {
    const normal = computeThrow(swing({ yaw: 60 }));
    const inverted = computeThrow(swing({ yaw: 60, gravity: -9.81 }));
    expect(inverted).toEqual(normal);
  });

  it("rejects a press without a real swing", () => {
    expect(computeThrow(swing({ forward: -50 }))).toEqual({ ok: false, reason: "too-soft" });
    expect(computeThrow([])).toEqual({ ok: false, reason: "no-motion" });
  });

  it("keeps results inside the limits", () => {
    const result = computeThrow(swing({ forward: -5000, twist: 50000 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.params.speed).toBe(10);
    expect(result.params.spin).toBe(20);
  });
});
