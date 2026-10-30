import { describe, expect, it } from "vitest";
import {
  commitGlow,
  glowRoster,
  glowView,
  newGlow,
  pauseGlow,
  resumeGlow,
  startGlow,
  stepGlow,
} from "./glow";
import {
  glowFrame,
  glowOutcome,
  glowRevealed,
  glowObservation,
} from "./glow-feedback";

function choosing(ids = ["a", "b", "c"]) {
  return stepGlow(startGlow(glowRoster(newGlow(5), ids, () => 0)), 3000);
}
function settled(unique: number) {
  let game = commitGlow(choosing(), "a", 1, [2, 0, 1]);
  const others = [
    [0, 1, 2],
    [0, 1, 3],
    [0, 3, 4],
    [3, 4, 5],
  ][unique];
  game = commitGlow(game, "b", 1, others);
  return commitGlow(game, "c", 1, unique === 3 ? [6, 7, 8] : others);
}

describe("Glow reveal explanation", () => {
  it.each([0, 1, 2, 3])(
    "explains %i unique picks in stable order, agreeing with the actual score",
    (unique) => {
      const game = stepGlow(settled(unique), 1500);
      const outcome = glowOutcome(game, "a")!;
      expect(outcome.picks.map((p) => p.coordinate)).toEqual([
        "A1",
        "B1",
        "C1",
      ]);
      expect(outcome.unique).toBe(unique);
      expect(outcome.clashes).toBe(3 - unique);
      expect(outcome.picks.reduce((n, p) => n + p.points, 0)).toBe(
        outcome.gain,
      );
      expect(outcome.gain).toBe(game.seats[0].scores[0]);
      expect(glowOutcome(game, "spectator")).toBeNull();
      expect(outcome.picks.some((p) => p.cell === 11)).toBe(false);
      expect(glowOutcome(pauseGlow(game), "a")).toEqual(outcome);
      expect(glowOutcome(resumeGlow(pauseGlow(game)), "a")).toEqual(outcome);
    },
  );
  it("does not examine opponents' hidden picks during choosing or settling", () => {
    const game = settled(2);
    for (const viewer of ["a", "b", "spectator"]) {
      expect(glowOutcome(glowView(choosing(), viewer), viewer)).toBeNull();
      expect(glowOutcome(game, viewer)).toBeNull();
      expect(glowOutcome(glowView(game, viewer), viewer)).toBeNull();
    }
  });
  it("retains all eight claimants and seat 8's zero contribution", () => {
    const ids = Array.from({ length: 8 }, (_, n) => `p${n}`);
    let game = choosing(ids);
    for (const id of ids) game = commitGlow(game, id, 1, [0, 1, 31]);
    game = stepGlow(game, 1500);
    expect(
      glowOutcome(game, "p7")?.picks.map((p) => [p.claimants, p.points]),
    ).toEqual([
      [8, 0],
      [8, 0],
      [8, 0],
    ]);
  });
  it("only signals an observed same-round reveal, with copied comparison values", () => {
    const game = settled(2),
      before = glowFrame(game, "a");
    const reveal = stepGlow(game, 1500),
      after = glowFrame(reveal, "a");
    expect(glowRevealed(before, after)).toBe(true);
    expect(glowRevealed(null, after)).toBe(false);
    expect(glowRevealed(after, after)).toBe(false);
    expect(glowRevealed(after, before)).toBe(false);
    expect(glowRevealed({ ...before, round: 2 }, after)).toBe(false);
    expect(glowRevealed(before, { ...after, viewer: "b" })).toBe(false);
    expect(glowRevealed(before, glowFrame(reveal, "spectator"))).toBe(false);
    for (const phase of ["paused", "reorient", "reveal", "finished"] as const)
      expect(glowRevealed({ ...before, phase }, after)).toBe(false);
    reveal.seats[0].scores[0] = 0;
    reveal.seats[0].picks!.push(4);
    expect(after.unique).toBe(2);
    expect(before.unique).toBeNull();
  });
});

it("retains a bounded reveal/lock baseline when old observations arrive", () => {
  const choosingFrame = glowFrame(choosing(), "a");
  const locked = glowFrame(settled(2), "a");
  const reveal = glowFrame(stepGlow(settled(2), 1500), "a");
  expect(glowObservation(locked, choosingFrame)).toBe(locked);
  expect(glowObservation(reveal, locked)).toBe(reveal);
  expect(glowRevealed(glowObservation(reveal, locked), reveal)).toBe(false);
  expect(glowObservation(reveal, { ...choosingFrame, round: 0 })).toBe(reveal);
  expect(glowObservation(reveal, { ...choosingFrame, round: 2 }).round).toBe(2);
  expect(
    glowObservation(reveal, { ...choosingFrame, viewer: "b" }).viewer,
  ).toBe("b");
  expect(glowObservation(null, choosingFrame)).toBe(choosingFrame);
});
