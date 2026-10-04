import { describe, expect, it } from "vitest";
import {
  launchShip,
  newShip,
  setShipControl,
  stepShip,
  MISSION_MS,
} from "./ship";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";
const random = () => 0;
const room = (ship = launchShip(["a", "b"], random)) => ({
  ...newRoom("ship", 1),
  ship,
});
describe("Spaceship Panic", () => {
  it("splits three named controls per device and sends conflict-free orders to teammates", () => {
    for (const count of [1, 2, 8]) {
      const crew = Array.from({ length: count }, (_, i) => `p${i}`);
      const s = launchShip(crew, random);
      expect(s.controls).toHaveLength(count * 3);
      expect(s.orders).toHaveLength(count);
      for (const [i, o] of s.orders.entries()) {
        expect(s.controls[o.control].owner).toBe(crew[(i + 1) % count]);
        expect(o.value).not.toBe(s.controls[o.control].value);
      }
      expect(new Set(s.orders.map((o) => o.control)).size).toBe(count);
      expect(validRoom(room(s))).toBe(true);
    }
  });
  it("allows only owners to change controls, ignores repeated/stale revisions and rewards a repair once", () => {
    const s = launchShip(["a", "b"], random);
    const order = s.orders[0];
    expect(setShipControl(s, "a", order.control, order.value, 0)).toBe(s);
    const done = setShipControl(
      { ...s, hull: 80 },
      "b",
      order.control,
      order.value,
      0,
    );
    expect(done.hull).toBe(83);
    expect(done.repairs).toBe(1);
    expect(done.orders[0].status).toBe("done");
    expect(setShipControl(done, "b", order.control, 2, 0)).toBe(done);
    expect(setShipControl(done, "b", order.control, order.value, 1)).toBe(done);
    const next = stepShip(done, 2000, random);
    expect(next.orders[0].status).toBe("pending");
    expect(next.orders[0].value).not.toBe(
      next.controls[next.orders[0].control].value,
    );
    expect(done.orders[0].status).toBe("done");
  });
  it("charges wrong requested settings, permits unrelated controls, and keeps hull bounded", () => {
    const s = launchShip(["a", "b"], random);
    const wrong = setShipControl(s, "b", 3, 2, 0);
    expect(wrong.hull).toBe(95);
    expect(wrong.mistakes).toBe(1);
    expect(wrong.orders[0].status).toBe("pending");
    expect(setShipControl(s, "b", 4, 2, 0).hull).toBe(100);
    expect(setShipControl(wrong, "b", 3, 1, 1).hull).toBe(98);
    const loss = setShipControl({ ...s, hull: 5 }, "b", 3, 2, 0);
    expect(loss.hull).toBe(0);
    expect(loss.phase).toBe("finished");
    for (const value of [-1, 4, NaN])
      expect(setShipControl(s, "b", 3, value, 0)).toBe(s);
    expect(setShipControl(s, "b", 24, 1, 0)).toBe(s);
  });
  it("times out orders once, ramps urgency, pauses and finishes with win or loss", () => {
    const s = launchShip(["a", "b"], random);
    const expired = stepShip(s, 18000, random);
    expect(expired.hull).toBe(70);
    expect(expired.mistakes).toBe(2);
    expect(expired.orders.every((o) => o.status === "missed")).toBe(true);
    const again = stepShip(expired, 2000, random);
    expect(again.hull).toBe(70);
    expect(again.orders[0].remaining).toBeLessThan(18000);
    const paused = { ...s, phase: "paused" as const };
    expect(stepShip(paused, 5000)).toBe(paused);
    expect(setShipControl(paused, "b", 3, 1, 0)).toBe(paused);
    const win = stepShip({ ...s, remaining: 250 }, 250, random);
    expect(win.phase).toBe("finished");
    expect(win.hull).toBe(100);
    expect(validRoom(room(win))).toBe(true);
    expect(stepShip(win, 1000)).toBe(win);
    const loss = stepShip({ ...s, hull: 10 }, 18000, random);
    expect(loss.phase).toBe("finished");
    expect(loss.hull).toBe(0);
  });
  it("survives a full mission with cooperating owners and keeps all snapshots valid", () => {
    let s = launchShip(["a", "b", "c", "d", "e", "f", "g", "h"], () => 0.9);
    for (let elapsed = 0; elapsed < MISSION_MS; elapsed += 250) {
      for (const o of s.orders) {
        if (o.status !== "pending") continue;
        const c = s.controls[o.control];
        s = setShipControl(s, c.owner, o.control, o.value, c.revision);
      }
      s = stepShip(s, 250, () => 0.9);
      expect(validRoom(room(s))).toBe(true);
    }
    expect(s.phase).toBe("finished");
    expect(s.hull).toBe(100);
    expect(s.repairs).toBeGreaterThan(100);
  });
  it("validates bounded inputs and rejects malformed controls, callers, timers and terminal states", () => {
    const s = launchShip(["a", "b"], random);
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
    const message = {
      v: 2,
      type: "state",
      room: room(s),
      grid: { revision: 0, cells: Array(16).fill(false) },
      players: [],
    };
    expect(parseMessage(JSON.stringify(message))).not.toBeNull();
    for (const patch of [
      { hull: 101 },
      { remaining: -1 },
      { remaining: Infinity },
      { crew: ["a", "a"] },
      { controls: [] },
      { phase: "finished" as const },
      { orders: [...s.orders, s.orders[0]] },
    ])
      expect(validRoom(room({ ...s, ...patch }))).toBe(false);
    expect(
      validRoom(
        room({ ...s, orders: s.orders.map((o) => ({ ...o, control: 0 })) }),
      ),
    ).toBe(false);
    expect(
      validRoom(
        room({
          ...s,
          controls: s.controls.map((c) => ({ ...c, owner: "intruder" })),
        }),
      ),
    ).toBe(false);
  });
});
