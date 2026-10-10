import { expect, it } from "vitest";
import { newSumo, type SumoState } from "./sumo";
import { sumoEffects } from "./sumo-feedback";
const playing = (): SumoState => ({
  ...newSumo(["a", "b", "c"]),
  phase: "playing",
  countdown: 0,
  ticks: 100,
});
it("shows confirmed contacts once across skipped snapshots and prioritizes ring-outs", () => {
  const before = playing(),
    after = playing();
  after.ticks = 106;
  after.bumpers[0].impact = after.bumpers[1].impact = 103;
  expect(sumoEffects(before, after).map((e) => e.kind)).toEqual([
    "impact",
    "impact",
  ]);
  expect(sumoEffects(after, after)).toEqual([]);
  after.bumpers[1].alive = false;
  expect(sumoEffects(before, after).map((e) => e.kind)).toEqual([
    "impact",
    "out",
  ]);
  after.bumpers[0].alive = false;
  after.phase = "finished";
  expect(sumoEffects(before, after).map((e) => e.kind)).toEqual(["out", "out"]);
});
it("does not replay historical feedback after mount, pause, restart, stale impacts or a long gap", () => {
  const before = playing(),
    after = playing();
  after.bumpers[0].impact = 50;
  expect(sumoEffects(before, after)).toEqual([]);
  after.bumpers[0].alive = false;
  expect(sumoEffects(null, after)).toEqual([]);
  expect(sumoEffects({ ...before, phase: "paused" }, after)).toEqual([]);
  expect(sumoEffects(before, { ...after, phase: "countdown" })).toEqual([]);
  expect(sumoEffects(before, { ...after, ticks: 99 })).toEqual([]);
  expect(sumoEffects(before, { ...after, ticks: 221 })).toEqual([]);
});
