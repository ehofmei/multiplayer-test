import type { PongState } from "./model";

// Own the values: room snapshots can otherwise retain mutable host state.
export function pongFrame(game: PongState) {
  return {
    phase: game.phase,
    score: [...game.score],
    contact: game.pongContact ? { ...game.pongContact } : undefined,
  };
}
export function pongFeedback(
  before: ReturnType<typeof pongFrame> | null,
  after: ReturnType<typeof pongFrame>,
) {
  if (
    !before ||
    before.phase !== "playing" ||
    after.phase === "paused" ||
    after.phase === "ready"
  )
    return { contact: null, point: null };
  const scorer = after.score.findIndex((n, i) => n > before.score[i]);
  if (scorer >= 0)
    return {
      contact: null,
      point: { seat: scorer, gain: after.score[scorer] - before.score[scorer] },
    };
  const contact =
    after.phase === "playing" &&
    after.contact &&
    after.contact.sequence > (before.contact?.sequence ?? 0)
      ? after.contact
      : null;
  return { contact, point: null };
}
