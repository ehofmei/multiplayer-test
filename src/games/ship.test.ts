import { describe, expect, it } from "vitest";
import {
  launchShip,
  newShip,
  setShipControl,
  stepShip,
  shipDeadline,
  shipFeedback,
  type ShipState,
} from "./ship";
import { shipPanels, validShipSetting } from "./ship-controls";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";
const random = () => 0;
const room = (ship = launchShip(["a", "b"], random)) => ({
  ...newRoom("ship", 1),
  ship,
});
function complete(state: ShipState, index = 0) {
  const order = state.orders[index],
    panel = state.controls[order.control];
  return setShipControl(
    state,
    panel.owner,
    order.control,
    order.value,
    panel.revision,
  );
}
function seeded(seed = 29) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
describe("Spaceship Panic score chase", () => {
  it("defaults to two minutes and gives every crew member a mixed, uniquely named set", () => {
    expect(newShip().duration).toBe(120_000);
    expect(new Set(shipPanels.map((p) => p.name)).size).toBe(24);
    for (let i = 0; i < 24; i += 3) {
      expect(["color", "number"]).toContain(shipPanels[i].kind);
      expect(["shape", "direction", "picture"]).toContain(
        shipPanels[i + 1].kind,
      );
      expect(shipPanels[i + 2].kind).toBe("switch");
    }
    expect(newShip([], 4).duration).toBe(120_000);
  });
  it("randomizes recipients with no self assignment or conflicts, including concurrent renewals", () => {
    for (let count = 1; count <= 8; count++) {
      const rng = seeded();
      const crew = Array.from({ length: count }, (_, i) => `p${i}`);
      let state = launchShip(crew, rng, 3);
      const seen = new Set<string>();
      for (let round = 0; round < 40; round++) {
        expect(state.orders).toHaveLength(count);
        expect(new Set(state.orders.map((o) => o.control)).size).toBe(count);
        for (const order of state.orders) {
          const panel = state.controls[order.control];
          if (count > 1) expect(panel.owner).not.toBe(order.caller);
          else expect(panel.owner).toBe(order.caller);
          expect(order.value).not.toBe(panel.value);
          if (order.caller === "p0") seen.add(panel.owner);
        }
        expect(validRoom(room(state))).toBe(true);
        for (let i = 0; i < count; i++) state = complete(state, i);
        state = stepShip(state, 3000, rng);
      }
      expect(seen.size).toBe(count === 1 ? 1 : count - 1);
    }
  });
  it("validates every setting family and requests only a different valid setting", () => {
    const rng = seeded();
    let state = launchShip(
      Array.from({ length: 8 }, (_, i) => `p${i}`),
      rng,
      3,
    );
    for (let i = 0; i < 24; i++) {
      for (const invalid of [-1, shipPanels[i].settings.length, 1.5, NaN])
        expect(
          setShipControl(state, state.controls[i].owner, i, invalid, 0),
        ).toBe(state);
      for (let value = 1; value < shipPanels[i].settings.length; value++) {
        const panel = state.controls[i];
        state = setShipControl(state, panel.owner, i, value, panel.revision);
        expect(state.controls[i].value).toBe(value);
        expect(validRoom(room(state))).toBe(true);
      }
    }
    expect(validShipSetting(2, 2)).toBe(false);
    expect(validShipSetting(0, 3)).toBe(true);
  });
  it("scores once, preserves ownership/revision guards, and caps the consecutive-success bonus", () => {
    let state = launchShip(["a", "b"], random, 3);
    const order = state.orders[0];
    expect(setShipControl(state, "a", order.control, order.value, 0)).toBe(
      state,
    );
    state = complete(state);
    expect(state.score).toBe(100);
    expect(state.completed).toBe(1);
    expect(state.orders[0].award).toBe(100);
    expect(setShipControl(state, "b", order.control, 2, 0)).toBe(state);
    expect(setShipControl(state, "b", order.control, order.value, 1)).toBe(
      state,
    );
    state = complete(state, 1);
    expect(state.score).toBe(220);
    for (let i = 2; i < 15; i++) {
      state = stepShip(state, 3000, random);
      state = complete(state);
      if (i + 1 < 15) {
        state = complete(state, 1);
        i++;
      }
    }
    expect(state.streak).toBe(15);
    expect(state.bestStreak).toBe(15);
    expect(state.orders[0].award).toBe(300);
    expect(validRoom(room(state))).toBe(true);
  });
  it("wrong requests reset the streak without losing score; unrelated panels are harmless", () => {
    let state = complete(launchShip(["a", "b"], random));
    const unrelated = setShipControl(state, "b", 4, 1, 0);
    expect(unrelated.score).toBe(100);
    expect(unrelated.streak).toBe(1);
    expect(unrelated.mistakes).toBe(0);
    const wrong = setShipControl(state, "a", 0, 2, 0);
    expect(wrong.score).toBe(100);
    expect(wrong.streak).toBe(0);
    expect(wrong.bestStreak).toBe(1);
    expect(wrong.mistakes).toBe(1);
    expect(wrong.controls[0].wrong).toBe(true);
    expect(wrong.orders[1].status).toBe("pending");
    state = complete(wrong, 1);
    expect(state.score).toBe(200);
    expect(state.controls[0].wrong).toBe(false);
  });
  it("misses count once, freeze when paused, and never end a mission early", () => {
    const initial = launchShip(["a", "b"], random);
    let state = stepShip(initial, 18_000, random);
    expect(state.mistakes).toBe(2);
    expect(state.orders.every((o) => o.status === "missed")).toBe(true);
    state = stepShip(state, 2000, random);
    expect(state.mistakes).toBe(2);
    const paused = { ...state, phase: "paused" as const };
    expect(stepShip(paused, 5000)).toBe(paused);
    expect(setShipControl(paused, "b", 3, 1, 0)).toBe(paused);
    while (state.remaining > 0) state = stepShip(state, 1000, random);
    expect(state.phase).toBe("finished");
    expect(state.score).toBe(0);
    expect(state.remaining).toBe(0);
    expect(validRoom(room(state))).toBe(true);
    expect(stepShip(state, 1000)).toBe(state);
  });
  it("ramps deadline and command turnover relative to every duration in both difficulties", () => {
    for (const difficulty of ["gentle", "standard"] as const)
      for (const minutes of [1, 2, 3]) {
        const start = launchShip(["a"], random, minutes, difficulty);
        const halfway = { ...start, remaining: start.duration / 2 };
        const end = { ...start, remaining: 0 };
        expect(shipDeadline(start)).toBe(
          difficulty === "gentle" ? 26000 : 18000,
        );
        expect(shipDeadline(halfway)).toBe(
          difficulty === "gentle" ? 20000 : 13000,
        );
        expect(shipDeadline(end)).toBe(difficulty === "gentle" ? 14000 : 8000);
        expect(shipFeedback(start)).toBe(difficulty === "gentle" ? 3000 : 2000);
        expect(shipFeedback(end)).toBe(difficulty === "gentle" ? 2000 : 1000);
        let state = start;
        for (let elapsed = 0; elapsed < start.duration; elapsed += 250) {
          if (state.orders[0].status === "pending") state = complete(state);
          state = stepShip(state, 250, random);
          expect(validRoom(room(state))).toBe(true);
        }
        expect(state.phase).toBe("finished");
        expect(state.completed).toBeGreaterThan(15);
        expect(state.bestStreak).toBe(state.completed);
      }
  });
  it("rejects malformed and legacy snapshots and impossible two-state network actions", () => {
    const state = launchShip(["a", "b"], random);
    expect(validRoom(room(newShip()))).toBe(true);
    const input = {
      v: 2,
      type: "input",
      epoch: 1,
      sequence: 1,
      input: { kind: "ship-control", control: 3, value: 1, revision: 0 },
    };
    expect(parseMessage(JSON.stringify(input))).not.toBeNull();
    for (const patch of [
      { control: 24 },
      { control: 2, value: 2 },
      { value: 4 },
      { revision: -1 },
      { value: 1.5 },
      { revision: 100001 },
    ])
      expect(
        parseMessage(
          JSON.stringify({ ...input, input: { ...input.input, ...patch } }),
        ),
      ).toBeNull();
    for (const patch of [
      { rules: undefined },
      { duration: 90000 },
      { remaining: 120001 },
      { remaining: -1 },
      { score: -1 },
      { score: 100 },
      { streak: 1 },
      { difficulty: "hard" },
      { crew: ["a", "a"] },
      { controls: [] },
      { phase: "finished" },
      { orders: [...state.orders, state.orders[0]] },
    ])
      expect(validRoom(room({ ...state, ...patch } as ShipState))).toBe(false);
    expect(
      validRoom(
        room({
          ...state,
          controls: state.controls.map((c) => ({ ...c, owner: "intruder" })),
        }),
      ),
    ).toBe(false);
    const invalidOrder = (control: number, value: number) => ({
      ...state,
      orders: state.orders.map((o, i) =>
        i === 0 ? { ...o, control, value } : o,
      ),
    });
    expect(validRoom(room(invalidOrder(0, 1)))).toBe(false); // Self assignment.
    expect(validRoom(room(invalidOrder(5, 2)))).toBe(false); // Impossible switch value.
    const message = {
      v: 2,
      type: "state",
      room: room(state),
      grid: { revision: 0, cells: Array(16).fill(false) },
      players: [],
    };
    expect(parseMessage(JSON.stringify(message))).not.toBeNull();
    expect(
      parseMessage(
        JSON.stringify({
          ...message,
          room: room({ ...state, rules: undefined } as unknown as ShipState),
        }),
      ),
    ).toBeNull();
  });
});
