import { describe, expect, it } from "vitest";
import {
  newSeek,
  readySeek,
  guessSeek,
  stepSeek,
  pauseSeek,
  resumeSeek,
  seekView,
  seekCells,
  placedSeekCells,
  fitsSeek,
  validSeekLayout,
  type SeekPlacement,
} from "./seek";
import { validSeek } from "./seek-validate";
import { newRoom } from "./model";
import { parseMessage, MAX_MESSAGE } from "../network/protocol";
import { initialGrid } from "../game/grid";
export const layout: SeekPlacement[] = [
  { piece: 0, x: 0, y: 0, rotation: 0 },
  { piece: 1, x: 0, y: 1, rotation: 0 },
  { piece: 2, x: 0, y: 3, rotation: 0 },
  { piece: 3, x: 0, y: 4, rotation: 0 },
  { piece: 4, x: 0, y: 6, rotation: 0 },
];
const started = () =>
  stepSeek(
    readySeek(
      readySeek(
        newSeek(["a", "b"], () => 0),
        "a",
        layout,
      ),
      "b",
      layout,
    ),
    3000,
  );
describe("Light Seek", () => {
  it("normalizes distinct rotations, preserves square/plus and allows 19 touching tiles", () => {
    expect(new Set(layout.flatMap(placedSeekCells)).size).toBe(19);
    expect(validSeekLayout(layout)).toBe(true);
    for (let p = 0; p < 5; p++) {
      const rotations = Array.from({ length: 4 }, (_, r) =>
        seekCells(p, r)
          .map(([x, y]) => `${x},${y}`)
          .sort()
          .join(";"),
      );
      expect(new Set(rotations).size).toBe([2, 4, 2, 1, 1][p]);
      for (let r = 0; r < 4; r++) {
        const cells = seekCells(p, r);
        expect(Math.min(...cells.map(([x]) => x))).toBe(0);
        expect(Math.min(...cells.map(([, y]) => y))).toBe(0);
      }
    }
    expect(fitsSeek(layout, { ...layout[0], y: 1 })).toBe(false);
    expect(fitsSeek(layout, { ...layout[0], x: 9 })).toBe(false);
    expect(validSeekLayout(layout.slice(1))).toBe(false);
    expect(validSeekLayout([...layout.slice(1), layout[1]])).toBe(false);
  });
  it("locks complete layouts once, waits untimed and draws the first player once", () => {
    let s = newSeek(["a", "b"], () => 0.999);
    expect(s.current).toBe("b");
    expect(seekView(s, "a").current).toBeNull();
    expect(readySeek(s, "spectator", layout)).toBe(s);
    expect(readySeek(s, "a", layout.slice(1))).toBe(s);
    s = readySeek(s, "a", layout);
    expect(stepSeek(s, 999999)).toBe(s);
    expect(readySeek(s, "a", layout)).toBe(s);
    expect(guessSeek(s, "b", 1, 0)).toBe(s);
    s = readySeek(s, "b", layout);
    expect(s.phase).toBe("countdown");
    expect(guessSeek(s, "b", 1, 0)).toBe(s);
    expect(stepSeek(s, 3000).phase).toBe("playing");
  });
  it("resolves miss/hit/found, alternates on hits, rejects repeats/stale and wins without a reply", () => {
    let s = started();
    expect(guessSeek(s, "b", 1, 0)).toBe(s);
    expect(guessSeek(s, "a", 2, 0)).toBe(s);
    expect(guessSeek(s, "a", 1, -1)).toBe(s);
    const targets = layout.flatMap(placedSeekCells);
    for (const [i, c] of targets.entries()) {
      s = guessSeek(s, "a", s.turn, c);
      expect(s.last?.result).toBe(
        [2, 5, 9, 13, 18].includes(i) ? "found" : "hit",
      );
      expect(s.last?.piece).toBe(
        s.last?.result === "found"
          ? layout.find((p) => placedSeekCells(p).includes(c))!.piece
          : null,
      );
      expect(validSeek(seekView(s, "a"))).toBe(true);
      if (i < 18) {
        expect(s.current).toBe("b");
        s = guessSeek(s, "b", s.turn, 99 - i);
        expect(s.last?.result).toBe("miss");
        expect(guessSeek(s, "a", s.turn, c)).toBe(s);
      }
    }
    expect(s.phase).toBe("finished");
    expect(s.winner).toBe("a");
    expect(s.seats[1].found).toHaveLength(5);
    expect(guessSeek(s, "b", s.turn, 20)).toBe(s);
    expect(stepSeek(s, 999999)).toBe(s);
    expect(
      seekView(s, "watcher").seats.every((p) => p.layout?.length === 5),
    ).toBe(true);
    expect(
      newSeek(["a", "b"], () => 1).seats.every(
        (p) => !p.ready && p.found.length === 0,
      ),
    ).toBe(true);
  });
  it("filters host/client/spectator views, including hit identity and mutable layout aliases", () => {
    let s = guessSeek(started(), "a", 1, 0);
    expect(seekView(s, "a").seats[1].layout).toBeNull();
    expect(seekView(s, "b").seats[0].layout).toBeNull();
    expect(seekView(s, "watcher").seats.every((p) => p.layout === null)).toBe(
      true,
    );
    expect(s.last?.piece).toBeNull();
    const view = seekView(s, "a");
    view.seats[0].layout![0].x = 9;
    expect(s.seats[0].layout![0].x).toBe(0);
    s = guessSeek(s, "b", 2, 99);
    s = guessSeek(s, "a", 3, 1);
    s = guessSeek(s, "b", 4, 98);
    s = guessSeek(s, "a", 5, 2);
    const opponent = seekView(s, "a").seats[1];
    expect(opponent.found).toEqual([layout[0]]);
    expect(opponent.layout).toBeNull();
  });
  it("preserves setup, countdown and active play through repeated pause/reorientation", () => {
    for (const original of [
      newSeek(["a", "b"]),
      readySeek(readySeek(newSeek(["a", "b"]), "a", layout), "b", layout),
      started(),
    ]) {
      let s = pauseSeek(original);
      expect(stepSeek(s, 9000)).toBe(s);
      expect(readySeek(s, "a", layout)).toBe(s);
      expect(guessSeek(s, "a", 1, 0)).toBe(s);
      s = stepSeek(resumeSeek(s), 1000);
      s = pauseSeek(s);
      s = stepSeek(resumeSeek(s), 3000);
      expect(s).toEqual(original);
      expect(validSeek(seekView(s, "a"))).toBe(true);
    }
  });
  it("bounds wire actions and maximal eight-device result snapshots, rejects malformed states", () => {
    const input = (input: unknown) =>
      JSON.stringify({ v: 2, type: "input", epoch: 1, sequence: 2, input });
    expect(parseMessage(input({ kind: "seek-ready", layout }))).not.toBeNull();
    for (const bad of [
      { kind: "seek-ready", layout: layout.slice(1) },
      { kind: "seek-guess", turn: 0, cell: 0 },
      { kind: "seek-guess", turn: 1, cell: 100 },
      { kind: "seek-guess", turn: 1, cell: 1, piece: 0 },
    ])
      expect(parseMessage(input(bad))).toBeNull();
    const ids = Array.from({ length: 8 }, (_, i) => `${i}${'"'.repeat(79)}`),
      names = ids.map((id) => ({ id, name: '"'.repeat(32) }));
    let s = stepSeek(
      readySeek(
        readySeek(
          newSeek(ids.slice(0, 2), () => 0),
          ids[0],
          layout,
        ),
        ids[1],
        layout,
      ),
      3000,
    );
    for (const [i, c] of layout.flatMap(placedSeekCells).entries()) {
      s = guessSeek(s, ids[0], s.turn, c);
      if (i < 18) s = guessSeek(s, ids[1], s.turn, 99 - i);
    }
    const room = { ...newRoom("seek", 9), seek: seekView(s, ids[7]) };
    const raw = JSON.stringify({
      v: 2,
      type: "state",
      grid: initialGrid(),
      room,
      players: names,
    });
    expect(raw.length).toBeLessThan(MAX_MESSAGE);
    expect(parseMessage(raw)).not.toBeNull();
    for (const patch of [
      { turn: 999 },
      { remaining: 1 },
      { winner: "unknown" },
      { seats: [] },
      { last: { ...s.last, piece: 99 } },
      { seats: s.seats.map((p) => ({ ...p, search: "2".repeat(101) })) },
    ])
      expect(validSeek({ ...room.seek, ...patch })).toBe(false);
    expect(parseMessage(" ".repeat(MAX_MESSAGE + 1))).toBeNull();
  });
});
