import { CYCLE_SIZE, type CycleRider, type CycleState } from "./cycle";

// Crashed riders remain at their last safe cell. Mark the attempted destination,
// clamping wall hits to the edge rather than drawing outside the arena.
export function cycleCrashPoint(rider: CycleRider) {
  const x =
    rider.x +
    (rider.direction === "right" ? 1 : rider.direction === "left" ? -1 : 0);
  const y =
    rider.y +
    (rider.direction === "down" ? 1 : rider.direction === "up" ? -1 : 0);
  return {
    x: Math.max(0, Math.min(CYCLE_SIZE * 10, x * 10 + 5)),
    y: Math.max(0, Math.min(CYCLE_SIZE * 10, y * 10 + 5)),
  };
}
export function cycleNewCrashes(before: CycleState | null, after: CycleState) {
  if (
    !before ||
    before.phase !== "playing" ||
    !["playing", "finished"].includes(after.phase) ||
    after.ticks <= before.ticks
  )
    return [];
  return after.riders.filter(
    (r) =>
      !r.alive && before.riders.some((old) => old.id === r.id && old.alive),
  );
}
