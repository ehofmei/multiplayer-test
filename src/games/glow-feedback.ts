import { glowOwners, type GlowState } from "./glow";

export const glowCoordinate = (cell: number) =>
  `${"ABCD"[cell % 4]}${Math.floor(cell / 4) + 1}`;

// Only public, resolved ownership can explain a reward. Never inspect secret picks.
export function glowOutcome(game: GlowState, viewer: string) {
  const phase = game.resumePhase ?? game.phase;
  if (phase !== "reveal" && phase !== "finished") return null;
  const seat = game.seats.find((s) => s.id === viewer);
  if (!seat?.picks) return null;
  const picks = [...seat.picks]
    .sort((a, b) => a - b)
    .map((cell) => {
      const claimants = glowOwners(game, cell).length;
      return {
        cell,
        coordinate: glowCoordinate(cell),
        claimants,
        points: claimants === 1 ? 1 : 0,
      };
    });
  const unique = picks.filter((p) => p.points === 1).length;
  return {
    picks,
    unique,
    clashes: picks.length - unique,
    gain: seat.scores[game.round - 1] ?? 0,
  };
}

// Copy primitives: the host may mutate the room before the next observation.
export function glowFrame(game: GlowState, viewer: string) {
  const seat = game.seats.find((s) => s.id === viewer);
  return {
    viewer,
    phase: game.phase,
    resolved: ["reveal", "finished"].includes(game.resumePhase ?? game.phase),
    round: game.round,
    participant: !!seat,
    locked: seat?.locked ?? false,
    unique: glowOutcome(game, viewer)?.unique ?? null,
  };
}
export type GlowFrame = ReturnType<typeof glowFrame>;

// Recovery/late observation establishes a baseline; only a witnessed reveal animates.
export function glowRevealed(before: GlowFrame | null, after: GlowFrame) {
  return (
    !!before &&
    before.viewer === after.viewer &&
    before.round === after.round &&
    (before.phase === "choosing" || before.phase === "settling") &&
    after.phase === "reveal" &&
    after.participant &&
    after.unique !== null
  );
}

// Retain progress across a stale observation, without keeping an event history.
// Callers reset at session/epoch/viewer changes and lifecycle recovery.
export function glowObservation(
  before: GlowFrame | null,
  after: GlowFrame,
): GlowFrame {
  if (
    before?.viewer === after.viewer &&
    (after.round < before.round ||
      (after.round === before.round &&
        ((before.resolved && !after.resolved) ||
          (before.locked && !after.locked) ||
          (before.phase === "finished" && after.phase !== "finished"))))
  )
    return before;
  return after;
}
