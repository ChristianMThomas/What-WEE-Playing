// Lane and pin dimensions in meters, from regulation bowling. Shared by the
// renderer and (later) the physics, so the starting state is built from the
// same constants on every client (md/11-realtime-and-physics.md).
//
// Coordinates: x across the lane (+x is right, looking at the pins), y up,
// z along the lane with the foul line at z = 0 and the pins toward -z.

export const LANE_WIDTH = 1.0541; // 41.5 in
export const GUTTER_WIDTH = 0.235; // 9.25 in
/** Foul line to the center of the head pin. */
export const HEAD_PIN_DISTANCE = 18.288; // 60 ft
/** Foul line to the back of the pin deck, where the pit starts. */
export const LANE_LENGTH = HEAD_PIN_DISTANCE + 0.88;
/** The approach behind the foul line, where the bowler stands. */
export const APPROACH_LENGTH = 4.6; // 15 ft

export const PIN_SPACING = 0.3048; // 12 in, center to center
export const PIN_HEIGHT = 0.381; // 15 in
export const PIN_MAX_RADIUS = 0.0605; // 4.766 in widest diameter / 2
export const BALL_RADIUS = 0.1085; // 8.55 in diameter / 2

/**
 * Pin spots as [x, z], head pin first, numbered like a real rack:
 * 1 in front, then 2-3, 4-6, 7-10 from left to right.
 */
export const PIN_SPOTS: readonly (readonly [number, number])[] = (() => {
  const rowDepth = PIN_SPACING * (Math.sqrt(3) / 2);
  const spots: [number, number][] = [];
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i <= row; i++) {
      spots.push([(i - row / 2) * PIN_SPACING, -HEAD_PIN_DISTANCE - row * rowDepth]);
    }
  }
  return spots;
})();
