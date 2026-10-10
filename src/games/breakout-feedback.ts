import type { PongState } from "./model";

export interface BrickContact {
  index: number;
  broken: boolean;
}
// Confirmed HP transitions work for the host and coalesced 20Hz client snapshots.
// No inference from velocity: a wall or paddle rebound is not a brick hit.
export function breakoutContacts(
  before: PongState | null,
  after: PongState,
): BrickContact[] {
  const a = after.breakout,
    b = before?.breakout;
  if (
    !a ||
    !b ||
    before?.phase !== "playing" ||
    after.phase === "paused" ||
    a.lives !== b.lives ||
    a.level !== b.level
  )
    return [];
  return a.bricks.flatMap((hp, index) =>
    hp < b.bricks[index] ? [{ index, broken: hp === 0 }] : [],
  );
}
export function breakoutPaddleContact(
  before: PongState | null,
  after: PongState,
): number | null {
  if (
    !before ||
    before.phase !== "playing" ||
    after.phase !== "playing" ||
    before.breakout?.lives !== after.breakout?.lives
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
