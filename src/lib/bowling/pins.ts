// Which pins are standing, as a 10-bit mask: bit i is pin i + 1 (bit 0 is the
// head pin), numbered like PIN_SPOTS in ./lane.ts. Small enough to broadcast
// as the safety check after a roll (md/11-realtime-and-physics.md).

export type PinMask = number;

export const ALL_PINS: PinMask = 0b11_1111_1111;

export const isStanding = (mask: PinMask, pin: number) => (mask & (1 << pin)) !== 0;

export function countPins(mask: PinMask): number {
  let count = 0;
  for (let pin = 0; pin < 10; pin++) if (isStanding(mask, pin)) count++;
  return count;
}

/** Checks a mask from the network. */
export const isPinMask = (value: unknown): value is PinMask =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= ALL_PINS;
