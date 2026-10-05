import {
  glowInt,
  validGlowPicks,
  validGlowRounds,
  type GlowState,
} from "./glow";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validGlow(v: unknown): v is GlowState {
  if (
    !record(v) ||
    ![
      "ready",
      "countdown",
      "choosing",
      "reveal",
      "paused",
      "reorient",
      "finished",
    ].includes(String(v.phase)) ||
    !validGlowRounds(v.rounds) ||
    !glowInt(v.round, 0, v.rounds) ||
    !glowInt(v.remaining, 0, 6000) ||
    !glowInt(v.resumeRemaining, 0, 6000) ||
    !Array.isArray(v.seats) ||
    v.seats.length > 8
  )
    return false;
  const seats = v.seats;
  const resuming = v.phase === "paused" || v.phase === "reorient";
  const phase = resuming ? v.resumePhase : v.phase;
  const limit = phase === "reveal" ? 6000 : phase === "countdown" ? 3000 : 0;
  if (
    resuming
      ? !["countdown", "choosing", "reveal"].includes(String(phase)) ||
        v.resumeRemaining > limit ||
        (v.phase === "paused"
          ? v.remaining !== v.resumeRemaining
          : v.remaining > 3000)
      : v.resumePhase !== null || v.resumeRemaining !== 0 || v.remaining > limit
  )
    return false;
  const resolved = phase === "reveal" || phase === "finished";
  if (
    v.phase === "ready"
      ? v.round !== 0 || v.remaining !== 0
      : v.round < 1 ||
        seats.length < 3 ||
        (phase === "countdown" && v.round !== 1) ||
        (phase === "finished" && v.round !== v.rounds)
  )
    return false;
  const count = v.phase === "ready" ? 0 : v.round - (resolved ? 0 : 1);
  if (
    !seats.every(
      (s) =>
        record(s) &&
        typeof s.id === "string" &&
        s.id.length > 0 &&
        s.id.length <= 80 &&
        glowInt(s.color, 0, 11) &&
        typeof s.locked === "boolean" &&
        (!resolved || s.locked) &&
        ((phase !== "ready" && phase !== "countdown") || !s.locked) &&
        (s.picks === null
          ? !resolved
          : s.locked && validGlowPicks(s.picks, seats.length * 4)) &&
        Array.isArray(s.scores) &&
        s.scores.length === count &&
        s.scores.every((n) => glowInt(n, 0, 3)),
    )
  )
    return false;
  if (
    new Set(seats.map((s) => s.id)).size !== seats.length ||
    new Set(seats.map((s) => s.color)).size !== seats.length
  )
    return false;
  if (
    resolved &&
    !seats.every(
      (s) =>
        s.scores[count - 1] ===
        s.picks.filter(
          (c: number) => seats.filter((p) => p.picks.includes(c)).length === 1,
        ).length,
    )
  )
    return false;
  return true;
}
