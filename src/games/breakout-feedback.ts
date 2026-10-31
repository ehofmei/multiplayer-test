import type { PongState } from "./model";

export type BreakoutFrame = Pick<
  PongState,
  "phase" | "ball" | "seats" | "breakout"
>;
export function breakoutFrame(game: BreakoutFrame): BreakoutFrame {
  return {
    phase: game.phase,
    ball: { ...game.ball },
    seats: [...game.seats],
    breakout: game.breakout
      ? { ...game.breakout, bricks: [...game.breakout.bricks] }
      : undefined,
  };
}
// Progress is monotonic within one room epoch. Keep the last observation when
// an older snapshot arrives so a subsequent current snapshot cannot replay it.
export function breakoutObservation(
  before: BreakoutFrame | null,
  next: BreakoutFrame,
) {
  const a = next.breakout,
    b = before?.breakout;
  return before &&
    a &&
    b &&
    (a.level < b.level ||
      a.lives > b.lives ||
      (a.level === b.level && a.bricks.some((hp, i) => hp > b.bricks[i])))
    ? before
    : next;
}
export function breakoutProgress(bricks: number[]) {
  return {
    remaining: bricks.filter(Boolean).length,
    hits: bricks.reduce((sum, hp) => sum + hp, 0),
  };
}
export function breakoutTransition(
  before: BreakoutFrame | null,
  after: BreakoutFrame,
) {
  const a = after.breakout,
    b = before?.breakout;
  if (
    !a ||
    !b ||
    !before ||
    !["playing", "serve"].includes(before.phase) ||
    !["playing", "serve", "finished"].includes(after.phase) ||
    breakoutObservation(before, after) === before
  )
    return null;
  if (after.phase === "finished")
    return before.phase !== "finished" ? "finish" : null;
  if (a.lives < b.lives) return "loss";
  if (a.level > b.level) return "core";
  return null;
}

export interface BrickContact {
  index: number;
  broken: boolean;
}
// Confirmed HP transitions work for the host and coalesced 20Hz client snapshots.
// No inference from velocity: a wall or paddle rebound is not a brick hit.
export function breakoutContacts(
  before: BreakoutFrame | null,
  after: BreakoutFrame,
): BrickContact[] {
  const a = after.breakout,
    b = before?.breakout;
  if (
    !a ||
    !b ||
    before?.phase !== "playing" ||
    after.phase !== "playing" ||
    a.lives !== b.lives ||
    a.level !== b.level
  )
    return [];
  return a.bricks.flatMap((hp, index) =>
    hp < b.bricks[index] ? [{ index, broken: hp === 0 }] : [],
  );
}
export function breakoutPaddleContact(
  before: BreakoutFrame | null,
  after: BreakoutFrame,
): number | null {
  if (
    !before ||
    before.phase !== "playing" ||
    after.phase !== "playing" ||
    before.breakout?.lives !== after.breakout?.lives ||
    before.breakout?.level !== after.breakout?.level
  )
    return null;
  const a = after.ball,
    b = before.ball;
  const side =
    a.vy * b.vy < 0 && a.y > 0.9
      ? 0
      : a.vx * b.vx < 0 && a.x > 0.9
        ? 1
        : a.vy * b.vy < 0 && a.y < 0.1
          ? 2
          : a.vx * b.vx < 0 && a.x < 0.1
            ? 3
            : null;
  return side !== null && side < after.seats.length ? side : null;
}
