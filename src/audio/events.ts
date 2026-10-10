import { glowTotal } from "../games/glow";
import { golfContacts, golfMotionFrame } from "../games/golf-motion";
import { golfTotal } from "../games/minigolf";
import { treasureTotal } from "../games/treasure";
import { picnicScore } from "../games/picnic";
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
  const decision = room.minigolf ?? room.treasure ?? room.picnic ?? room.glow;
  let turn = 0,
    locked = false,
    result = "",
    gain = 0,
    winner = false;
  if (room.glow) {
    const g = room.glow,
      p = g.seats.find((p) => p.id === me);
    turn = g.round;
    locked = p?.locked ?? false;
    result = p && p.scores.length === turn && turn > 0 ? `${turn}/scored` : "";
    gain = p?.scores[turn - 1] ?? 0;
    winner = !!p && g.seats.every((other) => glowTotal(other) <= glowTotal(p));
  } else if (room.minigolf) {
    const g = room.minigolf,
      b = g.balls.find((b) => b.id === me);
    turn = g.hole;
    locked = b?.locked ?? false;
    result =
      b && ["results", "finished"].includes(g.resumePhase ?? g.phase)
        ? `${turn}/scored`
        : "";
    gain = b?.scores[turn - 1] ?? 0;
    winner = !!b && g.balls.every((other) => golfTotal(other) <= golfTotal(b));
  } else if (room.treasure) {
    const g = room.treasure,
      d = g.divers.find((d) => d.id === me);
    turn = g.dive * 10 + g.door;
    locked = d?.locked ?? false;
    result = d && d.outcome !== "waiting" ? `${turn}/${d.outcome}` : "";
    gain = d?.change ?? 0;
    winner =
      !!d &&
      g.divers.every((other) => treasureTotal(other) <= treasureTotal(d));
  } else if (room.picnic) {
    const g = room.picnic,
      p = g.picnickers.find((p) => p.id === me);
    turn = g.round;
    locked = p?.locked ?? false;
    result = p && p.outcome !== "waiting" ? `${turn}/${p.outcome}` : "";
    gain = p?.gain ?? 0;
    winner =
      !!p &&
      g.picnickers.every(
        (other) =>
          picnicScore(other.board, g.bonus).total <=
          picnicScore(p.board, g.bonus).total,
      );
  }
  return {
    decision: decision
      ? {
          phase: decision.resumePhase ?? decision.phase,
          turn,
          locked,
          result,
          gain,
          winner,
        }
      : null,
    key: `${session}/${room.epoch}/${room.kind}`,
    kind: room.kind,
    golf: room.minigolf ? golfMotionFrame(room.minigolf) : null,
    seek: room.seek?.last
      ? { event: room.seek.last.event, result: room.seek.last.result }
      : null,
    revision: grid.revision,
    lit: grid.cells.filter(Boolean).length,
    pong: pong
      ? {
          phase: pong.phase,
          bumperHits: pong.bumpers?.reduce((sum, b) => sum + b.hits, 0) ?? 0,
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
    sumo: room.sumo
      ? {
          phase: room.sumo.phase,
          ticks: room.sumo.ticks,
          impacts: room.sumo.bumpers.map((b) => b.impact ?? 0),
          remaining: room.sumo.bumpers.filter((b) => b.alive).length,
          alive: room.sumo.bumpers.find((b) => b.id === me)?.alive,
          cooldown: room.sumo.bumpers.find((b) => b.id === me)?.cooldown,
        }
      : null,
    cycle: room.cycle
      ? {
          phase: room.cycle.phase,
          alive: room.cycle.riders.find((r) => r.id === me)?.alive,
        }
      : null,
    ship: room.ship
      ? {
          phase: room.ship.phase,
          completed: room.ship.completed,
          mistakes: room.ship.mistakes,
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
  const golfCues: Cue[] = after.golf
    ? [
        ...new Set(
          golfContacts(before.golf, after.golf).map(
            (c) =>
              (
                ({
                  launch: "golf-tap",
                  wall: "golf-knock",
                  mushroom: "golf-spring",
                  meteor: "golf-meteor",
                  cup: "golf-cup",
                }) as const
              )[c.kind],
          ),
        ),
      ]
    : [];
  const d = after.decision,
    oldDecision = before.decision;
  if (d && oldDecision) {
    if (d.phase === "finished" && oldDecision.phase !== "finished")
      return [d.winner ? "win" : "finish"];
    if (d.result && d.result !== oldDecision.result)
      return [
        ...golfCues,
        ...(golfCues.includes("golf-cup")
          ? []
          : [
              d.gain > 0
                ? ("point" as const)
                : d.gain < 0
                  ? ("miss" as const)
                  : ("success" as const),
            ]),
      ];
    if (d.phase === "rolling" && oldDecision.phase === "aiming")
      return golfCues.length ? golfCues : ["go"];
    if (d.turn === oldDecision.turn && d.locked && !oldDecision.locked)
      return ["success"];
  }
  if (golfCues.length) return golfCues;
  if (after.seek && after.seek.event !== before.seek?.event)
    return [
      after.seek.result === "found"
        ? "seek-found"
        : after.seek.result === "hit"
          ? "seek-hit"
          : "seek-miss",
    ];
  if (after.kind === "lights" && after.revision > before.revision)
    return [after.lit >= before.lit ? "on" : "off"];
  if (after.sumo && before.sumo) {
    if (after.sumo.phase === "finished" && before.sumo.phase !== "finished")
      return [
        after.sumo.remaining === 1 && after.sumo.alive ? "win" : "finish",
      ];
    if (before.sumo.alive && after.sumo.alive === false) return ["miss"];
    if (after.sumo.phase === "playing" && before.sumo.phase === "countdown")
      return ["go"];
    if ((after.sumo.cooldown ?? 0) > (before.sumo.cooldown ?? 0))
      return ["sumo-dash"];
    if (
      after.sumo.phase === "playing" &&
      before.sumo.phase === "playing" &&
      after.sumo.ticks >= before.sumo.ticks &&
      after.sumo.ticks - before.sumo.ticks <= 120 &&
      after.sumo.impacts.some(
        (tick, i) =>
          tick > (before.sumo!.impacts[i] ?? 0) &&
          after.sumo!.ticks - tick <= 24,
      )
    )
      return ["sumo-hit"];
  }
  if (after.cycle && before.cycle) {
    if (after.cycle.phase === "finished" && before.cycle.phase !== "finished")
      return [after.cycle.alive ? "win" : "finish"];
    if (before.cycle.alive && after.cycle.alive === false) return ["miss"];
    if (after.cycle.phase === "playing" && before.cycle.phase === "countdown")
      return ["go"];
  }
  const ship = after.ship,
    previousShip = before.ship;
  if (ship && previousShip) {
    if (ship.phase === "finished" && previousShip.phase !== "finished")
      return ["win"];
    if (ship.completed > previousShip.completed) return ["success"];
    if (ship.mistakes > previousShip.mistakes) return ["wrong"];
  }
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
      if (a.bumperHits > b.bumperHits) return ["bumper"];
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
