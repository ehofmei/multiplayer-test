import {
  placedSeekCells,
  fitsSeek,
  validSeekLayout,
  validSeekPlacement,
  seekInteger as int,
  type SeekState,
} from "./seek";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && !!v && !Array.isArray(v);
const id = (v: unknown) =>
  typeof v === "string" && v.length > 0 && v.length <= 80;
export function validSeek(v: unknown): boolean {
  if (
    !record(v) ||
    ![
      "ready",
      "setup",
      "countdown",
      "playing",
      "paused",
      "reorient",
      "finished",
    ].includes(String(v.phase)) ||
    !Array.isArray(v.seats) ||
    !int(v.turn, 0, 201) ||
    !int(v.remaining, 0, 3000) ||
    !int(v.resumeRemaining, 0, 3000)
  )
    return false;
  const s = v as unknown as SeekState;
  const resuming = s.phase === "paused" || s.phase === "reorient";
  if (
    resuming
      ? !["setup", "countdown", "playing"].includes(String(s.resumePhase)) ||
        (s.resumePhase !== "countdown" && s.resumeRemaining !== 0) ||
        (s.phase === "paused" && s.remaining !== s.resumeRemaining)
      : s.resumePhase !== null || s.resumeRemaining !== 0
  )
    return false;
  if (s.phase === "ready")
    return (
      s.seats.length === 0 &&
      s.turn === 0 &&
      s.remaining === 0 &&
      s.current === null &&
      s.winner === null &&
      s.last === null
    );
  const phase = resuming ? s.resumePhase : s.phase;
  if (
    s.seats.length !== 2 ||
    s.turn < 1 ||
    !s.seats.every((p) => record(p) && id(p.id)) ||
    s.seats[0].id === s.seats[1].id
  )
    return false;
  if (
    phase === "setup"
      ? s.current !== null || s.turn !== 1 || s.seats.every((p) => p.ready)
      : phase === "finished"
        ? s.current !== null || !s.seats.some((p) => p.id === s.winner)
        : !s.seats.some((p) => p.id === s.current)
  )
    return false;
  if (s.phase !== "finished" && s.winner !== null) return false;
  if (
    !["countdown", "reorient", "paused"].includes(s.phase) &&
    s.remaining !== 0
  )
    return false;
  if (
    !s.seats.every(
      (p) =>
        typeof p.ready === "boolean" &&
        (phase === "setup" || p.ready) &&
        (p.layout === null || (p.ready && validSeekLayout(p.layout))) &&
        (s.phase !== "finished" || p.layout !== null) &&
        typeof p.search === "string" &&
        /^[012]{100}$/.test(p.search) &&
        Array.isArray(p.found) &&
        p.found.length <= 5 &&
        p.found.every(validSeekPlacement) &&
        new Set(p.found.map((q) => q.piece)).size === p.found.length &&
        p.found.every(
          (q) =>
            fitsSeek(p.found, q) &&
            placedSeekCells(q).every((c) => p.search[c] === "2") &&
            (!p.layout ||
              JSON.stringify(q) ===
                JSON.stringify(p.layout.find((r) => r.piece === q.piece))),
        ) &&
        ((phase !== "setup" && phase !== "countdown") ||
          p.search === "0".repeat(100)),
    )
  )
    return false;
  const searched = s.seats.reduce(
    (n, p) => n + [...p.search].filter((c) => c !== "0").length,
    0,
  );
  if (searched !== s.turn - 1) return false;
  if (s.last === null) return s.turn === 1 && s.phase !== "finished";
  const e = s.last;
  if (
    !record(e) ||
    Object.keys(e).length !== 5 ||
    !int(e.event, 1, 200) ||
    e.event !== s.turn - 1 ||
    !int(e.cell, 0, 99) ||
    !s.seats.some((p) => p.id === e.player) ||
    !["miss", "hit", "found"].includes(e.result) ||
    (e.result === "found" ? !int(e.piece, 0, 4) : e.piece !== null)
  )
    return false;
  const target = s.seats.find((p) => p.id !== e.player)!;
  return (
    target.search[e.cell] === (e.result === "miss" ? "1" : "2") &&
    (e.result !== "found" ||
      target.found.some(
        (p) => p.piece === e.piece && placedSeekCells(p).includes(e.cell),
      )) &&
    (s.phase !== "finished" ||
      (target.found.length === 5 && e.player === s.winner))
  );
}
