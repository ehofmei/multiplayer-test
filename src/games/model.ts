import {
  newTreasure,
  type TreasureState,
  type TreasureChoice,
} from "./treasure";
import { newBakery, type BakeryState } from "./bakery";
import { newSumo, type SumoState } from "./sumo";
import { newCycle, type CycleState, type CycleDirection } from "./cycle";
import { newShip, type ShipState } from "./ship";
import { rallyBall } from "./speed";
import { newBreakout } from "./breakout";
import { newArena } from "./arena";
export type GameKind =
  | "lobby"
  | "lights"
  | "pong"
  | "arena"
  | "breakout"
  | "reaction"
  | "ship"
  | "cycle"
  | "sumo"
  | "bakery"
  | "treasure";
export interface PongState {
  phase: "ready" | "serve" | "playing" | "paused" | "finished";
  seats: string[];
  paddles: number[];
  score: number[];
  lives?: number[];
  startingLives?: number;
  breakout?: { level: number; lives: number; bricks: number[] };
  rallySeconds?: number;
  ball: { x: number; y: number; vx: number; vy: number };
  serveIn: number;
}
export interface RaceEntry {
  id: string;
  points: number;
  result: "pending" | "hit" | "wrong" | "early" | "miss" | "held";
  elapsed: number | null;
}
export interface RaceState {
  phase: "ready" | "waiting" | "active" | "results" | "finished";
  round: number;
  rule: "hit" | "hold";
  target: number;
  entries: RaceEntry[];
}
export interface Room {
  epoch: number;
  kind: GameKind;
  notice: string;
  pong: PongState | null;
  race: RaceState | null;
  ship?: ShipState | null;
  cycle?: CycleState | null;
  sumo?: SumoState | null;
  bakery?: BakeryState | null;
  treasure?: TreasureState | null;
}
export type GameInput =
  | { kind: "dive-choice"; dive: number; door: number; choice: TreasureChoice }
  | { kind: "bakery-pick"; round: number; pick: number; index: number }
  | { kind: "sumo-move"; x: number; y: number }
  | { kind: "sumo-dash" }
  | { kind: "cycle-turn"; direction: CycleDirection }
  | { kind: "color"; color: import("./colors").PaddleColor }
  | { kind: "paddle"; position: number }
  | { kind: "ship-control"; control: number; value: number; revision: number }
  | { kind: "target"; round: number; index: number; elapsed: number };
export const gameNames: Record<GameKind, string> = {
  lobby: "Game night",
  lights: "Shared Lights",
  pong: "Pong",
  arena: "Arena Pong",
  breakout: "Co-op Breakout",
  reaction: "Reaction Race",
  ship: "Spaceship Panic",
  cycle: "Light-cycle Arena",
  sumo: "Sumo Bumpers",
  bakery: "Midnight Bakery",
  treasure: "Treasure Dive",
};
export function newRoom(kind: GameKind, epoch: number): Room {
  return {
    epoch,
    kind,
    notice: "",
    treasure: kind === "treasure" ? newTreasure() : null,
    bakery: kind === "bakery" ? newBakery() : null,
    cycle: kind === "cycle" ? newCycle() : null,
    sumo: kind === "sumo" ? newSumo() : null,
    ship: kind === "ship" ? newShip() : null,
    pong:
      kind === "pong"
        ? newPong([])
        : kind === "arena"
          ? newArena([])
          : kind === "breakout"
            ? newBreakout([])
            : null,
    race:
      kind === "reaction"
        ? { phase: "ready", round: 0, rule: "hit", target: -1, entries: [] }
        : null,
  };
}
export function newPong(seats: string[]): PongState {
  return {
    phase: "ready",
    rallySeconds: 0,
    seats,
    paddles: [0.5, 0.5],
    score: [0, 0],
    ball: { x: 0.5, y: 0.5, vx: 0.42, vy: 0.16 },
    serveIn: 1,
  };
}
export const clampPaddle = (position: number) =>
  Math.max(0.12, Math.min(0.88, position));
export function movePaddle(
  state: PongState,
  id: string,
  position: number,
): PongState {
  const seat = state.seats.indexOf(id);
  if (seat < 0 || !["serve", "playing"].includes(state.phase)) return state;
  const paddles = [...state.paddles];
  paddles[seat] = clampPaddle(position);
  return { ...state, paddles };
}
// Fixed, small steps prevent the ball passing through a paddle on a slow frame.
export function stepPong(state: PongState, seconds: number): PongState {
  if (state.phase === "serve") {
    const serveIn = Math.max(0, state.serveIn - seconds);
    return { ...state, serveIn, phase: serveIn === 0 ? "playing" : "serve" };
  }
  if (state.phase !== "playing") return state;
  const rallySeconds = (state.rallySeconds ?? 0) + seconds;
  const { x: oldX, y: oldY } = state.ball;
  let { vx, vy } = rallyBall(state.ball, rallySeconds, 0.95);
  let x = oldX,
    y = oldY;
  const previousX = x;
  x += vx * seconds;
  y += vy * seconds;
  if (y < 0.025) {
    y = 0.05 - y;
    vy = Math.abs(vy);
  }
  if (y > 0.975) {
    y = 1.95 - y;
    vy = -Math.abs(vy);
  }
  for (const side of [0, 1]) {
    const face = side === 0 ? 0.065 : 0.935;
    const crossed =
      side === 0
        ? vx < 0 && previousX >= face && x <= face
        : vx > 0 && previousX <= face && x >= face;
    if (crossed && Math.abs(y - state.paddles[side]) <= 0.145) {
      x = face;
      vx = (side === 0 ? 1 : -1) * Math.min(0.85, Math.abs(vx) * 1.12);
      vy = (y - state.paddles[side]) * 2.3;
    }
  }
  if (x < -0.025 || x > 1.025) {
    const scorer = x < 0 ? 1 : 0;
    const score = [...state.score];
    score[scorer]++;
    return {
      ...state,
      score,
      phase: score[scorer] >= 7 ? "finished" : "serve",
      serveIn: 1,
      rallySeconds: 0,
      ball: {
        x: 0.5,
        y: 0.5,
        vx: scorer === 0 ? -0.42 : 0.42,
        vy: score.reduce((a, b) => a + b, 0) % 2 ? -0.16 : 0.16,
      },
    };
  }
  return {
    ...state,
    rallySeconds,
    ball: { x, y, ...rallyBall({ vx, vy }, rallySeconds, 0.95) },
  };
}
export function raceRound(entries: RaceEntry[], round: number): RaceState {
  return {
    phase: "waiting",
    round,
    rule: round === 3 || round === 7 ? "hold" : "hit",
    target: -1,
    entries: entries.map((entry) => ({
      ...entry,
      result: "pending",
      elapsed: null,
    })),
  };
}
export function raceTap(
  state: RaceState,
  id: string,
  index: number,
  elapsed: number,
): RaceState {
  const entry = state.entries.find((entry) => entry.id === id);
  if (
    !entry ||
    entry.result !== "pending" ||
    !["waiting", "active"].includes(state.phase)
  )
    return state;
  const result =
    state.phase === "waiting"
      ? "early"
      : state.rule === "hold" || index !== state.target
        ? "wrong"
        : "hit";
  const points =
    result === "hit" ? Math.max(10, 100 - Math.floor(elapsed / 20)) : -25;
  return {
    ...state,
    entries: state.entries.map((e) =>
      e.id === id
        ? {
            ...e,
            points: e.points + points,
            result,
            elapsed: result === "hit" ? elapsed : null,
          }
        : e,
    ),
  };
}
export function finishRaceRound(state: RaceState): RaceState {
  return {
    ...state,
    phase: "results",
    entries: state.entries.map((e) =>
      e.result !== "pending"
        ? e
        : {
            ...e,
            result: state.rule === "hold" ? "held" : "miss",
            points: e.points + (state.rule === "hold" ? 75 : 0),
          },
    ),
  };
}
