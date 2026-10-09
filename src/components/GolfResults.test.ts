import { describe, expect, it } from "vitest";
import { newGolf } from "../games/minigolf";
import { golfRanking } from "./GolfResults";
describe("Golf final rankings", () => {
  it("sums five holes, orders leaders first and shares competition ranks without changing the roster", () => {
    const balls = newGolf(["a", "b", "c", "d"]).balls;
    balls[0].scores = [100, 50, 20, 0, 30];
    balls[1].scores = [100, 100, 0, 0, 0];
    balls[2].scores = [20, 20, 20, 20, 20];
    balls[3].scores = [100, 100, 100, 100, 100];
    expect(
      golfRanking(balls).map((r) => [r.ball.id, r.total, r.rank, r.winner]),
    ).toEqual([
      ["d", 500, 1, true],
      ["a", 200, 2, false],
      ["b", 200, 2, false],
      ["c", 100, 4, false],
    ]);
    expect(balls.map((b) => b.id)).toEqual(["a", "b", "c", "d"]);
    const tie = golfRanking(newGolf(["a", "b"]).balls);
    expect(tie.every((r) => r.winner && r.rank === 1)).toBe(true);
    expect(golfRanking([])).toEqual([]);
  });
});
