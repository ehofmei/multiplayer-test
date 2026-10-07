import { courses, GOLF_TIMES, validShot } from "./minigolf";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number): v is number =>
  number(v, min, max) && Number.isInteger(v);
const phases = ["countdown", "preview", "aiming", "rolling", "results"];
export function validGolf(v: unknown): boolean {
  if (
    !record(v) ||
    !["ready", ...phases, "paused", "reorient", "finished"].includes(
      String(v.phase),
    ) ||
    !integer(v.hole, 0, 5) ||
    !integer(v.remaining, 0, 20000) ||
    !integer(v.resumeRemaining, 0, 20000) ||
    !integer(v.wind, 0, 3) ||
    !integer(v.ticks, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(v.tickRemainder, 0, 999) ||
    typeof v.impacted !== "boolean" ||
    !Array.isArray(v.balls) ||
    v.balls.length > 8
  )
    return false;
  const resuming = v.phase === "paused" || v.phase === "reorient";
  if (
    resuming
      ? !phases.includes(String(v.resumePhase)) ||
        v.resumeRemaining > GOLF_TIMES[v.resumePhase as keyof typeof GOLF_TIMES]
      : v.resumePhase !== null || v.resumeRemaining !== 0
  )
    return false;
  const phase = resuming ? v.resumePhase : v.phase;
  if (v.phase === "ready")
    return (
      v.hole === 0 &&
      v.remaining === 0 &&
      v.balls.length === 0 &&
      v.conditions === null &&
      v.ticks === 0 &&
      v.tickRemainder === 0 &&
      !v.impacted &&
      v.wind === 0
    );
  if (
    v.hole < 1 ||
    v.balls.length < 2 ||
    (v.phase === "finished" && (v.hole !== 5 || v.remaining !== 0)) ||
    (v.phase === "reorient" && v.remaining > 3000) ||
    (v.phase === "paused" && v.remaining !== v.resumeRemaining) ||
    (!resuming &&
      phase !== "finished" &&
      v.remaining > GOLF_TIMES[phase as keyof typeof GOLF_TIMES]) ||
    (phase === "countdown" && v.hole !== 1)
  )
    return false;
  const revealed = ["rolling", "results", "finished"].includes(String(phase));
  const c = courses[v.hole - 1];
  if (
    revealed
      ? !record(v.conditions) ||
        ![0, 12, 24].includes(v.conditions.strength as number) ||
        (c.meteor
          ? !number(v.conditions.impact, 4, 5.5)
          : v.conditions.impact !== null)
      : v.conditions !== null ||
        v.ticks !== 0 ||
        v.tickRemainder !== 0 ||
        v.impacted
  )
    return false;
  if (["results", "finished"].includes(String(phase)) && v.ticks === 0)
    return false;
  if (
    v.impacted &&
    (!record(v.conditions) ||
      !number(v.conditions.impact, 4, 5.5) ||
      v.ticks / 120 < v.conditions.impact)
  )
    return false;
  return (
    v.balls.every(
      (b) =>
        record(b) &&
        typeof b.id === "string" &&
        b.id.length > 0 &&
        b.id.length <= 80 &&
        Array.isArray(b.scores) &&
        b.scores.length === 5 &&
        b.scores.every(
          (n, i) =>
            integer(n, 0, 100) &&
            (i <
              (v.hole as number) -
                (["results", "finished"].includes(String(phase)) ? 0 : 1) ||
              n === 0),
        ) &&
        typeof b.locked === "boolean" &&
        typeof b.captured === "boolean" &&
        b.skipped === false &&
        (b.shot === null ||
          (revealed &&
            b.locked &&
            record(b.shot) &&
            validShot(b.shot.angle, b.shot.power))) &&
        (!revealed ||
          (b.skipped
            ? b.shot === null && !b.locked
            : b.locked && b.shot !== null)) &&
        number(b.x, 10, 990) &&
        number(b.y, 10, 690) &&
        number(b.vx, -2000, 2000) &&
        number(b.vy, -2000, 2000) &&
        ((!b.captured && !b.skipped && phase === "rolling") ||
          (b.vx === 0 && b.vy === 0)) &&
        (!b.captured || (b.x === c.cup[0] && b.y === c.cup[1] && !b.skipped)) &&
        (revealed ||
          (!b.captured &&
            !b.skipped &&
            b.x === c.tee[0] &&
            b.y === c.tee[1])) &&
        Array.isArray(b.cooldowns) &&
        b.cooldowns.length === c.mushrooms.length &&
        b.cooldowns.every((n) => integer(n, 0, (v.ticks as number) + 48)),
    ) && new Set(v.balls.map((b) => b.id)).size === v.balls.length
  );
}
