import { newCycle } from "../games/cycle";
import { launchShip } from "../games/ship";
import { newBreakout } from "../games/breakout";
import { describe, expect, it } from "vitest";
import { soundEvents, soundFrame } from "./events";
import { newPong, newRoom, raceRound } from "../games/model";
import { initialGrid, toggleGrid } from "../game/grid";
import type { Snapshot } from "../network/session";
const snapshot = (): Snapshot => ({
  room: newRoom("lights", 1),
  grid: initialGrid(),
  players: [{ id: "a", name: "A" }],
  links: [],
  status: "",
  error: "",
});
const frame = (s: Snapshot) => soundFrame(s, "a", "session");
describe("game sound transitions", () => {
  it("copies host state, plays toggles once, and stays silent on first state or game switches", () => {
    const s = snapshot(),
      before = frame(s);
    s.grid = toggleGrid(s.grid, 0);
    const next = frame(s);
    expect(soundEvents(before, next)).toEqual(["on"]);
    expect(soundEvents(next, next)).toEqual([]);
    expect(soundEvents(null, next)).toEqual([]);
    s.grid = toggleGrid(s.grid, 0);
    expect(soundEvents(next, frame(s))).toEqual(["off"]);
    s.room.epoch++;
    expect(soundEvents(next, frame(s))).toEqual([]);
    expect(soundEvents(next, soundFrame(s, "a", "another-room"))).toEqual([]);
  });
  it("separates Pong paddle/wall hits, serves, points and match results", () => {
    const s = snapshot();
    s.room = newRoom("pong", 1);
    s.room.pong = { ...newPong(["a", "b"]), phase: "playing" };
    let before = frame(s);
    s.room.pong.ball.vx *= -1;
    s.room.pong.ball.vy *= -1;
    expect(soundEvents(before, frame(s))).toEqual(["paddle"]);
    before = frame(s);
    s.room.pong.ball.vy *= -1;
    expect(soundEvents(before, frame(s))).toEqual(["wall"]);
    before = frame(s);
    s.room.pong.phase = "serve";
    s.room.pong.score[0]++;
    expect(soundEvents(before, frame(s))).toEqual(["point"]);
    before = frame(s);
    s.room.pong.phase = "playing";
    expect(soundEvents(before, frame(s))).toEqual(["serve"]);
    before = frame(s);
    s.room.pong.score[0] = 7;
    s.room.pong.phase = "finished";
    expect(soundEvents(before, frame(s))).toEqual(["win"]);
    expect(
      soundEvents(
        { ...before, pong: { ...before.pong!, winner: false } },
        soundFrame(s, "b", "session"),
      ),
    ).toEqual(["finish"]);
  });
  it("plays shared brick, miss and team victory cues without repeats", () => {
    const s = snapshot();
    s.room = newRoom("breakout", 1);
    s.room.pong = { ...newBreakout(["a", "b"]), phase: "playing" };
    let before = frame(s);
    s.room.pong.breakout!.bricks[0]--;
    expect(soundEvents(before, frame(s))).toEqual(["success"]);
    before = frame(s);
    s.room.pong.breakout!.lives--;
    expect(soundEvents(before, frame(s))).toEqual(["miss"]);
    before = frame(s);
    s.room.pong.phase = "finished";
    expect(soundEvents(before, frame(s))).toEqual(["win"]);
    expect(soundFrame(s, "b", "session").pong?.winner).toBe(true);
    expect(soundEvents(frame(s), frame(s))).toEqual([]);
    s.room.pong.phase = "playing";
    before = frame(s);
    s.room.pong.phase = "finished";
    s.room.pong.breakout!.lives = 0;
    expect(soundEvents(before, frame(s))).toEqual(["finish"]);
  });
  it("announces ship repair, damage and shared outcomes without replay", () => {
    const s = snapshot();
    s.room = newRoom("ship", 1);
    s.room.ship = launchShip(["a"]);
    let before = frame(s);
    s.room.ship.repairs++;
    expect(soundEvents(before, frame(s))).toEqual(["success"]);
    before = frame(s);
    s.room.ship.mistakes++;
    s.room.ship.hull -= 5;
    expect(soundEvents(before, frame(s))).toEqual(["wrong"]);
    before = frame(s);
    s.room.ship.phase = "finished";
    s.room.ship.remaining = 0;
    expect(soundEvents(before, frame(s))).toEqual(["win"]);
    expect(soundEvents(frame(s), frame(s))).toEqual([]);
    expect(soundEvents(null, frame(s))).toEqual([]);
    before = { ...frame(s), ship: { ...frame(s).ship!, phase: "playing" } };
    s.room.ship.hull = 0;
    expect(soundEvents(before, frame(s))).toEqual(["finish"]);
  });
  it("announces target and hold cues, individual results and finishes without repeats", () => {
    const s = snapshot();
    s.room = newRoom("reaction", 1);
    s.room.race = raceRound(
      [{ id: "a", points: 0, result: "pending", elapsed: null }],
      1,
    );
    let before = frame(s);
    s.room.race.phase = "active";
    s.room.race.target = 2;
    expect(soundEvents(before, frame(s))).toEqual(["go"]);
    before = frame(s);
    s.room.race.entries[0].result = "hit";
    expect(soundEvents(before, frame(s))).toEqual(["success"]);
    for (const result of ["wrong", "early", "miss", "held"] as const) {
      s.room.race.entries[0].result = "pending";
      before = frame(s);
      s.room.race.entries[0].result = result;
      expect(soundEvents(before, frame(s))).toEqual([
        result === "held" ? "success" : result === "miss" ? "miss" : "wrong",
      ]);
    }
    s.room.race = raceRound(s.room.race.entries, 3);
    before = frame(s);
    s.room.race.phase = "active";
    expect(soundEvents(before, frame(s))).toEqual(["hold"]);
    before = frame(s);
    s.room.race.phase = "finished";
    const last = frame(s);
    expect(soundEvents(before, last)).toEqual(["win"]);
    expect(soundEvents(last, last)).toEqual([]);
  });
});

it("announces cycle starts, personal crashes and wins once", () => {
  const s = snapshot();
  s.room = newRoom("cycle", 1);
  s.room.cycle = newCycle(["a", "b", "c"]);
  let before = frame(s);
  s.room.cycle.phase = "playing";
  expect(soundEvents(before, frame(s))).toEqual(["go"]);
  before = frame(s);
  s.room.cycle.riders[0].alive = false;
  expect(soundEvents(before, frame(s))).toEqual(["miss"]);
  before = frame(s);
  s.room.cycle.phase = "finished";
  expect(soundEvents(before, frame(s))).toEqual(["finish"]);
  s.room.cycle.riders[0].alive = true;
  expect(soundEvents(before, frame(s))).toEqual(["win"]);
  expect(soundEvents(frame(s), frame(s))).toEqual([]);
  expect(soundEvents(null, frame(s))).toEqual([]);
});
