import { shapes, PICNIC_TIMES, picnicScore } from "./picnic";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export function validPicnic(v: unknown): boolean {
  if (
    !record(v) ||
    ![
      "ready",
      "countdown",
      "placing",
      "reveal",
      "paused",
      "reorient",
      "finished",
    ].includes(String(v.phase)) ||
    !int(v.round, 0, 10) ||
    !int(v.remaining, 0, 15000) ||
    !int(v.resumeRemaining, 0, 15000) ||
    !["corners", "border", "center"].includes(String(v.bonus)) ||
    v.bags !== null ||
    !Array.isArray(v.offer) ||
    !Array.isArray(v.picnickers) ||
    v.picnickers.length > 8
  )
    return false;
  const resuming = v.phase === "paused" || v.phase === "reorient";
  if (
    resuming
      ? !["countdown", "placing", "reveal"].includes(String(v.resumePhase)) ||
        v.resumeRemaining >
          PICNIC_TIMES[v.resumePhase as keyof typeof PICNIC_TIMES] ||
        (v.phase === "paused" && v.remaining !== v.resumeRemaining) ||
        (v.phase === "reorient" && v.remaining > 3000)
      : v.resumePhase !== null || v.resumeRemaining !== 0
  )
    return false;
  if (v.phase === "ready")
    return (
      v.round === 0 &&
      v.remaining === 0 &&
      v.offer.length === 0 &&
      v.picnickers.length === 0
    );
  const phase = resuming ? v.resumePhase : v.phase;
  if (
    v.round < 1 ||
    v.picnickers.length < 2 ||
    v.offer.length !== 3 ||
    !v.offer.every(
      (p) =>
        record(p) &&
        shapes.includes(p.shape as (typeof shapes)[number]) &&
        int(p.food, 1, 3),
    ) ||
    (phase === "countdown" && v.round !== 1) ||
    (v.phase === "finished" && (v.round !== 10 || v.remaining !== 0)) ||
    (!resuming &&
      phase !== "finished" &&
      v.remaining > PICNIC_TIMES[phase as keyof typeof PICNIC_TIMES])
  )
    return false;
  const resolved = phase === "reveal" || phase === "finished";
  return (
    v.picnickers.every(
      (p) =>
        record(p) &&
        typeof p.id === "string" &&
        p.id.length > 0 &&
        p.id.length <= 80 &&
        typeof p.board === "string" &&
        /^[0-3]{36}$/.test(p.board) &&
        picnicScore(p.board, "corners").cells <=
          Math.min(36, ((v.round as number) - (resolved ? 0 : 1)) * 4) &&
        typeof p.locked === "boolean" &&
        (!resolved || p.locked) &&
        p.placement === null &&
        (resolved
          ? ["placed", "skipped", "timeout"].includes(String(p.outcome))
          : p.outcome === "waiting") &&
        int(p.gain, 0, 52) &&
        (p.outcome === "placed" || p.gain === 0) &&
        Array.isArray(p.rows) &&
        p.rows.length <= 4 &&
        p.rows.every(
          (y) =>
            int(y, 0, 5) &&
            !(p.board as string).slice(y * 6, y * 6 + 6).includes("0"),
        ) &&
        new Set(p.rows).size === p.rows.length &&
        (p.outcome === "placed" || p.rows.length === 0),
    ) && new Set(v.picnickers.map((p) => p.id)).size === v.picnickers.length
  );
}
