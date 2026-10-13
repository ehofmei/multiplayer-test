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
    !["playing", "serve"].includes(before.phase) ||
    after.phase === "paused" ||
    after.phase === "ready"
  )
    return { contact: null, point: null };
  const gains = after.score.flatMap((n, seat) =>
    n > before.score[seat] ? [{ seat, gain: n - before.score[seat] }] : [],
  );
  if (gains.length) return { contact: null, point: gains };
  const contact =
    before.phase === "playing" &&
    after.phase === "playing" &&
    after.contact &&
    after.contact.sequence > (before.contact?.sequence ?? 0)
      ? after.contact
      : null;
  return { contact, point: null };
}
