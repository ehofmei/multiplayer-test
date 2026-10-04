import { describe, expect, it } from "vitest";
import {
  CYCLE_COUNTDOWN,
  CYCLE_LIMIT,
  CYCLE_SIZE,
  cycleDirections,
  newCycle,
  stepCycle,
  turnCycle,
  type CycleDirection,
  type CycleState,
} from "./cycle";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { MAX_MESSAGE, parseMessage } from "../network/protocol";
import { initialGrid } from "../game/grid";
function playing(positions: [number, number, CycleDirection][]): CycleState {
  const state = newCycle(positions.map((_, i) => String(i)));
  const cells = Array<string>(CYCLE_SIZE * CYCLE_SIZE).fill("0");
  state.riders = state.riders.map((r, i) => {
    const [x, y, direction] = positions[i];
    cells[y * CYCLE_SIZE + x] = String(i + 1);
    return { ...r, x, y, direction };
  });
  return { ...state, cells: cells.join(""), phase: "playing", countdown: 0 };
}
const valid = (cycle: CycleState) =>
  validRoom({ ...newRoom("cycle", 1), cycle });
describe("Light-cycle rules", () => {
  it("gives all eight riders distinct starts and a stationary three-second countdown", () => {
    let state = newCycle(Array.from({ length: 8 }, (_, i) => String(i)));
    const before = state.cells;
    expect(new Set(state.riders.map((r) => `${r.x}/${r.y}`)).size).toBe(8);
    for (let i = 0; i < CYCLE_COUNTDOWN; i++) {
      expect(valid(state)).toBe(true);
      state = stepCycle(state);
    }
    expect(state.phase).toBe("playing");
    expect(state.cells).toBe(before);
    state = stepCycle(state);
    expect(state.ticks).toBe(1);
    expect(state.cells).not.toBe(before);
  });
  it("accepts one perpendicular turn per step and ignores reversals, repeats, spectators and paused inputs", () => {
    const initial = playing([
      [5, 5, "right"],
      [20, 20, "left"],
    ]);
    expect(turnCycle(initial, "0", "left")).toBe(initial);
    expect(turnCycle(initial, "0", "right")).toBe(initial);
    expect(turnCycle(initial, "spectator", "up")).toBe(initial);
    const queued = turnCycle(initial, "0", "up");
    expect(turnCycle(queued, "0", "down")).toBe(queued);
    expect(valid(queued)).toBe(true);
    const moved = stepCycle(queued);
    expect(moved.riders[0]).toMatchObject({
      x: 5,
      y: 4,
      direction: "up",
      queued: null,
    });
    const paused: CycleState = { ...moved, phase: "paused" };
    expect(stepCycle(paused)).toBe(paused);
    expect(turnCycle(paused, "0", "left")).toBe(paused);
  });
  it("resolves same-cell head-on collisions simultaneously, independent of player order", () => {
    const state = playing([
      [4, 5, "right"],
      [6, 5, "left"],
    ]);
    const result = stepCycle(state);
    expect(result.phase).toBe("finished");
    expect(result.riders.every((r) => !r.alive)).toBe(true);
    expect(result.cells).toBe(state.cells);
    expect(valid(result)).toBe(true);
  });
  it("crashes both riders swapping cells, and keeps eliminated trails lethal", () => {
    const swapped = stepCycle(
      playing([
        [5, 5, "right"],
        [6, 5, "left"],
      ]),
    );
    expect(swapped.riders.every((r) => !r.alive)).toBe(true);
    const state = playing([
      [1, 0, "up"],
      [5, 5, "right"],
      [20, 20, "left"],
    ]);
    const cells = state.cells.split("");
    cells[5 * 32 + 6] = "1";
    state.cells = cells.join("");
    const result = stepCycle(state);
    expect(result.riders.map((r) => r.alive)).toEqual([false, false, true]);
    expect(valid(result)).toBe(true);
  });
  it("crashes into your own trail and walls, declares the survivor and stops finished rounds", () => {
    let state = playing([
      [0, 0, "left"],
      [5, 5, "right"],
    ]);
    state = stepCycle(state);
    expect(state.riders.map((r) => r.alive)).toEqual([false, true]);
    expect(state.phase).toBe("finished");
    expect(stepCycle(state)).toBe(state);
    let loop = playing([
      [5, 5, "right"],
      [25, 25, "left"],
    ]);
    for (const direction of ["down", "left", "up", "right"] as const)
      loop = stepCycle(turnCycle(loop, "0", direction));
    expect(loop.riders[0].alive).toBe(false);
    expect(valid(loop)).toBe(true);
  });
  it("ends at one minute with surviving riders sharing the win", () => {
    const state = playing([
      [5, 5, "right"],
      [25, 25, "left"],
    ]);
    state.ticks = CYCLE_LIMIT - 1;
    const result = stepCycle(state);
    expect(result.phase).toBe("finished");
    expect(result.riders.every((r) => r.alive)).toBe(true);
    expect(valid(result)).toBe(true);
  });
  it("validates every state during full unattended games for two through eight riders", () => {
    for (let count = 2; count <= 8; count++) {
      let state = newCycle(Array.from({ length: count }, (_, i) => String(i)));
      for (let i = 0; i <= CYCLE_LIMIT + CYCLE_COUNTDOWN; i++) {
        expect(valid(state)).toBe(true);
        state = stepCycle(state);
      }
      expect(state.phase).toBe("finished");
    }
  });
});
describe("Light-cycle protocol bounds", () => {
  it("accepts bounded directions and rejects malformed turns", () => {
    for (const direction of [...cycleDirections, "diagonal", 3, null, {}, ""]) {
      const message = {
        v: 2,
        type: "input",
        epoch: 1,
        sequence: 1,
        input: { kind: "cycle-turn", direction },
      };
      expect(!!parseMessage(JSON.stringify(message))).toBe(
        cycleDirections.some((d) => d === direction),
      );
    }
  });
  it("rejects malformed boards, riders, phases, timers and foreign game state", () => {
    const cycle = playing([
      [5, 5, "right"],
      [25, 25, "left"],
    ]);
    for (const change of [
      { cells: "0" },
      { cells: "9".repeat(1024) },
      { ticks: -1 },
      { ticks: CYCLE_LIMIT + 1 },
      { countdown: 21 },
      { countdown: 1 },
      { phase: "finished" },
      { phase: "ready" },
      { riders: [] },
      { riders: [cycle.riders[0], cycle.riders[0]] },
      { riders: cycle.riders.map((r) => ({ ...r, x: 32 })) },
      { riders: cycle.riders.map((r) => ({ ...r, queued: "left" })) },
    ])
      expect(valid({ ...cycle, ...change } as CycleState)).toBe(false);
    expect(validRoom({ ...newRoom("lights", 0), cycle })).toBe(false);
  });
  it("keeps a dense eight-player snapshot well below the existing message bound", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      id: String(i).repeat(80),
      name: "N".repeat(32),
    }));
    const cycle = newCycle(players.map((p) => p.id));
    const cells = "1".repeat(1024).split("");
    cycle.riders.forEach((r, i) => {
      cells[r.y * 32 + r.x] = String(i + 1);
    });
    cycle.cells = cells.join("");
    const raw = JSON.stringify({
      v: 2,
      type: "state",
      room: { ...newRoom("cycle", 1), cycle },
      grid: initialGrid(),
      players,
    });
    expect(raw.length).toBeLessThan(MAX_MESSAGE / 2);
    expect(parseMessage(raw)).not.toBeNull();
  });
});
