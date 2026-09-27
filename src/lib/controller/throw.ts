// Turns the phone's motion during a swing into throw parameters (md/06, md/11).
// The phone records devicemotion samples while the button is held and calls
// computeThrow() on release; only the result is sent, never the raw motion.
//
// Device axes (W3C DeviceMotionEvent), phone held upright with the screen facing
// the bowler: x points right, y up along the phone, z out of the screen.
// Whether held upright or pointed forward like a Wii remote, x is the lateral
// axis the arm swings around.

import { THROW_LIMITS, type ThrowParams } from "./protocol";

export interface MotionSample {
  /** Milliseconds, from event.timeStamp. */
  t: number;
  /** rotationRate in degrees per second: alpha about z, beta about x, gamma about y. */
  alpha: number;
  beta: number;
  gamma: number;
  /** accelerationIncludingGravity, m/s². At rest it points up (away from the ground). */
  gx: number;
  gy: number;
  gz: number;
}

export type ThrowResult =
  | { ok: true; params: ThrowParams }
  | { ok: false; reason: "no-motion" | "too-soft" };

/** Shoulder to hand, meters: turns the swing's angular speed into hand speed. */
export const ARM_LENGTH = 0.7;
/** Slowest swing that counts as a throw, rad/s. */
export const MIN_SWING = 2.5;
/** Ball speed per unit of hand speed. */
export const SPEED_GAIN = 1.2;
/** Degrees of lane angle per degree the swing's direction turned. */
export const ANGLE_GAIN = 0.5;
/** Spin is read from this window right before release, ms. */
export const SPIN_WINDOW = 120;
/** Samples at the start of the hold used to find which way is up. */
const GRAVITY_SAMPLES = 5;

type Vec = [number, number, number];
type Quat = [number, number, number, number]; // w, x, y, z

const DEG = Math.PI / 180;
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a: Vec, s: number): Vec => [a[0] * s, a[1] * s, a[2] * s];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: Vec) => Math.hypot(...a);

function mul(a: Quat, b: Quat): Quat {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}

function rotate(q: Quat, v: Vec): Vec {
  const r = mul(mul(q, [0, ...v]), [q[0], -q[1], -q[2], -q[3]]);
  return [r[1], r[2], r[3]];
}

/** Angular velocity in rad/s on the device axes. */
const omega = (s: MotionSample): Vec => [s.beta * DEG, s.gamma * DEG, s.alpha * DEG];

const clamp = (value: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100 || 0;

/**
 * Which way is up, in the device's starting frame. The sign is corrected so the
 * strongest axis reads positive, since some browsers (older iOS) report
 * gravity inverted; that assumes the swing starts with the phone upright or
 * lying screen up, which the controller screen asks for.
 */
function upAxis(samples: readonly MotionSample[]): Vec {
  const first = samples.slice(0, GRAVITY_SAMPLES);
  const sum = first.reduce<Vec>((acc, s) => [acc[0] + s.gx, acc[1] + s.gy, acc[2] + s.gz], [0, 0, 0]);
  const length = norm(sum);
  if (length === 0) return [0, 1, 0];
  const up = scale(sum, 1 / length);
  const strongest = up.reduce((best, value, i) => (Math.abs(value) > Math.abs(up[best]) ? i : best), 0);
  return up[strongest] < 0 ? scale(up, -1) : up;
}

/**
 * Computes the throw from a held button's motion samples, oldest first, ending at release.
 *
 * - Speed: the fastest swing (rotation about x) since the swing last changed
 *   direction, i.e. during the forward swing, times arm length.
 * - Angle: how far the swing's axis turned left or right over the whole hold,
 *   tracked by integrating the gyro from the starting orientation.
 * - Spin: the average twist about the phone's long axis right before release.
 *
 * Numbers are rounded here, on the phone, and every client uses them as sent.
 */
export function computeThrow(samples: readonly MotionSample[]): ThrowResult {
  if (samples.length < GRAVITY_SAMPLES + 2) return { ok: false, reason: "no-motion" };

  // The forward swing: back from release to where the swing rate last changed sign.
  let start = samples.length - 1;
  const direction = Math.sign(samples[start].beta);
  while (start > 0 && Math.sign(samples[start - 1].beta) === direction && direction !== 0) start--;
  const peak = Math.max(...samples.slice(start).map((s) => Math.abs(s.beta) * DEG));
  if (peak < MIN_SWING) return { ok: false, reason: "too-soft" };

  // Integrate orientation over the hold. q maps the current device frame into the starting one.
  let q: Quat = [1, 0, 0, 0];
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(0, samples[i].t - samples[i - 1].t) / 1000;
    const w = omega(samples[i]);
    const angle = norm(w) * dt;
    if (angle === 0) continue;
    const axis = scale(w, Math.sin(angle / 2) / norm(w));
    q = mul(q, [Math.cos(angle / 2), ...axis]);
  }

  // The swing axis (device x) at release vs at the start, both flattened onto the floor.
  const up = upAxis(samples);
  const flat = (v: Vec) => sub(v, scale(up, dot(v, up)));
  const before = flat([1, 0, 0]);
  const after = flat(rotate(q, [1, 0, 0]));
  // Turning counterclockwise seen from above aims the ball left, so negate for "positive is right".
  const turned = -Math.atan2(dot(up, cross(before, after)), dot(before, after)) / DEG;

  const releaseAt = samples[samples.length - 1].t;
  const recent = samples.filter((s) => s.t >= releaseAt - SPIN_WINDOW);
  const twist = recent.reduce((acc, s) => acc + s.gamma * DEG, 0) / recent.length;

  return {
    ok: true,
    params: {
      speed: round2(clamp(peak * ARM_LENGTH * SPEED_GAIN, THROW_LIMITS.speed)),
      angle: round2(clamp(turned * ANGLE_GAIN, THROW_LIMITS.angle)),
      spin: round2(clamp(twist, THROW_LIMITS.spin)),
    },
  };
}
