import { describe, expect, it } from "vitest";
import {
  bounce,
  commitGolf,
  courses,
  golfTotal,
  golfView,
  newGolf,
  pauseGolf,
  physicsGolf,
  resumeGolf,
  scoreGolf,
  stepGolf,
  type GolfState,
} from "./minigolf";
import { validRoom } from "./validate";
import { newRoom } from "./model";
import { MAX_MESSAGE, parseMessage } from "../network/protocol";
const zero = () => 0;
const aiming = () => stepGolf(newGolf(["a", "b"], zero), 7000, zero);
function rolling(hole = 1): GolfState {
  let s = aiming();
  s = commitGolf(s, "a", 1, 0, 0.6);
  s = commitGolf(s, "b", 1, 0, 0.6);
  return {
    ...s,
    hole,
    balls: s.balls.map((b) => ({
      ...b,
      x: courses[hole - 1].tee[0],
      y: courses[hole - 1].tee[1],
      cooldowns: courses[hole - 1].mushrooms.map(() => 0),
    })),
  };
}
describe("Meteor Minigolf rules", () => {
  it("keeps shots and schedules private, rejects stale/duplicate/invalid/spectator shots, and waits for launch", () => {
    const s = aiming();
    for (const [id, hole, angle, power] of [
      ["watch", 1, 0, 0.6],
      ["a", 2, 0, 0.6],
      ["a", 1, 360, 0.6],
      ["a", 1, 0, 1.1],
      ["a", 1, NaN, 0.6],
    ] as const)
      expect(commitGolf(s, id, hole, angle, power)).toBe(s);
    const a = commitGolf(s, "a", 1, 0, 0.6);
    expect(commitGolf(a, "a", 1, 90, 0)).toBe(a);
    expect(golfView(a).conditions).toBeNull();
    expect(golfView(a).balls[0].shot).toBeNull();
    expect(golfView(a).balls[0].locked).toBe(true);
    const both = commitGolf(a, "b", 1, 0, 0.6);
    expect(both.phase).toBe("rolling");
    expect(golfView(both).balls[0].shot).toEqual({
      angle: 0,
      power: 0.6,
    });
    expect(
      commitGolf(newGolf(["a", "b"], zero), "a", 1, 0, 0.6).balls[0].locked,
    ).toBe(false);
  });
  it("bounces at 75% normal energy without changing tangential velocity, separates walls and corners", () => {
    const b = { ...rolling().balls[0], vx: -100, vy: 40 };
    bounce(b, 1, 0);
    expect(b.vx).toBe(75);
    expect(b.vy).toBe(40);
    const s = rolling(2);
    s.balls[0] = { ...s.balls[0], x: 449, y: 350, vx: 100, vy: 0 };
    const hit = physicsGolf(s).balls[0];
    expect(hit.x).toBe(440);
    expect(hit.vx).toBeLessThan(0);
    s.balls[0] = { ...s.balls[0], x: 451, y: 181, vx: 0, vy: 0 };
    const inside = physicsGolf(s).balls[0];
    expect(inside.x === 440 || inside.y === 170).toBe(true);
    s.balls[0] = { ...s.balls[0], x: 10, y: 10, vx: -100, vy: -200 };
    const edge = physicsGolf(s).balls[0];
    expect(edge.x).toBe(10);
    expect(edge.y).toBe(10);
    expect(edge.vx).toBeGreaterThan(0);
    expect(edge.vy).toBeGreaterThan(0);
  });
  it("captures slow balls, lets fast balls pass, and captured balls ignore wind/meteors", () => {
    const s = rolling();
    s.balls[0] = { ...s.balls[0], x: 750, y: 350, vx: 160, vy: 0 };
    const captured = physicsGolf(s);
    expect(captured.balls[0].captured).toBe(true);
    expect(scoreGolf(captured.balls[0], 1)).toBe(100);
    s.balls[0].vx = 180;
    expect(physicsGolf(s).balls[0].captured).toBe(false);
    const forced = {
      ...captured,
      conditions: { strength: 24, impact: 4 },
      ticks: 479,
    };
    expect(physicsGolf(forced).balls[0]).toEqual(captured.balls[0]);
  });
  it("adds mushroom impulses with a 48-tick cooldown and shared meteor impacts including exact centers", () => {
    const s = rolling(3);
    s.balls[0] = { ...s.balls[0], x: 489, y: 350, vx: 0, vy: 0 };
    const boosted = physicsGolf(s);
    expect(boosted.balls[0].vx).toBe(160);
    expect(boosted.balls[0].cooldowns[0]).toBe(49);
    boosted.balls[0] = { ...boosted.balls[0], x: 489, vx: 0 };
    expect(physicsGolf(boosted).balls[0].vx).toBe(0);
    boosted.ticks = 48;
    expect(physicsGolf(boosted).balls[0].vx).toBe(160);
    const meteor = rolling(4);
    meteor.conditions = { strength: 0, impact: 4 };
    meteor.ticks = 479;
    meteor.balls = meteor.balls.map((b) => ({
      ...b,
      x: 500,
      y: 320,
      vx: 0,
      vy: 0,
    }));
    const hit = physicsGolf(meteor);
    expect(hit.impacted).toBe(true);
    expect(hit.balls[0].vy).toBeLessThan(-118);
    expect(hit.balls[0].vx).toBe(0);
    expect(hit.balls[0]).toEqual({ ...hit.balls[1], id: "a" });
    const after = physicsGolf(hit);
    expect(after.balls[0].vy).toBeGreaterThan(hit.balls[0].vy);
  });
  it("waits for every shot, scores naturally settled balls and shares identical totals", () => {
    const b = rolling().balls[0];
    expect(scoreGolf({ ...b, x: 670, y: 350 }, 1)).toBe(60);
    expect(scoreGolf({ ...b, x: 10, y: 10 }, 1)).toBe(0);
    expect(scoreGolf({ ...b, skipped: true, captured: true }, 1)).toBe(0);
    const s = stepGolf(rolling(), 3000, zero);
    expect(s.phase).toBe("results");
    expect(s.ticks).toBeLessThan(1200);
    expect(s.balls[0].captured).toBe(true);
    expect(s.balls[0].scores[0]).toBe(100);
    expect(s.balls[0]).toEqual({ ...s.balls[1], id: "a" });
    expect(s.balls[0].vx).toBe(0);
    const waiting = commitGolf(aiming(), "a", 1, 0, 0.6);
    expect(stepGolf(waiting, 1e6, zero)).toBe(waiting);
    const missing = stepGolf(aiming(), 1e6, zero);
    expect(missing.balls.every((b) => !b.skipped && b.scores[0] === 0)).toBe(
      true,
    );
    let final = aiming();
    for (let hole = 1; hole <= 5; hole++) {
      for (const id of ["a", "b"]) final = commitGolf(final, id, hole, 0, 0.6);
      final = stepGolf(final, 20000, zero);
    }
    expect(final.phase).toBe("finished");
    expect(final.hole).toBe(5);
    expect(final.balls.map(golfTotal)[0]).toBeGreaterThan(0);
    expect(stepGolf(final, 1000)).toBe(final);
  });
  it("fixed steps are independent of scheduling chunks, pauses preserve the phase and same random conditions", () => {
    const s = rolling(5);
    s.conditions = { strength: 24, impact: 5.5 };
    let chunked = s;
    for (let i = 0; i < 1000; i++) chunked = stepGolf(chunked, 10, zero);
    expect(chunked).toEqual(stepGolf(s, 10000, zero));
    let irregular = s;
    for (const ms of [1, 7, 32, 333, 600, 727])
      irregular = stepGolf(irregular, ms, zero);
    expect(irregular).toEqual(stepGolf(s, 1700, zero));
    const partial = stepGolf(s, 1700, zero),
      paused = pauseGolf(partial);
    expect(stepGolf(paused, 100000)).toBe(paused);
    const resume = resumeGolf(paused);
    expect(stepGolf(resume, 2999, zero).phase).toBe("reorient");
    expect(stepGolf(resume, 3000, zero)).toEqual(partial);
    expect(
      resumeGolf(pauseGolf(stepGolf(resume, 500, zero))).resumeRemaining,
    ).toBe(partial.remaining);
  });
  it("continues beyond the former rolling cutoff and settles in every wind on all courses", () => {
    const long = {
      ...rolling(),
      ticks: 1200,
      balls: rolling().balls.map((b) => ({ ...b, vx: 500 })),
    };
    const continued = stepGolf(long, 10, zero);
    expect(continued.phase).toBe("rolling");
    expect(continued.ticks).toBeGreaterThan(1200);
    for (let hole = 1; hole <= 5; hole++)
      for (let wind = 0; wind < 4; wind++) {
        const s = {
          ...rolling(hole),
          wind,
          conditions: {
            strength: 24,
            impact: courses[hole - 1].meteor ? 5.5 : null,
          },
        };
        const settled = stepGolf(s, 30000, zero);
        expect(settled.phase, `hole ${hole} wind ${wind}`).toBe(
          hole === 5 ? "finished" : "aiming",
        );
      }
    const pending = rolling(4);
    pending.conditions = { strength: 0, impact: 5.5 };
    pending.balls = pending.balls.map((b) => ({
      ...b,
      x: 500,
      y: 320,
      vx: 0,
      vy: 0,
    }));
    expect(stepGolf(pending, 5000).phase).toBe("rolling");
    expect(stepGolf(pending, 5500).impacted).toBe(true);
  });
});
describe("Golf bounded snapshots and protocol", () => {
  it("validates every phase over eight-player matches, fits full envelopes, and rejects private or malformed state", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      id: String(i) + "x".repeat(79),
      name: "N".repeat(32),
    }));
    let s = newGolf(
      players.map((p) => p.id),
      () => 0.99,
    );
    const room = newRoom("minigolf", Number.MAX_SAFE_INTEGER);
    expect(validRoom(room)).toBe(true);
    const check = () => {
      room.minigolf = golfView(s);
      expect(validRoom(room), `${s.phase} hole ${s.hole}`).toBe(true);
      const raw = JSON.stringify({
        v: 2,
        type: "state",
        players,
        grid: { revision: 0, cells: Array(16).fill(false) },
        room,
        ack: Number.MAX_SAFE_INTEGER,
      });
      expect(raw.length).toBeLessThan(MAX_MESSAGE);
      expect(parseMessage(raw)?.type).toBe("state");
    };
    for (let i = 0; i <= 2000; i++) {
      if (s.phase === "aiming")
        for (const p of players) s = commitGolf(s, p.id, s.hole, 315, 1);
      check();
      if (i % 200 === 0 && s.phase !== "finished") {
        const p = pauseGolf(s);
        expect(validRoom({ ...room, minigolf: golfView(p) })).toBe(true);
        expect(validRoom({ ...room, minigolf: golfView(resumeGolf(p)) })).toBe(
          true,
        );
      }
      s = stepGolf(s, 100, () => 0.99);
    }
    const bad = golfView(aiming());
    for (const patch of [
      { hole: 6 },
      { wind: 4 },
      { conditions: { strength: 0, impact: null } },
      { ticks: -1 },
      { tickRemainder: 1000 },
      { tickRemainder: undefined },
      { remaining: 1 },
      { remaining: 20001 },
      { resumePhase: "rolling" },
      { balls: [bad.balls[0], bad.balls[0]] },
    ])
      expect(validRoom({ ...room, minigolf: { ...bad, ...patch } })).toBe(
        false,
      );
    expect(validRoom({ ...room, kind: "lights" })).toBe(false);
    expect(validRoom({ ...room, treasure: {} })).toBe(false);
  });
  it("bounds every shot field and rejects oversized envelopes", () => {
    const packet = {
      v: 2,
      type: "input",
      epoch: 1,
      sequence: 1,
      input: { kind: "golf-shot", hole: 1, angle: 0, power: 0 },
    };
    expect(parseMessage(JSON.stringify(packet))?.type).toBe("input");
    for (const patch of [
      { hole: 0 },
      { hole: 6 },
      { angle: 360 },
      { angle: -1 },
      { angle: null },
      { power: 1.001 },
      { power: -0.1 },
      { power: "1" },
    ])
      expect(
        parseMessage(
          JSON.stringify({ ...packet, input: { ...packet.input, ...patch } }),
        ),
      ).toBeNull();
    expect(
      parseMessage(
        JSON.stringify({ ...packet, padding: "x".repeat(MAX_MESSAGE) }),
      ),
    ).toBeNull();
  });
});
