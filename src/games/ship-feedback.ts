import type { ShipState } from "./ship";

// Own primitive values: host rooms can change in place between snapshots.
export function shipFrame(game: ShipState, me: string, host = false) {
  const order = game.orders.find((o) => o.caller === me);
  const mistake = game.lastMistake;
  return {
    phase: game.phase,
    crew: game.crew.includes(me),
    host,
    completed: game.completed,
    mistakes: game.mistakes,
    bestStreak: game.bestStreak,
    generation: order?.generation,
    status: order?.status,
    successes: game.orders
      .filter((o) => o.caller === me || game.controls[o.control].owner === me)
      .map((o) => ({
        caller: o.caller,
        generation: o.generation,
        status: o.status,
      })),
    mistake: mistake
      ? {
          sequence: mistake.sequence,
          kind: mistake.kind,
          relevant:
            mistake.kind === "wrong"
              ? game.controls[mistake.control].owner === me
              : mistake.caller === me,
        }
      : undefined,
  };
}
export type ShipFrame = ReturnType<typeof shipFrame>;
export function shipFeedback(before: ShipFrame | null, after: ShipFrame) {
  const quiet = {
    attention: false,
    mistake: null,
    milestone: 0,
    success: false,
  } as const;
  if (
    !before ||
    before.phase !== "playing" ||
    after.phase !== "playing" ||
    !after.crew
  )
    return quiet;
  return {
    attention:
      after.status === "pending" &&
      after.generation !== undefined &&
      before.generation !== undefined &&
      after.generation > before.generation,
    mistake:
      after.mistake?.relevant && after.mistake.sequence > before.mistakes
        ? after.mistake.kind
        : null,
    milestone:
      [10, 5].find((n) => before.bestStreak < n && after.bestStreak >= n) ?? 0,
    success:
      after.completed > before.completed &&
      after.successes.some(
        (o) =>
          o.status === "done" &&
          !before.successes.some(
            (p) =>
              p.caller === o.caller &&
              p.generation === o.generation &&
              p.status === "done",
          ),
      ),
  };
}
export const shipUrgent = (remaining: number) =>
  remaining > 0 && remaining <= 5000;
