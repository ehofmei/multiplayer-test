import { describe, it, expect } from "vitest";
import {
  newGlow,
  glowRoster,
  setupGlow,
  startGlow,
  claimGlowColor,
  commitGlow,
  glowOwners,
  stepGlow,
  pauseGlow,
  resumeGlow,
  glowView,
  glowTotal,
  validGlowPicks,
  type GlowRounds,
} from "./glow";
import { validGlow } from "./glow-validate";
import { newRoom } from "./model";
import { initialGrid } from "../game/grid";
import { MAX_MESSAGE, parseMessage } from "../network/protocol";
const ids = Array.from({ length: 8 }, (_, i) => `p${i}`);
const match = (n = 3, rounds: GlowRounds = 5) =>
  stepGlow(
    startGlow(glowRoster(newGlow(rounds), ids.slice(0, n), () => 0)),
    3000,
  );
describe("Glow Clash", () => {
  it("assigns unused colors, preserves survivors, releases leavers, and resolves color conflicts", () => {
    let s = glowRoster(newGlow(), ids, () => 0.99999);
    expect(new Set(s.seats.map((p) => p.color)).size).toBe(8);
    const original = s.seats[0].color;
    s = claimGlowColor(s, ids[0], 0);
    expect(s.seats[0].color).toBe(0);
    expect(claimGlowColor(s, ids[1], 0)).toBe(s);
    expect(claimGlowColor(s, "spectator", original)).toBe(s);
    s = glowRoster(s, ids.slice(1), () => 0);
    expect(s.seats.some((p) => p.color === 0)).toBe(false);
    expect(glowRoster(s, ids, () => 0).seats[0].color).toBe(0);
    const active = match();
    expect(claimGlowColor(active, ids[0], 11)).toBe(active);
    expect(startGlow(glowRoster(newGlow(), ids.slice(0, 2))).phase).toBe(
      "ready",
    );
    const maxRandom = glowRoster(newGlow(), ids, () => 1);
    expect(validGlow(maxRandom)).toBe(true);
  });
  for (let n = 3; n <= 8; n++)
    it(`${n} players freeze ${n} rows and validate cell bounds`, () => {
      let s = match(n);
      expect(glowOwners(s, 0)).toHaveLength(0);
      expect(commitGlow(s, ids[0], 1, [0, 1, n * 4])).toBe(s);
      expect(commitGlow(s, ids[0], 1, [0, 0, 1])).toBe(s);
      expect(commitGlow(s, ids[0], 2, [0, 1, 2])).toBe(s);
      expect(commitGlow(s, "spectator", 1, [0, 1, 2])).toBe(s);
      const prior = s;
      s = commitGlow(s, ids[0], 1, [0, 1, n * 4 - 1]);
      expect(s).not.toBe(prior);
      expect(glowRoster(s, [...ids.slice(0, n), "late"])).toBe(s);
      expect(commitGlow(s, ids[0], 1, [3, 4, 5])).toBe(s);
    });
  it("waits indefinitely, hides all other picks and counts independent cells exactly once", () => {
    let s = match();
    s = commitGlow(s, ids[0], 1, [0, 1, 2]);
    expect(stepGlow(s, 1000000)).toBe(s);
    expect(glowView(s, ids[0]).seats[0].picks).toEqual([0, 1, 2]);
    expect(glowView(s, ids[1]).seats[0].picks).toBeNull();
    expect(glowView(s, "watcher").seats.every((p) => p.picks === null)).toBe(
      true,
    );
    s = commitGlow(s, ids[1], 1, [0, 3, 4]);
    expect(s.phase).toBe("choosing");
    s = commitGlow(s, ids[2], 1, [0, 4, 5]);
    expect(s.phase).toBe("reveal");
    expect(s.seats.map(glowTotal)).toEqual([2, 1, 1]);
    expect(glowOwners(s, 0)).toHaveLength(3);
    expect(glowOwners(s, 1)).toHaveLength(1);
    expect(glowOwners(s, 4)).toHaveLength(2);
    expect(
      glowView(s, "watcher").seats.every((p) => p.picks?.length === 3),
    ).toBe(true);
    expect(commitGlow(s, ids[2], 1, [6, 7, 8])).toBe(s);
    expect(validGlow(s)).toBe(true);
    const next = stepGlow(s, 6000);
    expect(next.round).toBe(2);
    expect(next.seats.every((p) => !p.locked && p.picks === null)).toBe(true);
    expect(next.seats.map(glowTotal)).toEqual([2, 1, 1]);
  });
  it("eight-way collisions award zero to everyone, independent of arrival order", () => {
    const play = (order: string[]) =>
      order.reduce((s, id) => commitGlow(s, id, 1, [0, 1, 2]), match(8));
    const s = play(ids);
    expect(s).toEqual(play([...ids].reverse()));
    expect(glowOwners(s, 0)).toHaveLength(8);
    expect(s.seats.map(glowTotal)).toEqual(Array(8).fill(0));
  });
  for (const rounds of [5, 8, 12] as GlowRounds[])
    it(`${rounds} rounds finish with a shared tie and rematch resets only scores/picks`, () => {
      let s = match(3, rounds);
      for (let r = 1; r <= rounds; r++) {
        for (const id of ids.slice(0, 3)) s = commitGlow(s, id, r, [0, 1, 2]);
        expect(s.seats.every((p) => p.scores.length === r)).toBe(true);
        s = stepGlow(s, 999999);
      }
      expect(s.phase).toBe("finished");
      expect(stepGlow(s, 999999)).toBe(s);
      expect(validGlow(s)).toBe(true);
      const setup = setupGlow(s, ids.slice(0, 3));
      expect(setup.seats.map((p) => p.color)).toEqual(
        s.seats.map((p) => p.color),
      );
      expect(
        setup.seats.every((p) => !p.scores.length && p.picks === null),
      ).toBe(true);
      expect(setup.rounds).toBe(rounds);
    });
  it("repeated pauses preserve countdown, secret locks and exact reveal time", () => {
    for (const original of [
      startGlow(glowRoster(newGlow(), ids.slice(0, 3))),
      commitGlow(match(), ids[0], 1, [0, 1, 2]),
      ids
        .slice(0, 3)
        .reduce((s, id) => commitGlow(s, id, 1, [0, 1, 2]), match()),
    ]) {
      const p = pauseGlow(original);
      expect(stepGlow(p, 99999)).toBe(p);
      const again = pauseGlow(stepGlow(resumeGlow(p), 1100));
      expect(again).toEqual(p);
      expect(stepGlow(resumeGlow(again), 3000)).toEqual(original);
      expect(validGlow(glowView(again, "watcher"))).toBe(true);
    }
  });
  it("bounds inputs and rejects impossible/publicly malformed states", () => {
    for (const picks of [
      [],
      [0],
      [0, 1],
      [0, 1, 2, 3],
      [0, 0, 1],
      [0, 1, 32],
      [0, 1, NaN],
      [0, 1, 1.5],
      "012",
    ])
      expect(validGlowPicks(picks)).toBe(false);
    const s = match();
    for (const patch of [
      { rounds: 6 },
      { round: 0 },
      { remaining: 1 },
      { resumePhase: "choosing" },
      { seats: [...s.seats, s.seats[0]] },
      { seats: s.seats.map((p) => ({ ...p, color: 0 })) },
      { seats: s.seats.map((p) => ({ ...p, picks: [0, 1, 2] })) },
    ])
      expect(validGlow({ ...s, ...patch })).toBe(false);
    const input = (i: unknown) =>
      parseMessage(
        JSON.stringify({
          v: 2,
          type: "input",
          epoch: 1,
          sequence: 1,
          input: i,
        }),
      );
    expect(
      input({ kind: "glow-picks", round: 1, picks: [0, 1, 2] }),
    ).not.toBeNull();
    for (const i of [
      { kind: "glow-picks", round: 0, picks: [0, 1, 2] },
      { kind: "glow-picks", round: 1, picks: [0, 0, 1] },
      { kind: "glow-color", color: 12 },
      { kind: "glow-color", color: 0, id: "other" },
    ])
      expect(input(i)).toBeNull();
  });
  it("keeps complete maximum escaped eight-player wire snapshots bounded and valid", () => {
    const players = ids.map((_, i) => ({
      id: String(i) + "\\".repeat(79),
      name: '"'.repeat(32),
    }));
    let s = stepGlow(
      startGlow(
        glowRoster(
          newGlow(12),
          players.map((p) => p.id),
          () => 0,
        ),
      ),
      3000,
    );
    const wire = (viewer: string) =>
      JSON.stringify({
        v: 2,
        type: "state",
        grid: initialGrid(),
        room: { ...newRoom("glow", 1), glow: glowView(s, viewer) },
        players,
        ack: Number.MAX_SAFE_INTEGER,
      });
    for (let r = 1; r <= 12; r++) {
      for (const p of players) {
        s = commitGlow(s, p.id, r, [0, 1, 2]);
        for (const viewer of [players[0].id, players[7].id, "spectator"]) {
          expect(wire(viewer).length).toBeLessThan(MAX_MESSAGE);
          expect(parseMessage(wire(viewer))).not.toBeNull();
        }
      }
      s = stepGlow(s, 6000);
    }
  });
});
