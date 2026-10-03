import type { Room } from "./model";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number) =>
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
  if (v.kind === "lobby" || v.kind === "lights")
    return v.pong === null && v.race === null;
  if (v.kind === "pong" || v.kind === "arena") {
    const arena = v.kind === "arena";
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
      Array.isArray(p.seats) &&
      p.seats.length <= (arena ? 4 : 2) &&
      p.seats.every(id) &&
      new Set(p.seats).size === p.seats.length &&
      (p.phase === "ready" ||
        (arena ? p.seats.length >= 3 : p.seats.length === 2)) &&
      (arena
        ? Array.isArray(p.paddles) &&
          p.paddles.length === 4 &&
          p.paddles.every((n) => number(n, 0.12, 0.88))
        : pair(p.paddles, 0.12, 0.88)) &&
      (arena
        ? Array.isArray(p.score) &&
          p.score.length === 4 &&
          p.score.every((n) => integer(n, 0, 5))
        : pair(p.score, 0, 7, true)) &&
      (arena
        ? Array.isArray(p.lives) &&
          p.lives.length === 4 &&
          p.lives.every(
            (n, i) =>
              integer(n, 0, 5) && (i < (p.seats as string[]).length || n === 0),
          )
        : p.lives === undefined) &&
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
