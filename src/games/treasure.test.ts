import { describe, expect, it } from "vitest";
import {
  newTreasure,
  chooseTreasure,
  stepTreasure,
  pauseTreasure,
  resumeTreasure,
  treasureView,
  treasureTotal,
  TREASURE_DECK,
  type TreasureState,
  type DoorCard,
  type TreasureChoice,
} from "./treasure";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { parseMessage, MAX_MESSAGE } from "../network/protocol";
import { initialGrid } from "../game/grid";
const ids = ["a", "b", "c"];
function choosing(card: DoorCard = 0, door = 1): TreasureState {
  const s = stepTreasure(
    newTreasure(ids, () => 0.5),
    3000,
  );
  const deck = [
    card,
    ...TREASURE_DECK.filter((_, i) => i !== TREASURE_DECK.indexOf(card)),
  ].slice(0, 13 - door);
  return {
    ...s,
    door,
    deck,
    cardsLeft: deck.length,
    hazardsLeft: deck.filter((c) => c === 0).length,
    divers: s.divers.map((d) => ({ ...d, haul: 7 })),
  };
}
function lockAll(
  s: TreasureState,
  choices: TreasureChoice[] = ["return", "explore", "shield"],
) {
  return ids.reduce(
    (state, id, i) =>
      chooseTreasure(state, id, state.dive, state.door, choices[i]),
    s,
  );
}
describe("Treasure Dive rules", () => {
  it("carries timer overshoot through phase boundaries without extending the budget", () => {
    expect(stepTreasure(choosing(), 8025).remaining).toBe(1975);
    expect(stepTreasure(newTreasure(ids), 45000).phase).toBe("finished");
  });
  it("returns before a shared hazard; shields preserve haul; unprotected explorers lose only haul", () => {
    const s = lockAll(choosing());
    expect(s.phase).toBe("reveal");
    expect(
      s.divers.map((d) => [
        treasureTotal(d),
        d.haul,
        d.status,
        d.shield,
        d.outcome,
      ]),
    ).toEqual([
      [7, 0, "boat", true, "returned"],
      [0, 0, "caught", true, "caught"],
      [0, 7, "exploring", false, "protected"],
    ]);
    expect(s.cardsLeft).toBe(11);
    expect(s.hazardsLeft).toBe(3);
  });
  it("awards full shared treasure, consumes shields on treasure, and draws without replacement", () => {
    const s = lockAll(choosing(10));
    expect(s.divers.map((d) => d.haul)).toEqual([0, 17, 17]);
    expect(s.divers[2].shield).toBe(false);
    expect(s.hazardsLeft).toBe(4);
    expect(s.deck?.filter((c) => c === 10)).toHaveLength(0);
    const next = stepTreasure(s, 2000);
    expect(chooseTreasure(next, "c", 1, 2, "shield")).toBe(next);
  });
  it("keeps earlier banked scores through hazards and banks a protected sixth-door haul", () => {
    const previous = choosing();
    const s = lockAll({
      ...previous,
      dive: 2,
      divers: previous.divers.map((d) => ({ ...d, scores: [12, 0, 0] })),
    });
    expect(s.divers.map(treasureTotal)).toEqual([19, 12, 12]);
    const sixth = lockAll(choosing(0, 6));
    expect(sixth.divers.map(treasureTotal)).toEqual([7, 0, 7]);
    expect(sixth.divers[2].outcome).toBe("auto-bank");
  });
  it("defaults missing choices to Return, skips empty expeditions, and draws no hazard", () => {
    const before = choosing();
    const s = stepTreasure(before, 8000);
    expect(s.card).toBeNull();
    expect(s.deck).toEqual(before.deck);
    expect(
      s.divers.every((d) => treasureTotal(d) === 7 && d.outcome === "timeout"),
    ).toBe(true);
    const summary = stepTreasure(s, 2000);
    expect(summary.phase).toBe("summary");
    const next = stepTreasure(summary, 4000, () => 0);
    expect(next.dive).toBe(2);
    expect(next.door).toBe(1);
    expect(next.cardsLeft).toBe(12);
    expect(
      next.divers.every(
        (d) => d.shield && d.haul === 0 && treasureTotal(d) === 7,
      ),
    ).toBe(true);
  });
  it("automatically banks sixth-door survivors and never draws a seventh card", () => {
    const s = lockAll(choosing(2, 6), ["explore", "explore", "shield"]);
    expect(
      s.divers.every(
        (d) =>
          d.status === "boat" &&
          d.haul === 0 &&
          treasureTotal(d) === 9 &&
          d.outcome === "auto-bank",
      ),
    ).toBe(true);
    expect(stepTreasure(s, 2000).phase).toBe("summary");
  });
  it("rejects spectators, duplicates, stale rounds, invalid choices, and paused/finished locks", () => {
    const s = choosing();
    for (const [id, dive, door, choice] of [
      ["spectator", 1, 1, "return"],
      ["a", 2, 1, "return"],
      ["a", 1, 2, "explore"],
      ["a", 1, 1, "unknown"],
    ] as const)
      expect(chooseTreasure(s, id, dive, door, choice as "return")).toBe(s);
    const next = chooseTreasure(s, "a", 1, 1, "explore");
    expect(chooseTreasure(next, "a", 1, 1, "return")).toBe(next);
    const paused = pauseTreasure(next);
    expect(chooseTreasure(paused, "b", 1, 1, "return")).toBe(paused);
    expect(stepTreasure(paused, 9999)).toBe(paused);
    const finished: TreasureState = { ...s, phase: "finished" };
    expect(stepTreasure(finished, 9999)).toBe(finished);
  });
  it("preserves phase, exact remaining time, deck and locked decisions through repeated pauses", () => {
    const s = chooseTreasure(
      stepTreasure(choosing(), 1234),
      "a",
      1,
      1,
      "shield",
    );
    const paused = pauseTreasure(s);
    const reorient = resumeTreasure(paused);
    expect(reorient.phase).toBe("reorient");
    const again = resumeTreasure(pauseTreasure(stepTreasure(reorient, 1000)));
    const resumed = stepTreasure(again, 3000);
    expect(resumed).toEqual(s);
    for (const active of [
      newTreasure(ids),
      lockAll(choosing()),
      stepTreasure(lockAll(choosing(), ["return", "return", "return"]), 2000),
    ])
      expect(stepTreasure(resumeTreasure(pauseTreasure(active)), 3000)).toEqual(
        active,
      );
  });
  it("completes all three dives within the 195-second budget and shares equal wins", () => {
    // Deliberately wait for each complete choice window with six treasure cards first.
    let s = newTreasure(ids, () => 0.5);
    let elapsed = 0;
    while (s.phase !== "finished") {
      if (s.phase === "choosing") {
        s = {
          ...s,
          deck: [
            ...s.deck!.filter((c) => c !== 0),
            ...s.deck!.filter((c) => c === 0),
          ],
          hazardsLeft: s.deck!.filter((c) => c === 0).length,
        };
        s = {
          ...s,
          divers: s.divers.map((d) => ({
            ...d,
            locked: true,
            choice: "explore",
          })),
        };
      }
      const time = s.remaining;
      elapsed += time;
      s = stepTreasure(s, time, () => 0.5);
    }
    expect(elapsed).toBe(195000);
    expect(s.dive).toBe(3);
    expect(s.door).toBe(6);
    expect(new Set(s.divers.map(treasureTotal)).size).toBe(1);
  });
  it("shuffles a balanced deck at random boundaries without losing cards", () => {
    for (const random of [() => 0, () => 0.999999])
      expect([...newTreasure(ids, random).deck!].sort()).toEqual(
        [...TREASURE_DECK].sort(),
      );
  });
});
describe("Treasure Dive wire boundaries", () => {
  const wire = (s: TreasureState) => ({
    ...newRoom("treasure", 5),
    treasure: treasureView(s),
  });
  it("filters the future deck and every choice for host, participant, and spectator views", () => {
    const s = chooseTreasure(choosing(), "a", 1, 1, "shield");
    expect(treasureView(s).deck).toBeNull();
    expect(treasureView(s).divers.every((d) => d.choice === null)).toBe(true);
    expect(treasureView(s).divers[0].locked).toBe(true);
    expect(validRoom(wire(s))).toBe(true);
    expect(validRoom({ ...wire(s), treasure: s })).toBe(false);
  });
  it("bounds complete eight-player messages with maximum names and IDs, at every real phase", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      id: `${i}`.repeat(80),
      name: "N".repeat(32),
    }));
    let s = newTreasure(
      players.map((p) => p.id),
      () => 0.5,
    );
    for (let i = 0; i < 30 && s.phase !== "finished"; i++) {
      const raw = JSON.stringify({
        v: 2,
        type: "state",
        room: wire(s),
        players,
        grid: initialGrid(),
        ack: 999999,
      });
      expect(raw.length).toBeLessThan(MAX_MESSAGE);
      expect(parseMessage(raw)).not.toBeNull();
      expect(validRoom(wire(pauseTreasure(s)))).toBe(true);
      if (!["ready", "finished"].includes(s.phase))
        expect(validRoom(wire(resumeTreasure(pauseTreasure(s))))).toBe(true);
      s = stepTreasure(s, s.remaining, () => 0.5);
    }
    expect(s.phase).toBe("finished");
  });
  it("fits maximal scores and escaped IDs/names within the complete message budget", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      id: "\\".repeat(79) + i,
      name: "\u0000".repeat(32),
    }));
    const s: TreasureState = {
      ...newTreasure(players.map((p) => p.id)),
      phase: "finished",
      dive: 3,
      door: 6,
      remaining: 0,
      cardsLeft: 6,
      hazardsLeft: 4,
      card: 3,
    };
    s.divers = s.divers.map((d) => ({
      ...d,
      scores: [30, 30, 30],
      status: "boat",
      shield: false,
      locked: true,
      outcome: "auto-bank",
      change: 30,
    }));
    const raw = JSON.stringify({
      v: 2,
      type: "state",
      room: wire(s),
      players,
      grid: initialGrid(),
      ack: Number.MAX_SAFE_INTEGER,
    });
    expect(raw.length).toBeLessThan(MAX_MESSAGE);
    expect(parseMessage(raw)).not.toBeNull();
  });
  it("rejects malformed and private snapshots and invalid inputs", () => {
    const s = treasureView(choosing());
    for (const patch of [
      { divers: [...s.divers, s.divers[0]] },
      { cardsLeft: 5 },
      { hazardsLeft: 5 },
      { remaining: 8001 },
      { dive: 4 },
      { door: 7 },
      { deck: [0] },
      { card: 9 },
      { resumePhase: "choosing" },
      { divers: s.divers.map((d) => ({ ...d, choice: "return" })) },
      { divers: s.divers.map((d) => ({ ...d, haul: 31 })) },
    ])
      expect(validRoom({ ...wire(s), treasure: { ...s, ...patch } })).toBe(
        false,
      );
    const message = {
      v: 2,
      type: "input",
      epoch: 5,
      sequence: 1,
      input: { kind: "dive-choice", dive: 1, door: 1, choice: "shield" },
    };
    expect(parseMessage(JSON.stringify(message))).not.toBeNull();
    for (const patch of [
      { dive: 0 },
      { dive: 4 },
      { door: 0 },
      { door: 7 },
      { choice: "bank" },
      { door: 1.2 },
    ])
      expect(
        parseMessage(
          JSON.stringify({ ...message, input: { ...message.input, ...patch } }),
        ),
      ).toBeNull();
  });
});
