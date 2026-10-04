import { describe, expect, it } from "vitest";
import { brickBounds, newBreakout, stepBreakout } from "./breakout";
import { movePaddle, newRoom } from "./model";
import { validRoom } from "./validate";
import { parseMessage } from "../network/protocol";
const playing = () => ({
  ...newBreakout(["a", "b"]),
  phase: "playing" as const,
});
describe("Co-op Breakout", () => {
  it("damages entering bricks on all four faces and reflects the ball", () => {
    const b = brickBounds(0);
    for (const [x, y, vx, vy] of [
      [b.x - 0.02, b.y + 0.035, 0.4, 0],
      [b.x + b.width + 0.02, b.y + 0.035, -0.4, 0],
      [b.x + 0.035, b.y - 0.02, 0, 0.4],
      [b.x + 0.035, b.y + b.height + 0.02, 0, -0.4],
    ]) {
      const s = playing();
      s.ball = { x, y, vx, vy };
      s.breakout!.bricks[0] = 2;
      const n = stepBreakout(s, 1 / 120);
      expect(n.breakout!.bricks[0]).toBe(1);
      expect(n.ball.vx * vx + n.ball.vy * vy).toBeLessThan(0);
      expect(s.breakout!.bricks[0]).toBe(2);
      expect(stepBreakout(n, 1 / 120).breakout!.bricks[0]).toBe(1);
    }
  });
  it("shares misses, retains teammates, and ends only at zero lives", () => {
    for (const ball of [
      { x: 0.8, y: 0.933, vx: 0, vy: 0.4 },
      { x: 0.933, y: 0.8, vx: 0.4, vy: 0 },
    ]) {
      let s = playing();
      s.ball = ball;
      const miss = stepBreakout(s, 1 / 120);
      expect(miss.breakout!.lives).toBe(4);
      expect(miss.lives).toEqual(s.lives);
      expect(miss.score).toEqual([0, 0, 0, 0]);
      expect(miss.phase).toBe("serve");
      expect(movePaddle(miss, "a", 0.8).paddles[0]).toBe(0.8);
      s = { ...s, breakout: { ...s.breakout!, lives: 1 } };
      const loss = stepBreakout(s, 1 / 120);
      expect(loss.phase).toBe("finished");
      expect(loss.breakout!.lives).toBe(0);
      expect(stepBreakout(loss, 1)).toBe(loss);
    }
  });
  it("makes empty edges walls and freezes paused games", () => {
    const s = { ...playing(), ball: { x: 0.8, y: 0.067, vx: 0, vy: -0.4 } };
    const n = stepBreakout(s, 1 / 120);
    expect(n.ball.vy).toBeGreaterThan(0);
    expect(n.breakout!.lives).toBe(5);
    const paused = { ...s, phase: "paused" as const };
    expect(stepBreakout(paused, 1)).toBe(paused);
    expect(stepBreakout({ ...s, phase: "serve" }, 1).phase).toBe("playing");
  });
  it("advances three levels, preserves shared lives and wins together", () => {
    for (const level of [1, 2, 3]) {
      const s = playing();
      s.breakout = { level, lives: 3, bricks: [1, ...Array(15).fill(0)] };
      s.ball = { x: 0.35, y: 0.3, vx: 0, vy: 0.4 };
      const n = stepBreakout(s, 1 / 120);
      expect(n.breakout!.lives).toBe(3);
      expect(n.breakout!.level).toBe(Math.min(3, level + 1));
      expect(n.phase).toBe(level === 3 ? "finished" : "serve");
      expect(n.breakout!.bricks.every((hp) => hp === 0)).toBe(level === 3);
      expect(validRoom({ ...newRoom("breakout", 1), pong: n })).toBe(true);
    }
  });
  it("validates network snapshots and rejects malformed shared state", () => {
    const room = { ...newRoom("breakout", 1), pong: playing() };
    const message = {
      v: 2,
      type: "state",
      room,
      grid: { revision: 0, cells: Array(16).fill(false) },
      players: [],
    };
    expect(parseMessage(JSON.stringify(message))).not.toBeNull();
    for (const patch of [
      { lives: -1 },
      { lives: 6 },
      { level: 4 },
      { bricks: [1] },
      { bricks: Array(16).fill(3) },
      { bricks: Array(16).fill(null) },
    ]) {
      expect(
        validRoom({
          ...room,
          pong: { ...room.pong, breakout: { ...room.pong.breakout, ...patch } },
        }),
      ).toBe(false);
    }
    expect(
      validRoom({ ...room, pong: { ...room.pong, seats: ["a", "a"] } }),
    ).toBe(false);
    expect(validRoom(newRoom("breakout", 1))).toBe(true);
  });
  it("keeps every fixed-step snapshot bounded through a complete solo run", () => {
    let s = {
      ...newBreakout(["a"]),
      phase: "serve" as import("./model").PongState["phase"],
    };
    for (let i = 0; i < 40000 && s.phase !== "finished"; i++) {
      s = stepBreakout(s, 1 / 120);
      expect(validRoom({ ...newRoom("breakout", 1), pong: s })).toBe(true);
    }
    expect(s.phase).toBe("finished");
  });
});
