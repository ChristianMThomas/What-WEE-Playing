// Turns the phone's orientation into where on the screen it points (md/11).
// The phone sends angles relative to the pose it was calibrated in; the desktop
// turns those into a cursor position, so it can use its own screen size.
//
// Device axes (W3C DeviceOrientationEvent), the phone held like a remote with
// the screen up and the top edge towards the screen: the barrel is the device's
// +y axis. Rotating the spec's Z-X'-Y'' matrix and taking that axis leaves
// yaw = -alpha and pitch = beta, with gamma only rolling the phone around the
// barrel. So there is no matrix here, and the degenerate case (the phone stood
// upright, beta near ±90°) is far from the pose the controller asks for.

export interface Orientation {
  alpha: number;
  beta: number;
  gamma: number;
}

export interface Aim {
  /** Left/right, degrees; positive is to the right. */
  yaw: number;
  /** Up/down, degrees; positive is up. */
  pitch: number;
  /** How far the phone is rolled about the barrel, degrees; only tilts the hand. */
  roll: number;
}

/** How much of a turn sweeps the full screen width. */
export const SWEEP_DEG = 40;
/** How quickly the drawn cursor catches up with the phone, ms. */
export const SMOOTH_MS = 55;

export function aimFrom({ alpha, beta, gamma }: Orientation): Aim {
  return { yaw: -alpha, pitch: beta, roll: gamma };
}

/** Wraps an angle into (-180, 180], so passing 0/360 doesn't fling the cursor. */
export function wrapDegrees(degrees: number) {
  const wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  // -180 and 180 are the same angle; keep the positive one so the range is half-open.
  return wrapped === -180 ? 180 : wrapped;
}

/** How far the phone has turned from the pose it was calibrated in. */
export function relativeAim(current: Aim, baseline: Aim): Aim {
  return {
    yaw: wrapDegrees(current.yaw - baseline.yaw),
    pitch: wrapDegrees(current.pitch - baseline.pitch),
    roll: wrapDegrees(current.roll - baseline.roll),
  };
}

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Where an aim points on the screen, in pixels from the top left. Both axes use
 * the same degrees per pixel, so a turn moves the cursor the same distance
 * whichever way it goes, and a wider screen just needs a wider sweep.
 */
export function pointerAt({ yaw, pitch }: Aim, { width, height }: Viewport, sweepDeg = SWEEP_DEG) {
  const perDegree = width / sweepDeg;
  return {
    x: clamp(width / 2 + yaw * perDegree, 0, width),
    y: clamp(height / 2 - pitch * perDegree, 0, height),
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Moves `current` towards `target` over `dtMs`, closing the gap on a time
 * constant of `tauMs`. Frame-rate independent, and it smooths out both sensor
 * jitter and the gaps between messages from the phone.
 */
export function smooth(current: number, target: number, dtMs: number, tauMs = SMOOTH_MS) {
  if (tauMs <= 0 || dtMs <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}
