import { newArena, stepArena } from "./arena";
import type { PongState } from "./model";

// A fixed central grid leaves a clear lane between the bricks and every paddle.
export const brickBounds = (index: number) => ({
  x: 0.32 + (index % 4) * 0.09,
  y: 0.32 + Math.floor(index / 4) * 0.09,
  width: 0.075,
  height: 0.075,
});
export const levelBricks = (level: number) =>
  Array.from({ length: 16 }, (_, i) =>
    level === 3 || (level === 2 && i % 2 === 0) ? 2 : 1,
  );
function serveBall(side: number, level: number) {
  const speed = 0.36 + level * 0.04;
  return [
    { x: 0.5, y: 0.8, vx: 0.13, vy: -speed },
    { x: 0.8, y: 0.5, vx: -speed, vy: -0.13 },
    { x: 0.5, y: 0.2, vx: -0.13, vy: speed },
    { x: 0.2, y: 0.5, vx: speed, vy: 0.13 },
  ][side];
}
export function newBreakout(seats: string[]): PongState {
  return {
    ...newArena(seats),
    ball: serveBall(0, 1),
    breakout: { level: 1, lives: 5, bricks: levelBricks(1) },
  };
}
export function stepBreakout(state: PongState, seconds: number): PongState {
  const team = state.breakout;
  if (!team || state.phase !== "playing") return stepArena(state, seconds);
  // Reuse arena edge collisions, but every occupied side stays active. A miss
  // costs the team one life rather than eliminating the owner of that paddle.
  const next = stepArena(state, seconds);
  if (next.score.some((n, i) => n !== state.score[i])) {
    const lives = team.lives - 1;
    return {
      ...state,
      breakout: { ...team, lives },
      phase: lives === 0 ? "finished" : "serve",
      serveIn: 1,
      rallySeconds: 0,
      ball: serveBall((5 - lives) % state.seats.length, team.level),
    };
  }
  const radius = 0.018;
  for (let i = 0; i < team.bricks.length; i++) {
    if (!team.bricks[i]) continue;
    const b = brickBounds(i);
    const left = b.x - radius,
      right = b.x + b.width + radius;
    const top = b.y - radius,
      bottom = b.y + b.height + radius;
    const ball = { ...next.ball };
    if (ball.x < left || ball.x > right || ball.y < top || ball.y > bottom)
      continue;
    // Resolve only an entering face, so an overlapping ball cannot damage a
    // brick repeatedly. Fixed 120 Hz steps are much smaller than a brick.
    if (state.ball.x <= left && ball.vx > 0) {
      ball.x = left;
      ball.vx = -Math.abs(ball.vx);
    } else if (state.ball.x >= right && ball.vx < 0) {
      ball.x = right;
      ball.vx = Math.abs(ball.vx);
    } else if (state.ball.y <= top && ball.vy > 0) {
      ball.y = top;
      ball.vy = -Math.abs(ball.vy);
    } else if (state.ball.y >= bottom && ball.vy < 0) {
      ball.y = bottom;
      ball.vy = Math.abs(ball.vy);
    } else continue;
    const bricks = [...team.bricks];
    bricks[i]--;
    if (bricks.every((n) => n === 0)) {
      const finished = team.level === 3;
      const level = finished ? 3 : team.level + 1;
      return {
        ...next,
        phase: finished ? "finished" : "serve",
        serveIn: 1,
        rallySeconds: 0,
        ball: serveBall((level - 1) % state.seats.length, level),
        breakout: {
          ...team,
          level,
          bricks: finished ? bricks : levelBricks(level),
        },
      };
    }
    return { ...next, ball, breakout: { ...team, bricks } };
  }
  return next;
}
