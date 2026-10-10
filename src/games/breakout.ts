import { newArena, stepArena } from "./arena";
import type { PongState } from "./model";

// The core is symmetric: 0.30 court widths, with 0.267 clear ball travel to
// every paddle face. At the speed cap that is at least 445ms before rendering.
export const BREAKOUT_COLUMNS = 5;
export const BREAKOUT_BRICKS = BREAKOUT_COLUMNS ** 2;
export const BREAKOUT_RADIUS = 0.018;
export const BREAKOUT_PACE = {
  start: 0.42,
  ramp: 0.012,
  cap: 0.6,
  paddleGain: 1.04,
};
export const brickBounds = (index: number) => ({
  x: 0.35 + (index % BREAKOUT_COLUMNS) * 0.0625,
  y: 0.35 + Math.floor(index / BREAKOUT_COLUMNS) * 0.0625,
  width: 0.05,
  height: 0.05,
});
export const levelBricks = (level: number) =>
  Array.from({ length: BREAKOUT_BRICKS }, (_, i) =>
    level === 3 || (level === 2 && i % 2 === 0) ? 2 : 1,
  );
function serveBall(side: number, level: number) {
  const speed = 0.38 + level * 0.02;
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
  if (!team || state.phase !== "playing")
    return stepArena(state, seconds, BREAKOUT_PACE);
  // Reuse arena edge collisions, but every occupied side stays active. A miss
  // costs the team one life rather than eliminating the owner of that paddle.
  const next = stepArena(state, seconds, BREAKOUT_PACE);
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
  // Sweep entering faces and choose the earliest contact, including corners.
  // Expanded rectangles retain the original forgiving ball collision shape.
  const dx = next.ball.x - state.ball.x;
  const dy = next.ball.y - state.ball.y;
  let contact: {
    index: number;
    t: number;
    vertical: boolean;
    face: number;
  } | null = null;
  for (let i = 0; i < team.bricks.length; i++) {
    if (!team.bricks[i]) continue;
    const b = brickBounds(i);
    const left = b.x - BREAKOUT_RADIUS,
      right = b.x + b.width + BREAKOUT_RADIUS;
    const top = b.y - BREAKOUT_RADIUS,
      bottom = b.y + b.height + BREAKOUT_RADIUS;
    for (const [vertical, face, entering] of [
      [true, left, state.ball.x <= left && dx > 0],
      [true, right, state.ball.x >= right && dx < 0],
      [false, top, state.ball.y <= top && dy > 0],
      [false, bottom, state.ball.y >= bottom && dy < 0],
    ] as const) {
      if (!entering) continue;
      const t =
        (face - (vertical ? state.ball.x : state.ball.y)) /
        (vertical ? dx : dy);
      const along = vertical ? state.ball.y + dy * t : state.ball.x + dx * t;
      if (
        t < 0 ||
        t > 1 ||
        along < (vertical ? top : left) ||
        along > (vertical ? bottom : right)
      )
        continue;
      if (!contact || t < contact.t) contact = { index: i, t, vertical, face };
    }
  }
  if (contact) {
    const i = contact.index;
    const ball = { ...next.ball };
    if (contact.vertical) {
      ball.x = contact.face - dx * (1 - contact.t);
      ball.vx = -ball.vx;
    } else {
      ball.y = contact.face - dy * (1 - contact.t);
      ball.vy = -ball.vy;
    }
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
