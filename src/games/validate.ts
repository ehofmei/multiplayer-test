import {
  CYCLE_SIZE,
  CYCLE_COUNTDOWN,
  CYCLE_LIMIT,
  cycleDirections,
} from "./cycle";
import type { Room } from "./model";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number): v is number =>
  number(v, min, max) && Number.isInteger(v);
const id = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 80;
const pair = (v: unknown, min: number, max: number, whole = false) =>
  Array.isArray(v) &&
  v.length === 2 &&
  v.every((n) => (whole ? integer(n, min, max) : number(n, min, max)));
export function validRoom(v: unknown): v is Room {
  if (
    !record(v) ||
    !integer(v.epoch, 0, Number.MAX_SAFE_INTEGER) ||
    typeof v.notice !== "string" ||
    v.notice.length > 200
  )
    return false;
  if (v.kind !== "cycle" && v.cycle !== undefined && v.cycle !== null)
    return false;
  if (v.kind === "cycle") {
    const c = v.cycle;
    if (
      !record(c) ||
      v.pong !== null ||
      v.race !== null ||
      (v.ship !== undefined && v.ship !== null) ||
      !["ready", "countdown", "playing", "paused", "finished"].includes(
        String(c.phase),
      ) ||
      !integer(c.countdown, 0, CYCLE_COUNTDOWN) ||
      !integer(c.ticks, 0, CYCLE_LIMIT) ||
      typeof c.cells !== "string" ||
      c.cells.length !== CYCLE_SIZE * CYCLE_SIZE ||
      !Array.isArray(c.riders) ||
      c.riders.length > 8 ||
      (c.phase === "ready" ? c.riders.length !== 0 : c.riders.length < 2)
    )
      return false;
    const riders = c.riders;
    if (
      !riders.every(
        (r, i) =>
          record(r) &&
          id(r.id) &&
          integer(r.x, 0, CYCLE_SIZE - 1) &&
          integer(r.y, 0, CYCLE_SIZE - 1) &&
          cycleDirections.some((d) => d === r.direction) &&
          typeof r.alive === "boolean" &&
          (r.queued === null ||
            (c.phase === "playing" &&
              r.alive &&
              cycleDirections.some(
                (d, n) =>
                  d === r.queued &&
                  n % 2 !==
                    cycleDirections.findIndex((d) => d === r.direction) % 2,
              ))) &&
          (c.cells as string)[r.y * CYCLE_SIZE + r.x] === String(i + 1),
      ) ||
      new Set(riders.map((r) => r.id)).size !== riders.length ||
      ![...c.cells].every(
        (cell) => cell >= "0" && cell <= String(riders.length),
      )
    )
      return false;
    const alive = riders.filter((r) => r.alive).length;
    return c.phase === "ready"
      ? c.ticks === 0 && c.countdown === CYCLE_COUNTDOWN
      : c.phase === "finished"
        ? c.countdown === 0 && (alive <= 1 || c.ticks === CYCLE_LIMIT)
        : alive >= 2 &&
          c.ticks < CYCLE_LIMIT &&
          (c.phase === "countdown"
            ? c.countdown > 0
            : c.phase !== "playing" || c.countdown === 0);
  }
  if (v.kind !== "ship" && v.ship !== undefined && v.ship !== null)
    return false;
  if (v.kind === "ship") {
    const s = v.ship;
    if (
      !record(s) ||
      v.pong !== null ||
      v.race !== null ||
      !["ready", "playing", "paused", "finished"].includes(String(s.phase)) ||
      !integer(s.remaining, 0, 180_000) ||
      !integer(s.hull, 0, 100) ||
      !integer(s.repairs, 0, 100_000) ||
      !integer(s.mistakes, 0, 100_000) ||
      !Array.isArray(s.crew) ||
      s.crew.length > 8 ||
      !s.crew.every(id) ||
      new Set(s.crew).size !== s.crew.length ||
      !Array.isArray(s.controls) ||
      s.controls.length !== s.crew.length * 3 ||
      !s.controls.every(
        (c, i) =>
          record(c) &&
          c.owner === (s.crew as string[])[Math.floor(i / 3)] &&
          integer(c.value, 0, 3) &&
          integer(c.revision, 0, 100_000),
      ) ||
      !Array.isArray(s.orders) ||
      s.orders.length !== (s.phase === "ready" ? 0 : s.crew.length) ||
      (s.phase !== "ready" && s.crew.length < 1) ||
      (s.phase === "finished"
        ? s.hull !== 0 && s.remaining !== 0
        : s.hull === 0 || s.remaining === 0)
    )
      return false;
    return (
      s.orders.every(
        (o, i) =>
          record(o) &&
          o.caller === (s.crew as string[])[i] &&
          integer(o.control, 0, (s.controls as unknown[]).length - 1) &&
          Math.floor(o.control / 3) === (i + 1) % (s.crew as string[]).length &&
          integer(o.value, 0, 3) &&
          integer(o.remaining, 0, 18_000) &&
          ["pending", "done", "missed"].includes(String(o.status)),
      ) && new Set(s.orders.map((o) => o.control)).size === s.orders.length
    );
  }
  if (v.kind === "lobby" || v.kind === "lights")
    return v.pong === null && v.race === null;
  if (v.kind === "pong" || v.kind === "arena" || v.kind === "breakout") {
    const breakout = v.kind === "breakout";
    const arena = v.kind === "arena" || breakout;
    const p = v.pong;
    if (
      !record(p) ||
      v.race !== null ||
      !["ready", "serve", "playing", "paused", "finished"].includes(
        String(p.phase),
      )
    )
      return false;
    return (
      (breakout
        ? record(p.breakout) &&
          integer(p.breakout.level, 1, 3) &&
          integer(p.breakout.lives, 0, 5) &&
          (p.phase === "finished" || p.breakout.lives > 0) &&
          p.startingLives === 5 &&
          Array.isArray(p.score) &&
          p.score.every((n) => n === 0) &&
          Array.isArray(p.lives) &&
          Array.isArray(p.seats) &&
          p.lives.every(
            (n, i) => n === (i < (p.seats as string[]).length ? 5 : 0),
          ) &&
          Array.isArray(p.breakout.bricks) &&
          p.breakout.bricks.length === 16 &&
          p.breakout.bricks.every((n) => integer(n, 0, 2)) &&
          (p.phase !== "finished" ||
            p.breakout.lives === 0 ||
            (p.breakout.level === 3 && p.breakout.bricks.every((n) => n === 0)))
        : p.breakout === undefined) &&
      Array.isArray(p.seats) &&
      p.seats.length <= (arena ? 4 : 2) &&
      p.seats.every(id) &&
      new Set(p.seats).size === p.seats.length &&
      (p.phase === "ready" ||
        (breakout
          ? p.seats.length >= 1
          : arena
            ? p.seats.length >= 3
            : p.seats.length === 2)) &&
      (arena
        ? Array.isArray(p.paddles) &&
          p.paddles.length === 4 &&
          p.paddles.every((n) => number(n, 0.12, 0.88))
        : pair(p.paddles, 0.12, 0.88)) &&
      (arena
        ? Array.isArray(p.score) &&
          p.score.length === 4 &&
          p.score.every((n) => integer(n, 0, (p.startingLives as number) || 5))
        : pair(p.score, 0, 7, true)) &&
      (arena
        ? Array.isArray(p.lives) &&
          p.lives.length === 4 &&
          p.lives.every(
            (n, i) =>
              integer(n, 0, (p.startingLives as number) || 5) &&
              (i < (p.seats as string[]).length || n === 0),
          )
        : p.lives === undefined) &&
      (p.startingLives === undefined ||
        (arena && integer(p.startingLives, 1, 7))) &&
      (p.rallySeconds === undefined || number(p.rallySeconds, 0, 86400)) &&
      number(p.serveIn, 0, 1) &&
      record(p.ball) &&
      number(p.ball.x, -0.04, 1.04) &&
      number(p.ball.y, 0, 1) &&
      number(p.ball.vx, -1, 1) &&
      number(p.ball.vy, -1, 1)
    );
  }
  if (v.kind === "reaction") {
    const r = v.race;
    if (
      !record(r) ||
      v.pong !== null ||
      !["ready", "waiting", "active", "results", "finished"].includes(
        String(r.phase),
      ) ||
      !integer(r.round, 0, 10) ||
      (r.rule !== "hit" && r.rule !== "hold") ||
      !integer(r.target, -1, 5) ||
      ((r.phase === "active" ||
        r.phase === "results" ||
        r.phase === "finished") &&
        r.target === -1) ||
      !Array.isArray(r.entries) ||
      r.entries.length > 8
    )
      return false;
    return (
      r.entries.every(
        (e) =>
          record(e) &&
          id(e.id) &&
          integer(e.points, -250, 1000) &&
          ["pending", "hit", "wrong", "early", "miss", "held"].includes(
            String(e.result),
          ) &&
          (e.elapsed === null || integer(e.elapsed, 0, 2000)),
      ) && new Set(r.entries.map((e) => e.id)).size === r.entries.length
    );
  }
  return false;
}
