import { describe, expect, it } from "vitest";
import {
  finishRaceRound,
  movePaddle,
  newPong,
  newRoom,
  raceRound,
  raceTap,
  stepPong,
} from "./model";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";

describe("Pong simulation", () => {
  it("clamps paddles, rejects spectators, reflects walls and paddle hits", () => {
    const state = { ...newPong(["a", "b"]), phase: "playing" as const };
    expect(movePaddle(state, "spectator", 0)).toBe(state);
    expect(movePaddle(state, "a", 0).paddles).toEqual([0.12, 0.5]);
    expect(movePaddle(state, "b", 1).paddles).toEqual([0.5, 0.88]);
    const wall = stepPong(
      { ...state, ball: { x: 0.5, y: 0.026, vx: 0.4, vy: -0.3 } },
      1 / 120,
    );
    expect(wall.ball.vy).toBeGreaterThan(0);
    const hit = stepPong(
      { ...state, ball: { x: 0.067, y: 0.5, vx: -0.42, vy: 0 } },
      1 / 120,
    );
    expect(hit.ball.vx).toBeGreaterThan(0);
    const missed = stepPong(
      { ...state, ball: { x: 0.067, y: 0.8, vx: -0.42, vy: 0 } },
      1 / 120,
    );
    expect(missed.ball.vx).toBeLessThan(0);
  });
  it("scores misses, delays serves, finishes at seven and freezes paused matches", () => {
    const state = {
      ...newPong(["a", "b"]),
      phase: "playing" as const,
      score: [0, 6] as [number, number],
      ball: { x: -0.024, y: 0.8, vx: -0.42, vy: 0 },
    };
    const win = stepPong(state, 1 / 120);
    expect(win.score).toEqual([0, 7]);
    expect(win.phase).toBe("finished");
    expect(stepPong(win, 1)).toBe(win);
    const serve = stepPong({ ...state, score: [0, 0] }, 1 / 120);
    expect(serve.phase).toBe("serve");
    expect(serve.ball.x).toBe(0.5);
    expect(stepPong(serve, 0.5).phase).toBe("serve");
    expect(stepPong(serve, 1).phase).toBe("playing");
    const paused = { ...state, phase: "paused" as const };
    expect(stepPong(paused, 1)).toBe(paused);
  });
});
describe("Reaction Race rules", () => {
  const entries = [
    { id: "a", points: 0, result: "pending" as const, elapsed: null },
    { id: "b", points: 0, result: "pending" as const, elapsed: null },
  ];
  it("rewards speed, penalizes early and wrong taps, allows only one attempt", () => {
    const wait = raceRound(entries, 1);
    const early = raceTap(wait, "a", 0, 0);
    expect(early.entries[0].points).toBe(-25);
    const active = { ...early, phase: "active" as const, target: 4 };
    expect(raceTap(active, "a", 4, 100)).toBe(active);
    const hit = raceTap(active, "b", 4, 200);
    expect(hit.entries[1].points).toBe(90);
    expect(raceTap(hit, "b", 0, 300)).toBe(hit);
    expect(raceTap(active, "spectator", 4, 10)).toBe(active);
    const wrong = raceTap({ ...active, entries }, "b", 3, 100);
    expect(wrong.entries[1].result).toBe("wrong");
    expect(wrong.entries[1].points).toBe(-25);
    expect(
      finishRaceRound({ ...active, entries }).entries.every(
        (e) => e.result === "miss",
      ),
    ).toBe(true);
  });
  it("uses hold decoys and keeps totals across ten rounds", () => {
    let state = {
      ...raceRound(entries, 3),
      phase: "active" as const,
      target: 2,
    };
    expect(state.rule).toBe("hold");
    state = raceTap(state, "a", 2, 100) as typeof state;
    const finish = finishRaceRound(state);
    expect(finish.entries.map((e) => [e.result, e.points])).toEqual([
      ["wrong", -25],
      ["held", 75],
    ]);
    const next = raceRound(finish.entries, 4);
    expect(next.entries.map((e) => e.points)).toEqual([-25, 75]);
    expect(
      next.entries.every((e) => e.result === "pending" && e.elapsed === null),
    ).toBe(true);
    expect(raceRound(entries, 7).rule).toBe("hold");
  });
});
describe("game protocol bounds", () => {
  it("validates every game and rejects malformed state and action values", () => {
    for (const kind of ["lobby", "lights", "pong", "reaction"] as const)
      expect(validRoom(newRoom(kind, 1))).toBe(true);
    const room = newRoom("pong", 1);
    room.pong = { ...newPong(["a", "b"]), phase: "playing" };
    expect(validRoom(room)).toBe(true);
    for (const broken of [
      { ...room, epoch: -1 },
      { ...room, kind: "unknown" },
      {
        ...room,
        pong: { ...room.pong, ball: { x: null, y: 0.5, vx: 0.4, vy: 0 } },
      },
      { ...room, pong: { ...room.pong, seats: ["a", "a"] } },
      { ...room, pong: { ...room.pong, score: [8, 0] } },
    ])
      expect(validRoom(broken)).toBe(false);
    const action = {
      v: 2,
      type: "input",
      epoch: 1,
      sequence: 1,
      input: { kind: "target", round: 1, index: 5, elapsed: 300 },
    };
    expect(parseMessage(JSON.stringify(action))?.type).toBe("input");
    for (const input of [
      { kind: "target", round: 0, index: 5, elapsed: 300 },
      { kind: "target", round: 1, index: 6, elapsed: 300 },
      { kind: "target", round: 1, index: 5, elapsed: 2001 },
      { kind: "paddle", position: 1.1 },
      { kind: "paddle", position: null },
    ])
      expect(parseMessage(JSON.stringify({ ...action, input }))).toBeNull();
  });
});
