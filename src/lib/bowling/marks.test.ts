import { describe, expect, it } from "vitest";
import { rollMark } from "./marks";

const marks = (rolls: number[], lastFrame = false) => rolls.map((_, i) => rollMark(rolls, i, lastFrame));

describe("rollMark", () => {
  it("writes strikes, spares, misses and counts", () => {
    expect(marks([10])).toEqual(["X"]);
    expect(marks([7, 3])).toEqual(["7", "/"]);
    expect(marks([0, 10])).toEqual(["-", "/"]);
    expect(marks([4, 0])).toEqual(["4", "-"]);
  });

  it("is blank for rolls not bowled yet", () => {
    expect(rollMark([6], 1, false)).toBe("");
  });

  it("resets the rack in the last frame after a strike or spare", () => {
    expect(marks([10, 10, 10], true)).toEqual(["X", "X", "X"]);
    expect(marks([10, 3, 7], true)).toEqual(["X", "3", "/"]);
    expect(marks([7, 3, 10], true)).toEqual(["7", "/", "X"]);
    expect(marks([7, 3, 5], true)).toEqual(["7", "/", "5"]);
    expect(marks([10, 0, 0], true)).toEqual(["X", "-", "-"]);
  });
});
