// From where the bowler stands and aims, plus the phone's swing, to the ball's
// launch (md/06-bowling-mechanics.md). Like Wii Sports, the bowler starts
// centered and aiming straight; the d-pad moves them across the lane or, after
// A, turns them.
//
// The thrower's desktop computes the Launch once and everyone simulates it
// exactly as sent: the trig here isn't guaranteed to round the same way in
// every browser, but the physics after it is (md/11).

import type { ThrowParams } from "@/lib/controller/protocol";
import { BALL_RADIUS, LANE_WIDTH } from "./lane";

export interface Aim {
  /** Across the lane from its center, meters; positive is right. */
  position: number;
  /** Degrees off straight down the lane; positive is right. */
  angle: number;
}

export const AIM_LIMITS = {
  /** The ball has to start on the lane, not over a gutter. */
  position: LANE_WIDTH / 2 - BALL_RADIUS,
  angle: 35,
} as const;

export const STRAIGHT: Aim = { position: 0, angle: 0 };

/** How fast a held arrow moves the bowler (m/s) or turns them (degrees/s). */
export const MOVE_SPEED = 0.35;
export const TURN_SPEED = 12;

/**
 * How much the swing's own direction adds to the aim. The phone's reading is
 * rough, so it only nudges the ball; where the bowler aimed matters most.
 */
export const SWING_ANGLE_WEIGHT = 0.25;

/** What the physics needs to roll the ball: where it starts, its velocity, and its side spin. */
export interface Launch {
  /** Across the lane, meters. */
  x: number;
  /** Velocity, m/s. Down the lane is -z. */
  vx: number;
  vz: number;
  /** Side spin, rad/s; positive hooks right. */
  spin: number;
}

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

export function clampAim({ position, angle }: Aim): Aim {
  return { position: clamp(position, AIM_LIMITS.position), angle: clamp(angle, AIM_LIMITS.angle) };
}

export function launchFrom(aim: Aim, swing: ThrowParams): Launch {
  const { position, angle } = clampAim(aim);
  const direction = ((angle + swing.angle * SWING_ANGLE_WEIGHT) * Math.PI) / 180;
  return {
    x: position,
    vx: swing.speed * Math.sin(direction),
    vz: -swing.speed * Math.cos(direction),
    spin: swing.spin,
  };
}

const finite = (value: unknown, limit: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

/** Checks a launch from the network before it goes anywhere near the physics. */
export function isLaunch(value: unknown): value is Launch {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return finite(v.x, AIM_LIMITS.position) && finite(v.vx, 10) && finite(v.vz, 10) && finite(v.spin, 20);
}
