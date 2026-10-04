import { rallyBall } from "./speed";
import { type PongState, clampPaddle } from "./model";

// Clockwise sides: bottom, right, top, left. Positions use canonical x/y axes.
export const sideNames = ["Bottom", "Right", "Top", "Left"];
export const viewPosition = (side: number, position: number) =>
  side === 1 || side === 2 ? 1 - position : position;
export function newArena(seats: string[], startingLives = 5): PongState {
  return {
    phase: "ready",
    startingLives,
    rallySeconds: 0,
    seats,
    serveIn: 1,
    paddles: [0.5, 0.5, 0.5, 0.5],
    score: [0, 0, 0, 0],
    lives: [0, 1, 2, 3].map((i) => (seats[i] ? startingLives : 0)),
    ball: { x: 0.5, y: 0.5, vx: 0.18, vy: 0.38 },
  };
}
export function arenaWinner(state: PongState) {
  return state.seats.find((_, i) => (state.lives?.[i] ?? 0) > 0);
}
export function stepArena(state: PongState, seconds: number): PongState {
  if (state.phase === "serve") {
    const serveIn = Math.max(0, state.serveIn - seconds);
    return { ...state, serveIn, phase: serveIn === 0 ? "playing" : "serve" };
  }
  if (state.phase !== "playing" || !state.lives) return state;
  const rallySeconds = (state.rallySeconds ?? 0) + seconds;
  const old = { ...state.ball, ...rallyBall(state.ball, rallySeconds, 0.9) };
  let { x, y, vx, vy } = old;
  x += vx * seconds;
  y += vy * seconds;
  const crossings = [
    {
      side: 0,
      crossed: vy > 0 && y >= 0.935,
      t: (0.935 - old.y) / (vy * seconds),
    },
    {
      side: 1,
      crossed: vx > 0 && x >= 0.935,
      t: (0.935 - old.x) / (vx * seconds),
    },
    {
      side: 2,
      crossed: vy < 0 && y <= 0.065,
      t: (0.065 - old.y) / (vy * seconds),
    },
    {
      side: 3,
      crossed: vx < 0 && x <= 0.065,
      t: (0.065 - old.x) / (vx * seconds),
    },
  ]
    .filter((hit) => hit.crossed)
    .sort((a, b) => a.t - b.t);
  const hit = crossings[0];
  if (!hit) return { ...state, rallySeconds, ball: { x, y, vx, vy } };
  const vertical = hit.side === 1 || hit.side === 3;
  const along = vertical
    ? old.y + vy * seconds * hit.t
    : old.x + vx * seconds * hit.t;
  const active = state.lives[hit.side] > 0;
  if (active && Math.abs(along - state.paddles[hit.side]) > 0.14) {
    const lives = [...state.lives];
    const score = [...state.score];
    lives[hit.side]--;
    score[hit.side]++;
    const alive = state.seats.map((_, i) => i).filter((i) => lives[i] > 0);
    const total = score.reduce((a, b) => a + b, 0);
    const target = alive[total % alive.length] ?? 0;
    const velocity = [
      [0.18, 0.38],
      [0.38, -0.18],
      [-0.18, -0.38],
      [-0.38, 0.18],
    ][target];
    return {
      ...state,
      lives,
      score,
      phase: alive.length <= 1 ? "finished" : "serve",
      serveIn: 1,
      rallySeconds: 0,
      ball: { x: 0.5, y: 0.5, vx: velocity[0], vy: velocity[1] },
    };
  }
  const face = hit.side < 2 ? 0.935 : 0.065;
  if (vertical) x = face;
  else y = face;
  if (active) {
    const speed = Math.min(0.9, Math.hypot(vx, vy) * 1.12);
    const tangent = ((along - state.paddles[hit.side]) / 0.14) * speed * 0.8;
    const normal = Math.sqrt(speed * speed - tangent * tangent);
    const direction = hit.side < 2 ? -1 : 1;
    if (vertical) {
      vx = direction * normal;
      vy = tangent;
    } else {
      vy = direction * normal;
      vx = tangent;
    }
  } else if (vertical) vx = -vx;
  else vy = -vy;
  return {
    ...state,
    rallySeconds,
    ball: { x: clampPaddleEdge(x), y: clampPaddleEdge(y), vx, vy },
  };
}
const clampPaddleEdge = (n: number) => Math.max(0.065, Math.min(0.935, n));
export function moveArena(state: PongState, id: string, position: number) {
  const side = state.seats.indexOf(id);
  if (
    side < 0 ||
    !state.lives?.[side] ||
    !["serve", "playing"].includes(state.phase)
  )
    return state;
  const paddles = [...state.paddles];
  paddles[side] = clampPaddle(position);
  return { ...state, paddles };
}
