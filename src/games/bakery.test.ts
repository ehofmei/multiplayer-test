import { describe, expect, it } from "vitest";
import {
  advanceBakery,
  bakeryScore,
  bakeryView,
  newBakery,
  pickBakery,
  type BakeryCard,
} from "./bakery";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { MAX_MESSAGE, parseMessage } from "../network/protocol";

const ids = ["a", "b", "c"];
const deal = () => newBakery(ids, () => 0.5);
describe("Midnight Bakery", () => {
  it("scores pairs, leftover singles and one sprinkle per cake", () => {
    const cases: [BakeryCard[], number][] = [
      [[], 0],
      [["cookie"], 2],
      [["cookie", "cookie"], 6],
      [["cookie", "cookie", "cookie"], 8],
      [["jelly"], 0],
      [["jelly", "jelly", "jelly"], 7],
      [["jelly", "jelly", "jelly", "jelly"], 14],
      [["cupcake"], 3],
      [["sprinkles"], 1],
      [["cupcake", "sprinkles"], 6],
      [["cupcake", "sprinkles", "sprinkles"], 7],
      [["gremlin"], 1],
    ];
    for (const [cards, points] of cases)
      expect(bakeryScore(cards)).toBe(points);
  });
  it("waits for every pick, rejects duplicates/stale picks and reveals together", () => {
    const initial = deal();
    const locked = pickBakery(initial, "a", 1, 1, 0);
    expect(locked.phase).toBe("picking");
    expect(locked.bakers[0].treats).toEqual([]);
    for (const [id, round, pick, index] of [
      ["a", 1, 1, 1],
      ["b", 2, 1, 0],
      ["b", 1, 2, 0],
      ["no", 1, 1, 0],
      ["b", 1, 1, -1],
      ["b", 1, 1, 6],
      ["b", 1, 1, 0.5],
    ] as const)
      expect(pickBakery(locked, id, round, pick, index)).toBe(locked);
    const reveal = pickBakery(pickBakery(locked, "b", 1, 1, 0), "c", 1, 1, 0);
    expect(reveal.phase).toBe("reveal");
    expect(
      reveal.bakers.every((b) => b.treats.length === 1 && b.hand!.length === 5),
    ).toBe(true);
    expect(pickBakery(reveal, "a", 1, 1, 0)).toBe(reveal);
  });
  it("reverses for odd gremlins, cancels even gremlins and passes the correct hands", () => {
    for (const gremlins of [0, 1, 2, 3]) {
      let s = deal();
      s.bakers.forEach(
        (b, i) => (b.hand![0] = i < gremlins ? "gremlin" : "cookie"),
      );
      for (const id of ids) s = pickBakery(s, id, 1, 1, 0);
      expect(s.direction).toBe(gremlins % 2 ? -1 : 1);
      const next = advanceBakery(s);
      expect(next.bakers[0].hand).toEqual(s.bakers[gremlins % 2 ? 1 : 2].hand);
      expect(next.bakers.every((b) => !b.locked && b.choice === null)).toBe(
        true,
      );
    }
  });
  it("makes gremlins mischievous at two players by skipping one pass", () => {
    let s = newBakery(["a", "b"], () => 0.5);
    s.bakers[0].hand![0] = "gremlin";
    s.bakers[1].hand![0] = "cookie";
    s = pickBakery(pickBakery(s, "a", 1, 1, 0), "b", 1, 1, 0);
    const next = advanceBakery(s);
    expect(next.bakers[0].hand).toEqual(s.bakers[0].hand);
    expect(next.bakers[1].hand).toEqual(s.bakers[1].hand);
    expect(next.reversed).toBe(false);
  });
  it("completes exactly twelve picks, banks round one and starts a fresh round", () => {
    let s = deal();
    for (let round = 1; round <= 2; round++) {
      for (let pick = 1; pick <= 6; pick++) {
        for (const id of ids) s = pickBakery(s, id, round, pick, 0);
        expect(validRoom({ ...newRoom("bakery", 1), bakery: s })).toBe(true);
        s = advanceBakery(s);
        expect(validRoom({ ...newRoom("bakery", 1), bakery: s })).toBe(true);
      }
      if (round === 1) {
        const scores = s.bakers.map((b) => bakeryScore(b.treats));
        expect(s.phase).toBe("round-results");
        s = advanceBakery(s, () => 0.5);
        expect(s.bakers.map((b) => b.banked)).toEqual(scores);
        expect(
          s.bakers.every((b) => b.treats.length === 0 && b.hand!.length === 6),
        ).toBe(true);
      }
    }
    expect(s.phase).toBe("finished");
    expect(advanceBakery(s)).toBe(s);
  });
  it("keeps hands and choices private and snapshots bounded for eight players", () => {
    const state = pickBakery(
      newBakery(Array.from({ length: 8 }, (_, i) => String(i))),
      "0",
      1,
      1,
      2,
    );
    for (const viewer of ["0", "1", "spectator"]) {
      const view = bakeryView(state, viewer);
      expect(view.bakers.every((b) => b.id === viewer || b.hand === null)).toBe(
        true,
      );
      expect(view.bakers.every((b) => b.choice === null)).toBe(true);
      expect(view.bakers[0].locked).toBe(true);
      const message = JSON.stringify({
        v: 2,
        type: "state",
        grid: { revision: 0, cells: Array(16).fill(false) },
        room: { ...newRoom("bakery", 1), bakery: view },
        players: state.bakers.map((b) => ({ id: b.id, name: b.id })),
      });
      expect(message.length).toBeLessThan(MAX_MESSAGE);
      expect(parseMessage(message)).not.toBeNull();
    }
  });
  it("rejects malformed snapshots, foreign state and invalid actions", () => {
    const room = { ...newRoom("bakery", 1), bakery: deal() };
    expect(validRoom(room)).toBe(true);
    const mutations = [
      (v: typeof room) => {
        v.bakery.bakers[0].hand![0] = "bogus" as BakeryCard;
      },
      (v: typeof room) => {
        v.bakery.bakers[0].hand!.push("cookie");
      },
      (v: typeof room) => {
        v.bakery.bakers[0].id = "b";
      },
      (v: typeof room) => {
        v.bakery.round = 0;
      },
      (v: typeof room) => {
        v.bakery.phase = "finished";
      },
      (v: typeof room) => {
        v.bakery.phase = "paused";
      },
      (v: typeof room) => {
        v.bakery.bakers[0].banked = 99;
      },
      (v: typeof room) => {
        v.bakery.bakers[0].last = "cookie";
      },
    ];
    for (const mutate of mutations) {
      const v = structuredClone(room);
      mutate(v);
      expect(validRoom(v)).toBe(false);
    }
    expect(validRoom({ ...newRoom("lights", 1), bakery: deal() })).toBe(false);
    for (const input of [
      { kind: "bakery-pick", round: 1, pick: 1, index: 0 },
      { kind: "bakery-pick", round: 1, pick: 1, index: 6 },
      { kind: "bakery-pick", round: 1, pick: 7, index: 0 },
      { kind: "bakery-pick", round: 0, pick: 1, index: 0 },
    ])
      expect(
        !!parseMessage(
          JSON.stringify({ v: 2, type: "input", epoch: 1, sequence: 1, input }),
        ),
      ).toBe(input.round === 1 && input.pick === 1 && input.index === 0);
  });
});
