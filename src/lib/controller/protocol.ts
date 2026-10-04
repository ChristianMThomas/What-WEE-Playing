// Messages on the private controller:{userId} Realtime channel between a
// player's phone and their own desktop (md/11-realtime-and-physics.md).

export function controllerTopic(desktopUserId: string) {
  return `controller:${desktopUserId}`;
}

/** Broadcast event names. */
export const EVENTS = {
  /** Phone → desktop: a throw, sent once when B is released after a swing. */
  throw: "throw",
  /** Phone → desktop: a button went down or up. Every game reads the same buttons. */
  button: "button",
  /** Phone → desktop: where the phone is pointing, streamed while it moves. */
  aim: "aim",
  /** Desktop → phone: a short buzz, for the cursor landing on something. */
  rumble: "rumble",
  /** Desktop → phone: the desktop unpaired this phone, so it should stop and ask for a new code. */
  unpaired: "unpaired",
} as const;

/** The Presence key each side tracks under, so the desktop can tell when its phone is connected. */
export const PRESENCE = { phone: "phone", desktop: "desktop" } as const;

/**
 * The remote's buttons. B is the trigger: in Bowling, hold it, swing, and let go.
 * The d-pad and A mean whatever the game on screen says (Bowling: move, and A
 * switches between moving and turning). Home opens the game's Home menu.
 */
export const BUTTONS = ["up", "down", "left", "right", "a", "b", "home"] as const;
export type Button = (typeof BUTTONS)[number];

export interface ButtonMessage {
  v: 1;
  button: Button;
  /** true when it went down, false when it came back up. */
  pressed: boolean;
}

export const AIM_LIMITS = {
  /** Left/right from the calibrated pose, degrees; positive is to the right. */
  yaw: { min: -90, max: 90 },
  /** Up/down from it, degrees; positive is up. */
  pitch: { min: -90, max: 90 },
  /** How far the phone is rolled about its barrel, degrees. */
  roll: { min: -180, max: 180 },
} as const;

export interface AimMessage {
  v: 1;
  yaw: number;
  pitch: number;
  roll: number;
}

export const THROW_LIMITS = {
  /** Ball speed down the lane, m/s. */
  speed: { min: 2, max: 10 },
  /** Direction off straight down the lane, degrees; positive is to the right. */
  angle: { min: -8, max: 8 },
  /** Side spin, rad/s; positive curves the ball to the right. */
  spin: { min: -20, max: 20 },
} as const;

export interface ThrowParams {
  speed: number;
  angle: number;
  spin: number;
}

export interface ThrowMessage extends ThrowParams {
  v: 1;
  /** Random id, so a repeated delivery isn't bowled twice. */
  id: string;
}

const inRange = (value: unknown, { min, max }: { min: number; max: number }): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

/**
 * Checks a throw from the channel. The desktop only trusts what passes, and uses
 * the numbers exactly as sent, so every client simulates the same throw.
 */
export function parseThrow(payload: unknown): ThrowMessage | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== 1 || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 64) return null;
  if (!inRange(p.speed, THROW_LIMITS.speed) || !inRange(p.angle, THROW_LIMITS.angle) || !inRange(p.spin, THROW_LIMITS.spin)) {
    return null;
  }
  return { v: 1, id: p.id, speed: p.speed, angle: p.angle, spin: p.spin };
}

/**
 * Checks an aim from the channel. These arrive many times a second while the
 * phone moves, and the newest one always wins, so there is nothing to dedupe.
 */
export function parseAim(payload: unknown): AimMessage | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== 1) return null;
  if (!inRange(p.yaw, AIM_LIMITS.yaw) || !inRange(p.pitch, AIM_LIMITS.pitch) || !inRange(p.roll, AIM_LIMITS.roll)) {
    return null;
  }
  return { v: 1, yaw: p.yaw, pitch: p.pitch, roll: p.roll };
}

/** Checks a button message from the channel. */
export function parseButton(payload: unknown): ButtonMessage | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== 1 || typeof p.pressed !== "boolean" || !(BUTTONS as readonly unknown[]).includes(p.button)) return null;
  return { v: 1, button: p.button as Button, pressed: p.pressed };
}
