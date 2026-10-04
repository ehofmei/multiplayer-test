import { TREASURE_TIMES } from "./treasure";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const card = (v: unknown) => [0, 2, 3, 4, 6, 10].includes(v as number);
export function validTreasure(v: unknown): boolean {
  if (
    !record(v) ||
    ![
      "ready",
      "countdown",
      "choosing",
      "reveal",
      "summary",
      "reorient",
      "paused",
      "finished",
    ].includes(String(v.phase)) ||
    !integer(v.dive, 0, 3) ||
    !integer(v.door, 0, 6) ||
    !integer(v.remaining, 0, 8000) ||
    !integer(v.resumeRemaining, 0, 8000) ||
    v.deck !== null ||
    !integer(v.cardsLeft, 6, 12) ||
    !integer(v.hazardsLeft, 0, 4) ||
    (v.card !== null && !card(v.card)) ||
    !Array.isArray(v.divers) ||
    v.divers.length > 8
  )
    return false;
  const resuming = v.phase === "paused" || v.phase === "reorient";
  if (
    resuming
      ? !["countdown", "choosing", "reveal", "summary"].includes(
          String(v.resumePhase),
        ) ||
        v.resumeRemaining >
          TREASURE_TIMES[v.resumePhase as keyof typeof TREASURE_TIMES]
      : v.resumePhase !== null || v.resumeRemaining !== 0
  )
    return false;
  const phase = resuming ? v.resumePhase : v.phase;
  if (v.phase === "ready")
    return (
      v.dive === 0 &&
      v.door === 0 &&
      v.remaining === 0 &&
      v.divers.length === 0 &&
      v.card === null &&
      v.cardsLeft === 12 &&
      v.hazardsLeft === 4
    );
  if (
    v.dive < 1 ||
    v.door < 1 ||
    v.divers.length < 2 ||
    (v.phase === "finished" && (v.dive !== 3 || v.remaining !== 0)) ||
    (v.phase === "reorient" && v.remaining > 3000) ||
    (phase === "countdown" && (v.dive !== 1 || v.door !== 1)) ||
    (!resuming &&
      phase !== "finished" &&
      v.remaining > TREASURE_TIMES[phase as keyof typeof TREASURE_TIMES])
  )
    return false;
  const drawn = 12 - v.cardsLeft;
  if (
    4 - v.hazardsLeft > drawn ||
    (phase === "choosing" && (v.card !== null || drawn !== v.door - 1)) ||
    drawn > v.door ||
    (phase === "countdown" && drawn !== 0)
  )
    return false;
  return (
    v.divers.every(
      (d) =>
        record(d) &&
        typeof d.id === "string" &&
        d.id.length > 0 &&
        d.id.length <= 80 &&
        Array.isArray(d.scores) &&
        d.scores.length === 3 &&
        d.scores.every(
          (n, i) => integer(n, 0, 30) && (i < (v.dive as number) || n === 0),
        ) &&
        integer(d.haul, 0, 30) &&
        ["exploring", "boat", "caught"].includes(String(d.status)) &&
        (d.status === "exploring" || d.haul === 0) &&
        typeof d.shield === "boolean" &&
        typeof d.locked === "boolean" &&
        d.choice === null &&
        [
          "waiting",
          "returned",
          "timeout",
          "treasure",
          "protected",
          "caught",
          "auto-bank",
        ].includes(String(d.outcome)) &&
        integer(d.change, -30, 30),
    ) &&
    new Set(v.divers.map((d) => d.id)).size === v.divers.length &&
    (!["summary", "finished"].includes(String(phase)) ||
      v.divers.every((d) => d.status !== "exploring"))
  );
}
