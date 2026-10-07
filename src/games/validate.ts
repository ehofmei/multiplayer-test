import { validGlow } from "./glow-validate";
import { validSeek } from "./seek-validate";
import { validPicnic } from "./picnic-validate";
import { validGolf } from "./minigolf-validate";
import { validTreasure } from "./treasure-validate";
import { bakeryCards } from "./bakery";
import { SUMO_COUNTDOWN, SUMO_LIMIT, SUMO_LEASE, SUMO_COOLDOWN } from "./sumo";
import {
  CYCLE_SIZE,
  CYCLE_COUNTDOWN,
  CYCLE_LIMIT,
  cycleDirections,
} from "./cycle";
import { MISSION_MS } from "./ship";
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
  if (v.kind !== "glow" && v.glow !== undefined && v.glow !== null)
    return false;
  if (v.kind === "glow")
    return (
      v.pong === null &&
      v.race === null &&
      [
        v.seek,
        v.picnic,
        v.minigolf,
        v.treasure,
        v.bakery,
        v.sumo,
        v.cycle,
        v.ship,
      ].every((x) => x === undefined || x === null) &&
      validGlow(v.glow)
    );
  if (v.kind !== "seek" && v.seek !== undefined && v.seek !== null)
    return false;
  if (v.kind === "seek")
    return (
      v.pong === null &&
      v.race === null &&
      [
        v.picnic,
        v.minigolf,
        v.treasure,
        v.bakery,
        v.sumo,
        v.cycle,
        v.ship,
      ].every((x) => x === undefined || x === null) &&
      validSeek(v.seek)
    );
  if (v.kind !== "picnic" && v.picnic !== undefined && v.picnic !== null)
    return false;
  if (v.kind === "picnic")
    return (
      v.pong === null &&
      v.race === null &&
      [v.minigolf, v.treasure, v.bakery, v.sumo, v.cycle, v.ship].every(
        (x) => x === undefined || x === null,
      ) &&
      validPicnic(v.picnic)
    );
  if (v.kind !== "minigolf" && v.minigolf !== undefined && v.minigolf !== null)
    return false;
  if (v.kind === "minigolf")
    return (
      v.pong === null &&
      v.race === null &&
      [v.treasure, v.bakery, v.sumo, v.cycle, v.ship].every(
        (x) => x === undefined || x === null,
      ) &&
      validGolf(v.minigolf)
    );
  if (v.kind !== "treasure" && v.treasure !== undefined && v.treasure !== null)
    return false;
  if (v.kind === "treasure")
    return (
      v.pong === null &&
      v.race === null &&
      [v.bakery, v.sumo, v.cycle, v.ship].every(
        (x) => x === undefined || x === null,
      ) &&
      validTreasure(v.treasure)
    );
  if (v.kind !== "bakery" && v.bakery !== undefined && v.bakery !== null)
    return false;
  if (v.kind === "bakery") {
    const b = v.bakery;
    if (
      !record(b) ||
      v.pong !== null ||
      v.race !== null ||
      [v.sumo, v.cycle, v.ship].some((x) => x !== undefined && x !== null) ||
      ![
        "ready",
        "picking",
        "reveal",
        "round-results",
        "paused",
        "finished",
      ].includes(String(b.phase)) ||
      !integer(b.round, 0, 2) ||
      !integer(b.pick, 0, 6) ||
      (b.direction !== 1 && b.direction !== -1) ||
      typeof b.reversed !== "boolean" ||
      !Array.isArray(b.bakers) ||
      b.bakers.length > 8
    )
      return false;
    if (
      b.phase === "paused"
        ? !["picking", "reveal"].includes(String(b.resumePhase))
        : b.resumePhase !== null
    )
      return false;
    if (b.phase === "ready")
      return (
        b.round === 0 && b.pick === 0 && b.bakers.length === 0 && !b.reversed
      );
    if (
      b.round < 1 ||
      b.pick < 1 ||
      b.bakers.length < 2 ||
      (b.phase === "round-results" && (b.round !== 1 || b.pick !== 6)) ||
      (b.phase === "finished" && (b.round !== 2 || b.pick !== 6))
    )
      return false;
    const phase = b.phase === "paused" ? b.resumePhase : b.phase;
    const picking = phase === "picking";
    const count = (b.pick as number) - (picking ? 1 : 0);
    const cards = (v: unknown): v is string[] =>
      Array.isArray(v) &&
      v.every((c) => bakeryCards.some((card) => card === c));
    return (
      (!picking || !b.reversed) &&
      b.bakers.every(
        (p) =>
          record(p) &&
          id(p.id) &&
          typeof p.locked === "boolean" &&
          (picking || p.locked) &&
          cards(p.treats) &&
          p.treats.length === count &&
          (p.hand === null || (cards(p.hand) && p.hand.length === 6 - count)) &&
          integer(p.banked, 0, 21) &&
          (b.round !== 1 || p.banked === 0) &&
          (p.choice === null ||
            (picking &&
              p.locked &&
              Array.isArray(p.hand) &&
              integer(p.choice, 0, p.hand.length - 1))) &&
          (p.locked || p.choice === null) &&
          (count === 0 ? p.last === null : p.last === p.treats[count - 1]),
      ) &&
      new Set(b.bakers.map((p) => p.id)).size === b.bakers.length
    );
  }
  if (v.kind !== "sumo" && v.sumo !== undefined && v.sumo !== null)
    return false;
  if (v.kind === "sumo") {
    const s = v.sumo;
    if (
      !record(s) ||
      v.pong !== null ||
      v.race !== null ||
      (v.ship !== undefined && v.ship !== null) ||
      (v.cycle !== undefined && v.cycle !== null) ||
      !["ready", "countdown", "playing", "paused", "finished"].includes(
        String(s.phase),
      ) ||
      !integer(s.ticks, 0, SUMO_LIMIT) ||
      !integer(s.countdown, 0, SUMO_COUNTDOWN) ||
      !Array.isArray(s.bumpers) ||
      s.bumpers.length > 8 ||
      (s.phase === "ready" ? s.bumpers.length !== 0 : s.bumpers.length < 2)
    )
      return false;
    const bumpers = s.bumpers;
    if (
      !bumpers.every(
        (b) =>
          record(b) &&
          id(b.id) &&
          typeof b.alive === "boolean" &&
          number(b.x, 0, 1) &&
          number(b.y, 0, 1) &&
          number(b.vx, -2, 2) &&
          number(b.vy, -2, 2) &&
          number(b.dx, -1, 1) &&
          number(b.dy, -1, 1) &&
          Math.hypot(b.dx, b.dy) <= 1.000001 &&
          integer(b.inputFor, 0, SUMO_LEASE) &&
          integer(b.cooldown, 0, SUMO_COOLDOWN) &&
          (b.alive ||
            (b.inputFor === 0 &&
              b.dx === 0 &&
              b.dy === 0 &&
              b.vx === 0 &&
              b.vy === 0)),
      ) ||
      new Set(bumpers.map((b) => b.id)).size !== bumpers.length
    )
      return false;
    const alive = bumpers.filter((b) => b.alive).length;
    return s.phase === "ready"
      ? s.ticks === 0 && s.countdown === SUMO_COUNTDOWN
      : s.phase === "finished"
        ? s.countdown === 0 && (alive <= 1 || s.ticks === SUMO_LIMIT)
        : alive >= 2 &&
          s.ticks < SUMO_LIMIT &&
          (s.phase === "countdown"
            ? s.countdown > 0
            : s.phase !== "playing" || s.countdown === 0);
  }
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
      (s.duration !== undefined &&
        ![60_000, 120_000, MISSION_MS].includes(s.duration as number)) ||
      !integer(
        s.remaining,
        0,
        (s.duration as number | undefined) ?? MISSION_MS,
      ) ||
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
      (p.bumpers === undefined ||
        (!arena &&
          Array.isArray(p.bumpers) &&
          p.bumpers.length <= 4 &&
          p.bumpers.every(
            (b) =>
              record(b) &&
              number(b.x, 0.3, 0.7) &&
              number(b.y, 0.2, 0.8) &&
              number(b.warning, 0, 1.5) &&
              number(b.flash, 0, 0.24) &&
              integer(b.hits, 0, 1_000_000),
          ) &&
          p.bumpers.every((a, i, all) =>
            all
              .slice(i + 1)
              .every((b) => Math.hypot(a.x - b.x, (a.y - b.y) * 0.65) >= 0.084),
          ) &&
          (!["ready", "finished"].includes(String(p.phase)) ||
            p.bumpers.length === 0))) &&
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
