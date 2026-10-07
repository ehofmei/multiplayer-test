import { describe, expect, it } from "vitest";
import { newPong, newRoom, stepPong, type PongState } from "./model";
import { advanceBumpers, bounceBumpers, type PongBumper } from "./pong-bumpers";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";
import { initialGrid } from "../game/grid";
const bumper = (overrides: Partial<PongBumper> = {}): PongBumper => ({
  x: 0.38,
  y: 0.3,
  warning: 0,
  flash: 0,
  hits: 0,
  ...overrides,
});
const playing = (): PongState => ({ ...newPong(["a", "b"]), phase: "playing" });
describe("regular Pong bumpers", () => {
  it("adds four spaced warnings gradually, away from the ball and paddles", () => {
    let s = playing();
    expect(advanceBumpers(s, 7.99, 1 / 120)).toEqual([]);
    for (const time of [8, 14, 20, 26]) {
      s = { ...s, bumpers: advanceBumpers(s, time, 1 / 120) };
      expect(s.bumpers).toHaveLength((time - 8) / 6 + 1);
      expect(s.bumpers!.at(-1)!.warning).toBe(1.5);
      for (const b of s.bumpers!) {
        expect(b.x).toBeGreaterThan(0.3);
        expect(b.x).toBeLessThan(0.7);
        expect(
          Math.hypot(b.x - s.ball.x, (b.y - s.ball.y) * 0.65),
        ).toBeGreaterThan(0.125);
      }
    }
    expect(advanceBumpers(s, 100, 1 / 120)).toHaveLength(4);
    const visiting = {
      ...playing(),
      ball: { x: 0.38, y: 0.3, vx: 0.4, vy: 0 },
    };
    expect(advanceBumpers(visiting, 8, 1 / 120)[0]).toMatchObject({
      x: 0.62,
      y: 0.7,
    });
  });
  it("warnings pass the ball through and delay solidity until the ball clears", () => {
    const s = {
      ...playing(),
      bumpers: [bumper({ warning: 0.001 })],
      ball: { x: 0.38, y: 0.3, vx: 0.4, vy: 0 },
    };
    const pending = advanceBumpers(s, 9, 1 / 120);
    expect(pending[0].warning).toBeGreaterThan(0);
    expect(bounceBumpers(s.ball, pending, 1 / 120).vx).toBe(0.4);
    const clear = advanceBumpers(
      { ...s, ball: { ...s.ball, x: 0.5 } },
      9,
      1 / 120,
    );
    expect(clear[0].warning).toBe(0);
  });
  it("reflects head-on, vertical and grazing impacts using circular court geometry", () => {
    const list = [bumper()];
    const ball = { x: 0.33, y: 0.3, vx: 0.9, vy: 0 };
    const hit = bounceBumpers(ball, list, 1 / 120);
    expect(hit.vx).toBeCloseTo(-0.9);
    expect(hit.vy).toBeCloseTo(0);
    expect(hit.x).toBeLessThan(0.335);
    expect(list[0]).toMatchObject({ hits: 1, flash: 0.24 });
    bounceBumpers(hit, list, 1 / 120);
    expect(list[0].hits).toBe(1);
    const vertical = bounceBumpers(
      { x: 0.38, y: 0.3 - 0.05 / 0.65, vx: 0, vy: 0.9 },
      [bumper()],
      0.02,
    );
    expect(vertical.vy).toBeCloseTo(-0.9);
    const grazing = bounceBumpers(
      { x: 0.33, y: 0.3 + 0.04 / 0.65, vx: 0.9, vy: 0 },
      [bumper()],
      0.05,
    );
    expect(grazing.vy).toBeGreaterThan(0);
    expect(Math.hypot(grazing.vx, grazing.vy * 0.65)).toBeCloseTo(0.9);
    const miss = [bumper()];
    bounceBumpers(
      { x: 0.33, y: 0.3 + 0.046 / 0.65, vx: 0.9, vy: 0 },
      miss,
      0.1,
    );
    expect(miss[0].hits).toBe(0);
  });
  it("caps speed after angled impacts, freezes timers on pause/serve and clears every point including victory", () => {
    const s = {
      ...playing(),
      rallySeconds: 30,
      bumpers: [bumper({ flash: 0.2 })],
      ball: { x: 0.35, y: 0.25, vx: 0.8, vy: 0.4 },
    };
    const next = stepPong(s, 1 / 120);
    expect(Math.hypot(next.ball.vx, next.ball.vy)).toBeLessThanOrEqual(
      0.950001,
    );
    expect(next.bumpers![0].flash).toBe(0.24);
    expect(advanceBumpers(s, 30, 1 / 120)[0].flash).toBeLessThan(0.2);
    const paused = { ...s, phase: "paused" as const };
    expect(stepPong(paused, 10)).toBe(paused);
    const serve = stepPong({ ...s, phase: "serve" }, 0.5);
    expect(serve.bumpers).toEqual(s.bumpers);
    expect(serve.rallySeconds).toBe(30);
    for (const score of [
      [0, 0],
      [0, 6],
    ]) {
      const point = stepPong(
        { ...s, score, ball: { x: -0.024, y: 0.5, vx: -0.5, vy: 0 } },
        1 / 120,
      );
      expect(point.bumpers).toEqual([]);
      expect(point.rallySeconds).toBe(0);
      expect(point.phase).toBe(score[1] === 6 ? "finished" : "serve");
    }
  });
  it("keeps a full minute of fixed-step rallies bounded and valid with repeated impacts", () => {
    let s = playing();
    let maxBumpers = 0,
      hits = 0;
    for (let step = 0; step < 60 * 120; step++) {
      s = stepPong(
        {
          ...s,
          paddles: [s.ball.y, s.ball.y].map((y) =>
            Math.max(0.12, Math.min(0.88, y)),
          ),
        },
        1 / 120,
      );
      maxBumpers = Math.max(maxBumpers, s.bumpers!.length);
      hits = Math.max(
        hits,
        s.bumpers!.reduce((sum, b) => sum + b.hits, 0),
      );
      expect(s.phase).toBe("playing");
      expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeLessThanOrEqual(0.950001);
      expect(validRoom({ ...newRoom("pong", 1), pong: s })).toBe(true);
    }
    expect(maxBumpers).toBe(4);
    expect(hits).toBeGreaterThan(3);
  });
  it("validates bounded bumper snapshots through the wire parser and accepts older hosts", () => {
    const room = {
      ...newRoom("pong", 1),
      pong: { ...playing(), bumpers: [bumper()] },
    };
    const parse = (pong: unknown) =>
      parseMessage(
        JSON.stringify({
          v: 2,
          type: "state",
          room: { ...room, pong },
          grid: initialGrid(),
          players: [{ id: "a", name: "A" }],
        }),
      );
    expect(parse(room.pong)?.type).toBe("state");
    expect(parse({ ...room.pong, bumpers: undefined })?.type).toBe("state");
    for (const bumpers of [
      null,
      {},
      Array(5).fill(bumper()),
      [bumper(), bumper()],
      ...[
        { x: 0.1 },
        { y: 0.99 },
        { warning: -1 },
        { warning: 1.6 },
        { flash: 1 },
        { hits: -1 },
        { hits: 1.5 },
        { hits: 1_000_001 },
        { x: NaN },
        { y: Infinity },
      ].map((b) => [bumper(b)]),
    ])
      expect(parse({ ...room.pong, bumpers })).toBeNull();
    expect(
      validRoom({
        ...newRoom("arena", 1),
        pong: { ...newRoom("arena", 1).pong!, bumpers: [bumper()] },
      }),
    ).toBe(false);
    expect(parse({ ...room.pong, phase: "finished" })).toBeNull();
  });
});
