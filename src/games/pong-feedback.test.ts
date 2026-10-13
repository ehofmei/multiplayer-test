import { describe, expect, it } from "vitest";
import { newPong, newRoom, stepPong, type PongState } from "./model";
import { pongFeedback, pongFrame } from "./pong-feedback";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";

const playing = (): PongState => ({ ...newPong(["a", "b"]), phase: "playing" });
describe("confirmed ordinary Pong feedback", () => {
  it.each([
    [0.067, 0.5, -0.42, 0, "paddle", 0.065, 0.5],
    [0.933, 0.5, 0.42, 0, "paddle", 0.935, 0.5],
    [0.5, 0.026, 0.4, -0.3, "wall", null, 0.025],
    [0.5, 0.974, 0.4, 0.3, "wall", null, 0.975],
  ])(
    "confirms a %s/%s collision at its boundary",
    (x, y, vx, vy, kind, hitX, hitY) => {
      const state = stepPong(
        {
          ...playing(),
          ball: { x: Number(x), y: Number(y), vx: Number(vx), vy: Number(vy) },
        },
        1 / 120,
      );
      expect(state.pongContact).toMatchObject({ sequence: 1, kind, y: hitY });
      if (hitX !== null) expect(state.pongContact?.x).toBe(hitX);
      expect(
        pongFeedback(pongFrame(playing()), pongFrame(state)).contact,
      ).toEqual(state.pongContact);
    },
  );
  it("does not invent a contact for a miss or bumper rebound", () => {
    const state = playing();
    const miss = stepPong(
      { ...state, ball: { x: 0.067, y: 0.8, vx: -0.42, vy: 0 } },
      1 / 120,
    );
    expect(miss.pongContact).toBeUndefined();
    const bumper = stepPong(
      {
        ...state,
        bumpers: [{ x: 0.5, y: 0.5, warning: 0, flash: 0, hits: 0 }],
        ball: { x: 0.454, y: 0.5, vx: 0.42, vy: 0 },
      },
      1 / 120,
    );
    expect(bumper.bumpers?.[0].hits).toBe(1);
    expect(bumper.ball.vx).toBeLessThan(0);
    expect(bumper.pongContact).toBeUndefined();
  });
  it("prioritizes the paddle at a simultaneous wall contact and retains a monotonic sequence through points", () => {
    const state = {
      ...playing(),
      paddles: [0.12, 0.5],
      pongContact: { sequence: 8, kind: "wall" as const, x: 0.5, y: 0.025 },
    };
    const contact = stepPong(
      { ...state, ball: { x: 0.067, y: 0.026, vx: -0.42, vy: -0.3 } },
      1 / 120,
    );
    expect(contact.pongContact).toMatchObject({
      sequence: 9,
      kind: "paddle",
      x: 0.065,
    });
    const point = stepPong(
      { ...contact, ball: { x: -0.024, y: 0.8, vx: -0.42, vy: 0 } },
      1 / 120,
    );
    expect(point.score).toEqual([0, 1]);
    expect(point.pongContact?.sequence).toBe(9);
    expect(newPong(["a", "b"]).pongContact).toBeUndefined();
  });
  it("deduplicates and suppresses late join, stale, paused and serve contacts; gives points priority", () => {
    const before = pongFrame(playing());
    const after = pongFrame({
      ...playing(),
      pongContact: { sequence: 4, kind: "wall", x: 0.4, y: 0.025 },
    });
    expect(pongFeedback(before, after).contact?.sequence).toBe(4);
    for (const previous of [
      null,
      after,
      { ...after, contact: { ...after.contact!, sequence: 5 } },
      { ...before, phase: "paused" as const },
      { ...before, phase: "serve" as const },
    ])
      expect(pongFeedback(previous, after)).toEqual({
        contact: null,
        point: null,
      });
    expect(pongFeedback(before, { ...after, phase: "paused" })).toEqual({
      contact: null,
      point: null,
    });
    expect(
      pongFeedback(before, { ...after, phase: "serve", score: [0, 2] }),
    ).toEqual({ contact: null, point: { seat: 1, gain: 2 } });
    expect(
      pongFeedback(before, { ...after, phase: "finished", score: [7, 0] }),
    ).toEqual({ contact: null, point: { seat: 0, gain: 7 } });
  });
  it("validates optional bounded regular-Pong metadata and rejects it for other games", () => {
    const room = newRoom("pong", 1);
    room.pong = {
      ...playing(),
      pongContact: { sequence: 1, kind: "paddle", x: 0.065, y: 0.5 },
    };
    expect(validRoom(room)).toBe(true);
    expect(
      parseMessage(
        JSON.stringify({
          v: 2,
          type: "state",
          room,
          grid: { cells: Array(16).fill(false), revision: 0 },
          players: [],
        }),
      ),
    ).not.toBeNull();
    for (const patch of [
      { sequence: 0 },
      { sequence: 1_000_001 },
      { sequence: 1.5 },
      { kind: "bumper" },
      { x: -0.1 },
      { y: 1.1 },
      { x: NaN },
    ]) {
      expect(
        validRoom({
          ...room,
          pong: {
            ...room.pong,
            pongContact: { ...room.pong.pongContact, ...patch },
          },
        }),
      ).toBe(false);
    }
    for (const kind of ["arena", "breakout"] as const) {
      const other = newRoom(kind, 1);
      other.pong!.pongContact = room.pong.pongContact;
      expect(validRoom(other)).toBe(false);
    }
    delete room.pong.pongContact;
    expect(validRoom(room)).toBe(true);
  });
});
