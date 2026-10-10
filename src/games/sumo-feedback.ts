import { SUMO_HZ, type SumoState } from "./sumo";

export interface SumoEffect {
  key: string;
  kind: "impact" | "out";
  seat: number;
  x: number;
  y: number;
}
// Presentation only: confirmed contacts and alive transitions, never prediction.
// First snapshots, restarts and long gaps do not replay old feedback.
export function sumoEffects(
  before: SumoState | null,
  after: SumoState,
): SumoEffect[] {
  if (
    !before ||
    before.phase !== "playing" ||
    !["playing", "finished"].includes(after.phase) ||
    after.ticks < before.ticks ||
    after.ticks - before.ticks > SUMO_HZ
  )
    return [];
  return after.bumpers.flatMap((b, seat) => {
    const old = before.bumpers.find((p) => p.id === b.id);
    if (!old?.alive) return [];
    const kind = !b.alive
      ? "out"
      : (b.impact ?? 0) > (old.impact ?? 0) && after.ticks - b.impact! <= 24
        ? "impact"
        : null;
    return kind
      ? [
          {
            key: `${b.id}/${kind}/${kind === "out" ? after.ticks : b.impact}`,
            kind,
            seat,
            x: b.x,
            y: b.y,
          },
        ]
      : [];
  });
}
