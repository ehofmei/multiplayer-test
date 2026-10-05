import { describe, expect, it } from "vitest";
import {
  commitPicnic,
  fitsPiece,
  newPicnic,
  pausePicnic,
  picnicScore,
  picnicView,
  pieceCells,
  resumePicnic,
  shapes,
  stepPicnic,
  type PicnicState,
} from "./picnic";
import { validRoom } from "./validate";
import { newRoom } from "./model";
import { MAX_MESSAGE, parseMessage } from "../network/protocol";
const placing = () =>
  stepPicnic(
    newPicnic(["a", "b"], () => 0),
    3000,
    () => 0,
  );
const seed = () => {
  let n = 42;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
};
describe("Patchwork Picnic", () => {
  it("rotates every footprint around its normalized anchor without reflection", () => {
    for (const shape of shapes) {
      const original = pieceCells(shape, 0);
      for (let r = 0; r < 4; r++) {
        const cells = pieceCells(shape, r);
        expect(cells).toHaveLength(original.length);
        expect(new Set(cells.map((c) => c.join(","))).size).toBe(cells.length);
        expect(Math.min(...cells.map(([x]) => x))).toBe(0);
        expect(Math.min(...cells.map(([, y]) => y))).toBe(0);
        for (const [x, y] of cells)
          expect(
            cells.length === 1 ||
              cells.some(([a, b]) => Math.abs(x - a) + Math.abs(y - b) === 1),
          ).toBe(true);
      }
      expect(pieceCells(shape, 4)).toEqual(original);
    }
    expect(pieceCells("ell", 1)).toEqual([
      [2, 0],
      [1, 0],
      [0, 0],
      [0, 1],
    ]);
    expect(pieceCells("line", 1)).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
  });
  it("rejects overlap, boundaries, malformed placement, stale round, spectators and duplicate locks", () => {
    let s = placing();
    s = { ...s, offer: [{ shape: "ell", food: 1 }, ...s.offer.slice(1)] };
    for (const p of [
      { option: 0, x: 5, y: 0, rotation: 0 },
      { option: 0, x: 0, y: 5, rotation: 1 },
      { option: 0, x: -1, y: 0, rotation: 0 },
      { option: 3, x: 0, y: 0, rotation: 0 },
      { option: 0, x: 0, y: 0, rotation: 4 },
      { option: 0, x: 0.5, y: 0, rotation: 0 },
    ])
      expect(commitPicnic(s, "a", 1, p)).toBe(s);
    const p = { option: 0, x: 0, y: 0, rotation: 0 };
    expect(commitPicnic(s, "watcher", 1, p)).toBe(s);
    expect(commitPicnic(s, "a", 2, p)).toBe(s);
    const locked = commitPicnic(s, "a", 1, p);
    expect(locked.picnickers[0].board).toBe("0".repeat(36));
    expect(picnicView(locked).picnickers[0].placement).toBeNull();
    expect(commitPicnic(locked, "a", 1, null)).toBe(locked);
    const revealed = commitPicnic(locked, "b", 1, null);
    expect(revealed.phase).toBe("reveal");
    expect(revealed.picnickers[0].gain).toBe(7);
    expect(fitsPiece(revealed.picnickers[0].board, s.offer[0], p)).toBe(false);
  });
  it("counts orthogonal edges once, rows once, no diagonals, and derives bonuses separately", () => {
    expect(
      picnicScore("110000" + "100000" + "0".repeat(24), "corners"),
    ).toEqual({ cells: 3, edges: 2, rows: 0, bonus: 3, base: 5, total: 8 });
    expect(
      picnicScore("100000" + "010000" + "0".repeat(24), "corners").edges,
    ).toBe(0);
    const full = "2".repeat(36);
    expect(picnicScore(full, "border")).toEqual({
      cells: 36,
      edges: 60,
      rows: 6,
      bonus: 20,
      base: 132,
      total: 152,
    });
    expect(picnicScore("3".repeat(36), "center").bonus).toBe(8);
    expect(picnicScore("1".repeat(36), "corners").bonus).toBe(12);
    let s = placing();
    s = {
      ...s,
      offer: [{ shape: "single", food: 1 }, ...s.offer.slice(1)],
      picnickers: s.picnickers.map((p) => ({
        ...p,
        board: "111110" + "0".repeat(30),
      })),
    };
    s = commitPicnic(s, "a", 1, { option: 0, x: 5, y: 0, rotation: 0 });
    s = commitPicnic(s, "b", 1, null);
    expect(s.picnickers[0].gain).toBe(8);
    expect(s.picnickers[0].rows).toEqual([0]);
    s = stepPicnic(s, 3000, () => 0);
    s = commitPicnic(s, "a", 2, null);
    s = commitPicnic(s, "b", 2, null);
    expect(s.picnickers[0].gain).toBe(0);
    expect(picnicScore(s.picnickers[0].board, s.bonus).rows).toBe(1);
  });
  it("uses shape/food bags with a free single in the opening and closing rounds", () => {
    let s = placing();
    expect(s.offer[0].shape).toBe("single");
    expect(s.bags!.shapes).toHaveLength(4);
    for (let round = 1; round <= 10; round++) {
      expect(new Set(s.offer.map((p) => p.food)).size).toBe(3);
      if (round === 1 || round >= 7) expect(s.offer[0].shape).toBe("single");
      s = stepPicnic(s, 18000, () => 0);
    }
    expect(s.phase).toBe("finished");
  });
  it("skips timeouts, handles phase overshoot and freezes paused/finished timers", () => {
    let s = newPicnic(["a", "b"], () => 0);
    s = stepPicnic(s, 18000, () => 0);
    expect(s.phase).toBe("reveal");
    expect(s.picnickers.every((p) => p.outcome === "timeout")).toBe(true);
    s = stepPicnic(s, 3500, () => 0);
    expect(s.round).toBe(2);
    expect(s.remaining).toBe(14500);
    const paused = pausePicnic(commitPicnic(s, "a", 2, null));
    expect(stepPicnic(paused, 1e6)).toBe(paused);
    const interrupted = pausePicnic(stepPicnic(resumePicnic(paused), 1000));
    expect(interrupted.resumeRemaining).toBe(14500);
    expect(interrupted.picnickers[0].locked).toBe(true);
    s = stepPicnic(resumePicnic(interrupted), 3000);
    expect(s.phase).toBe("placing");
    expect(s.remaining).toBe(14500);
    s = stepPicnic(s, 1e6, () => 0);
    expect(s.phase).toBe("finished");
    expect(stepPicnic(s, 1e6)).toBe(s);
    expect(stepPicnic(newPicnic(), 1000).phase).toBe("ready");
  });
  it("fits ten seeded pieces, including rotated placements, and shares identical totals", () => {
    const random = seed();
    let s = stepPicnic(newPicnic(["a", "b"], random), 3000, random);
    let count = 0;
    for (let round = 1; round <= 10; round++) {
      let action = null;
      for (let o = 0; o < 3 && !action; o++)
        for (let r = 0; r < 4 && !action; r++)
          for (let y = 0; y < 6 && !action; y++)
            for (let x = 0; x < 6 && !action; x++) {
              const p = { option: o, x, y, rotation: r };
              if (fitsPiece(s.picnickers[0].board, s.offer[o], p)) action = p;
            }
      expect(action).not.toBeNull();
      count++;
      for (const id of ["a", "b"]) s = commitPicnic(s, id, round, action);
      s = stepPicnic(s, 3000, random);
    }
    expect(count).toBe(10);
    expect(s.phase).toBe("finished");
    expect(s.picnickers[0].board).toBe(s.picnickers[1].board);
  });
  it("a crowded blanket accepts a rotated line and can always skip", () => {
    let s = placing();
    s = {
      ...s,
      round: 10,
      offer: [{ shape: "line", food: 3 }, ...s.offer.slice(1)],
      picnickers: s.picnickers.map((p) => ({
        ...p,
        board: "111110".repeat(3) + "1".repeat(18),
      })),
    };
    const action = { option: 0, x: 5, y: 0, rotation: 1 };
    expect(fitsPiece(s.picnickers[0].board, s.offer[0], action)).toBe(true);
    s = commitPicnic(s, "a", 10, action);
    s = commitPicnic(s, "b", 10, null);
    expect(s.picnickers[0].rows).toEqual([0, 1, 2]);
    expect(s.picnickers[1].outcome).toBe("skipped");
  });
  it("bounds wire inputs and complete eight-player snapshots, including maximal escaped identities", () => {
    const ids = Array.from({ length: 8 }, (_, i) => `${i}${'"'.repeat(79)}`);
    let s = stepPicnic(
      newPicnic(ids, () => 0),
      3000,
      () => 0,
    );
    const message = (state: PicnicState) =>
      JSON.stringify({
        v: 2,
        type: "state",
        grid: { revision: 0, cells: Array(16).fill(false) },
        room: { ...newRoom("picnic", 1), picnic: picnicView(state) },
        players: ids.map((id) => ({ id, name: '"'.repeat(32) })),
        ack: Number.MAX_SAFE_INTEGER,
      });
    for (let r = 1; r <= 10; r++) {
      expect(message(s).length).toBeLessThan(MAX_MESSAGE);
      expect(parseMessage(message(s))).not.toBeNull();
      s = stepPicnic(s, 18000, () => 0);
    }
    expect(parseMessage(message(s))).not.toBeNull();
    const wire = (placement: unknown, round = 1) =>
      JSON.stringify({
        v: 2,
        type: "input",
        epoch: 1,
        sequence: 1,
        input: { kind: "picnic-place", round, placement },
      });
    expect(parseMessage(wire(null))).not.toBeNull();
    expect(
      parseMessage(wire({ option: 2, x: 5, y: 5, rotation: 3 })),
    ).not.toBeNull();
    for (const p of [
      undefined,
      {},
      false,
      { option: 0, x: 6, y: 0, rotation: 0 },
      { option: 0, x: 0, y: 0, rotation: NaN },
    ])
      expect(parseMessage(wire(p))).toBeNull();
    expect(parseMessage(wire(null, 11))).toBeNull();
    const room = { ...newRoom("picnic", 1), picnic: picnicView(placing()) };
    expect(validRoom(room)).toBe(true);
    for (const patch of [
      { bags: { shapes: [], foods: [] } },
      { round: 11 },
      { offer: [] },
      { remaining: 15001 },
      {
        picnickers: [
          { ...room.picnic.picnickers[0], board: "9".repeat(36) },
          room.picnic.picnickers[1],
        ],
      },
    ])
      expect(validRoom({ ...room, picnic: { ...room.picnic, ...patch } })).toBe(
        false,
      );
    expect(validRoom({ ...room, treasure: {} })).toBe(false);
    expect(validRoom({ ...newRoom("lights", 1), picnic: room.picnic })).toBe(
      false,
    );
  });
});
