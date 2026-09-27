import { describe, expect, it } from "vitest";
import { controllerTopic, parseButton, parseThrow } from "./protocol";

describe("controller protocol", () => {
  it("names the channel after the desktop's user", () => {
    expect(controllerTopic("abc")).toBe("controller:abc");
  });

  it("accepts a valid throw as sent", () => {
    const message = { v: 1, id: "t1", speed: 6.25, angle: -1.5, spin: 3 };
    expect(parseThrow(message)).toEqual(message);
  });

  it("rejects junk and out-of-range throws", () => {
    for (const payload of [
      null,
      "throw",
      { v: 2, id: "t", speed: 5, angle: 0, spin: 0 },
      { v: 1, speed: 5, angle: 0, spin: 0 },
      { v: 1, id: "t", speed: 50, angle: 0, spin: 0 },
      { v: 1, id: "t", speed: 5, angle: Number.NaN, spin: 0 },
      { v: 1, id: "t", speed: 5, angle: 0, spin: "3" },
    ]) {
      expect(parseThrow(payload)).toBeNull();
    }
  });

  it("accepts button presses and releases", () => {
    expect(parseButton({ v: 1, button: "a", pressed: true })).toEqual({ v: 1, button: "a", pressed: true });
    expect(parseButton({ v: 1, button: "left", pressed: false, extra: 1 })).toEqual({ v: 1, button: "left", pressed: false });
  });

  it("rejects unknown buttons and malformed button messages", () => {
    for (const payload of [
      null,
      { v: 1, button: "c", pressed: true },
      { v: 1, button: "a", pressed: "yes" },
      { v: 2, button: "a", pressed: true },
      { v: 1, button: "toString", pressed: true },
    ]) {
      expect(parseButton(payload)).toBeNull();
    }
  });
});
