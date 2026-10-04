import { arenaWinner } from "../games/arena";
import type { Snapshot } from "../network/session";
import type { Cue } from "./sounds";
// Copy primitive values: the host updates its room in place between snapshots.
export function soundFrame(snapshot: Snapshot, me: string, session: string) {
  const { room, grid } = snapshot;
  const pong = room.pong;
  const race = room.race;
  const entry = race?.entries.find((e) => e.id === me);
  const high = race ? Math.max(...race.entries.map((e) => e.points)) : 0;
  return {
    key: `${session}/${room.epoch}/${room.kind}`,
    kind: room.kind,
    revision: grid.revision,
    lit: grid.cells.filter(Boolean).length,
    pong: pong
      ? {
          phase: pong.phase,
          vx: pong.ball.vx,
          vy: pong.ball.vy,
          score: pong.score.reduce((a, b) => a + b, 0),
          teamLives: pong.breakout?.lives,
          bricks: pong.breakout?.bricks.reduce((a, b) => a + b, 0),
          level: pong.breakout?.level,
          winner: pong.breakout
            ? pong.breakout.lives > 0
            : (pong.lives
                ? arenaWinner(pong)
                : pong.seats[pong.score[0] === 7 ? 0 : 1]) === me,
        }
      : null,
    race: race
      ? {
          phase: race.phase,
          round: race.round,
          rule: race.rule,
          result: entry?.result,
          winner: entry?.points === high,
        }
      : null,
  };
}
export type SoundFrame = ReturnType<typeof soundFrame>;
export function soundEvents(
  before: SoundFrame | null,
  after: SoundFrame,
): Cue[] {
  if (!before || before.key !== after.key) return [];
  if (after.kind === "lights" && after.revision > before.revision)
    return [after.lit >= before.lit ? "on" : "off"];
  const a = after.pong,
    b = before.pong;
  if (a && b) {
    if (a.phase === "finished" && b.phase !== "finished")
      return [a.winner ? "win" : "finish"];
    if (
      a.teamLives !== undefined &&
      b.teamLives !== undefined &&
      a.teamLives < b.teamLives
    )
      return ["miss"];
    if (
      a.bricks !== undefined &&
      b.bricks !== undefined &&
      (a.bricks < b.bricks || a.level !== b.level)
    )
      return ["success"];
    if (a.score > b.score) return ["point"];
    if (a.phase === "playing" && b.phase === "serve") return ["serve"];
    if (a.phase === "playing" && b.phase === "playing") {
      if (a.vx * b.vx < 0) return ["paddle"];
      if (a.vy * b.vy < 0) return ["wall"];
    }
  }
  const race = after.race,
    old = before.race;
  if (race && old) {
    if (race.phase === "finished" && old.phase !== "finished")
      return [race.winner ? "win" : "finish"];
    const cues: Cue[] = [];
    if (
      race.phase === "active" &&
      (old.phase !== "active" || old.round !== race.round)
    )
      cues.push(race.rule === "hit" ? "go" : "hold");
    if (
      old.round === race.round &&
      old.result === "pending" &&
      race.result !== "pending"
    ) {
      if (race.result === "hit" || race.result === "held") cues.push("success");
      if (race.result === "early" || race.result === "wrong")
        cues.push("wrong");
      if (race.result === "miss") cues.push("miss");
    }
    return cues;
  }
  return [];
}
