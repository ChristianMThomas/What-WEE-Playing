import { describe, expect, it } from "vitest";
import { frameState, InvalidRollsError, scoreGame, type GameConfig } from "./scoring";

const STANDARD_10: GameConfig = { frameCount: 10, scoringMode: "standard" };
const STANDARD_5: GameConfig = { frameCount: 5, scoringMode: "standard" };
const BASIC_10: GameConfig = { frameCount: 10, scoringMode: "basic" };
const BASIC_5: GameConfig = { frameCount: 5, scoringMode: "basic" };

const repeat = (rolls: number[], n: number) => Array.from({ length: n }, () => rolls);

describe("scoreGame, standard scoring", () => {
  it("scores a gutter game as 0", () => {
    const card = scoreGame(repeat([0, 0], 10), STANDARD_10);
    expect(card.total).toBe(0);
    expect(card.isComplete).toBe(true);
  });

  it("scores a perfect game as 300", () => {
    const card = scoreGame([...repeat([10], 9), [10, 10, 10]], STANDARD_10);
    expect(card.total).toBe(300);
    expect(card.frames.map((f) => f.runningTotal)).toEqual([30, 60, 90, 120, 150, 180, 210, 240, 270, 300]);
  });

  it("scores all 5/5 spares with a 5 bonus as 150", () => {
    const card = scoreGame([...repeat([5, 5], 9), [5, 5, 5]], STANDARD_10);
    expect(card.total).toBe(150);
  });

  it("scores a mixed game", () => {
    const card = scoreGame(
      [[10], [7, 3], [9, 0], [10], [0, 8], [8, 2], [0, 6], [10], [10], [10, 8, 1]],
      STANDARD_10,
    );
    expect(card.frames.map((f) => f.runningTotal)).toEqual([20, 39, 48, 66, 74, 84, 90, 120, 148, 167]);
    expect(card.total).toBe(167);
  });

  it("gives frame 5 real bonus rolls in Swift Play", () => {
    const card = scoreGame([...repeat([10], 4), [10, 10, 10]], STANDARD_5);
    expect(card.frames.map((f) => f.score)).toEqual([30, 30, 30, 30, 30]);
    expect(card.total).toBe(150);
    expect(card.isComplete).toBe(true);
  });

  it("carries a spare into the Swift Play bonus frame", () => {
    const card = scoreGame([[0, 0], [0, 0], [0, 0], [5, 5], [7, 3, 4]], STANDARD_5);
    expect(card.frames.map((f) => f.score)).toEqual([0, 0, 0, 17, 14]);
  });

  it("leaves a strike unscored until both bonus rolls exist", () => {
    let card = scoreGame([[10], [3]], STANDARD_10);
    expect(card.frames[0]).toMatchObject({ score: null, runningTotal: null });
    expect(card.total).toBe(0);

    card = scoreGame([[10], [3, 4]], STANDARD_10);
    expect(card.frames.slice(0, 2).map((f) => f.runningTotal)).toEqual([17, 24]);
    expect(card.total).toBe(24);
  });

  it("scores back-to-back strikes as the rolls arrive", () => {
    let card = scoreGame([[10], [10]], STANDARD_10);
    expect(card.frames[0].score).toBeNull();

    card = scoreGame([[10], [10], [5]], STANDARD_10);
    expect(card.frames[0].score).toBe(25);
    expect(card.frames[1].score).toBeNull();
    expect(card.total).toBe(25);
  });

  it("leaves a spare unscored until the next roll", () => {
    let card = scoreGame([[6, 4]], STANDARD_10);
    expect(card.frames[0].score).toBeNull();

    card = scoreGame([[6, 4], [8]], STANDARD_10);
    expect(card.frames[0].score).toBe(18);
  });

  it("does not score the last frame until its bonus rolls are bowled", () => {
    const card = scoreGame([...repeat([0, 0], 9), [10, 10]], STANDARD_10);
    expect(card.frames[9].score).toBeNull();
    expect(card.isComplete).toBe(false);
  });
});

describe("scoreGame, basic scoring", () => {
  it("counts pins per frame with no carry-over", () => {
    const card = scoreGame([[5, 5], [3, 0], [10], [4, 2]], BASIC_10);
    expect(card.frames.slice(0, 4).map((f) => f.score)).toEqual([10, 3, 10, 6]);
    expect(card.total).toBe(29);
  });

  it("caps a perfect game at 10 per frame", () => {
    expect(scoreGame(repeat([10], 10), BASIC_10).total).toBe(100);
    expect(scoreGame(repeat([10], 5), BASIC_5).total).toBe(50);
  });

  it("treats the last frame as a normal 2-roll frame", () => {
    expect(scoreGame([...repeat([0, 0], 4), [10]], BASIC_5).isComplete).toBe(true);
    expect(scoreGame([...repeat([0, 0], 4), [7, 3]], BASIC_5).isComplete).toBe(true);
    expect(() => scoreGame([...repeat([0, 0], 4), [10, 5]], BASIC_5)).toThrow(InvalidRollsError);
    expect(() => scoreGame([...repeat([0, 0], 4), [7, 3, 5]], BASIC_5)).toThrow(InvalidRollsError);
  });
});

describe("scoreGame, in-progress games", () => {
  it("returns every frame even before they are bowled", () => {
    const card = scoreGame([], STANDARD_5);
    expect(card.frames).toHaveLength(5);
    expect(card.frames.every((f) => f.rolls.length === 0 && f.score === null)).toBe(true);
    expect(card.total).toBe(0);
    expect(card.isComplete).toBe(false);
  });

  it("does not score an open frame until its second roll", () => {
    const card = scoreGame([[3, 4], [2]], BASIC_10);
    expect(card.frames[1].score).toBeNull();
    expect(card.total).toBe(7);
  });
});

describe("scoreGame, invalid input", () => {
  it.each([
    ["more than 10 pins in one roll", [[11]]],
    ["more than 10 pins across a frame", [[6, 5]]],
    ["a negative roll", [[-1]]],
    ["a fractional roll", [[2.5]]],
    ["a third roll in a regular frame", [[5, 5, 5]]],
    ["a second roll after a strike", [[10, 0]]],
    ["rolls after an unfinished frame", [[3], [4, 4]]],
    ["rolls after an empty frame", [[], [4, 4]]],
    ["too many frames", repeat([0, 0], 11)],
  ])("rejects %s", (_, frames) => {
    expect(() => scoreGame(frames, STANDARD_10)).toThrow(InvalidRollsError);
  });

  it("rejects bonus rolls after an open last frame", () => {
    expect(() => scoreGame([...repeat([0, 0], 9), [3, 4, 5]], STANDARD_10)).toThrow(InvalidRollsError);
  });

  it("rejects a bonus roll that knocks down more pins than are standing", () => {
    expect(() => scoreGame([...repeat([0, 0], 9), [10, 3, 8]], STANDARD_10)).toThrow(InvalidRollsError);
  });
});

describe("frameState", () => {
  it("tracks pins standing in a regular frame", () => {
    expect(frameState([], 1, STANDARD_10)).toEqual({ complete: false, pinsStanding: 10 });
    expect(frameState([7], 1, STANDARD_10)).toEqual({ complete: false, pinsStanding: 3 });
    expect(frameState([7, 2], 1, STANDARD_10)).toEqual({ complete: true });
    expect(frameState([10], 1, STANDARD_10)).toEqual({ complete: true });
  });

  it("resets the rack in the bonus frame", () => {
    expect(frameState([10], 10, STANDARD_10)).toEqual({ complete: false, pinsStanding: 10 });
    expect(frameState([10, 3], 10, STANDARD_10)).toEqual({ complete: false, pinsStanding: 7 });
    expect(frameState([10, 10], 10, STANDARD_10)).toEqual({ complete: false, pinsStanding: 10 });
    expect(frameState([7, 3], 10, STANDARD_10)).toEqual({ complete: false, pinsStanding: 10 });
    expect(frameState([7, 2], 10, STANDARD_10)).toEqual({ complete: true });
    expect(frameState([10, 3, 7], 10, STANDARD_10)).toEqual({ complete: true });
  });

  it("uses frameCount as the bonus frame, not 10", () => {
    expect(frameState([10], 5, STANDARD_5)).toEqual({ complete: false, pinsStanding: 10 });
    expect(frameState([10], 5, STANDARD_10)).toEqual({ complete: true });
    expect(frameState([10], 5, BASIC_5)).toEqual({ complete: true });
  });

  it("rejects frame numbers outside the game", () => {
    expect(() => frameState([], 0, STANDARD_10)).toThrow(InvalidRollsError);
    expect(() => frameState([], 6, STANDARD_5)).toThrow(InvalidRollsError);
  });
});
