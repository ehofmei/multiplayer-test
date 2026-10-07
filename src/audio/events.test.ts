import { newSumo } from "../games/sumo";
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

it("announces Sumo starts, dashes, ring-outs and outcomes once", () => {
  const s = snapshot();
  s.room = newRoom("sumo", 1);
  s.room.sumo = newSumo(["a", "b", "c"]);
  let before = frame(s);
  s.room.sumo.phase = "playing";
  expect(soundEvents(before, frame(s))).toEqual(["go"]);
  before = frame(s);
  s.room.sumo.bumpers[0].cooldown = 240;
  expect(soundEvents(before, frame(s))).toEqual(["paddle"]);
  before = frame(s);
  s.room.sumo.bumpers[0].alive = false;
  expect(soundEvents(before, frame(s))).toEqual(["miss"]);
  before = frame(s);
  s.room.sumo.phase = "finished";
  expect(soundEvents(before, frame(s))).toEqual(["finish"]);
  s.room.sumo.bumpers[0].alive = true;
  expect(soundEvents(before, frame(s))).toEqual(["win"]);
  expect(soundEvents(frame(s), frame(s))).toEqual([]);
});

it("plays one Light Seek cue per event, uses found instead of hit, and never replays on reopening", () => {
  const s = snapshot();
  s.room = newRoom("seek", 1);
  let before = frame(s);
  for (const [i, result] of (["miss", "hit", "found"] as const).entries()) {
    s.room.seek!.last = {
      event: i + 1,
      player: "a",
      cell: i,
      result,
      piece: result === "found" ? 0 : null,
    };
    const after = frame(s);
    expect(soundEvents(before, after)).toEqual([`seek-${result}`]);
    expect(soundEvents(after, after)).toEqual([]);
    expect(soundEvents(null, after)).toEqual([]);
    before = after;
  }
  s.room.epoch++;
  expect(soundEvents(before, frame(s))).toEqual([]);
});

it("announces decision locks, launches, scores and results once without replaying on resume", async () => {
  const { newGolf, stepGolf, commitGolf, pauseGolf, resumeGolf } =
    await import("../games/minigolf");
  const {
    newTreasure,
    stepTreasure,
    chooseTreasure,
    pauseTreasure,
    resumeTreasure,
  } = await import("../games/treasure");
  const { newPicnic, stepPicnic, commitPicnic, pausePicnic, resumePicnic } =
    await import("../games/picnic");
  for (const kind of ["minigolf", "treasure", "picnic"] as const) {
    const s = snapshot();
    s.room = newRoom(kind, 1);
    if (kind === "minigolf")
      s.room.minigolf = stepGolf(
        newGolf(["a", "b"], () => 0),
        7000,
      );
    if (kind === "treasure")
      s.room.treasure = stepTreasure(
        newTreasure(["a", "b"], () => 0),
        3000,
      );
    if (kind === "picnic")
      s.room.picnic = stepPicnic(
        newPicnic(["a", "b"], () => 0),
        3000,
      );
    const choose = (id: string) => {
      if (s.room.minigolf)
        s.room.minigolf = commitGolf(s.room.minigolf, id, 1, 0, 0.6);
      if (s.room.treasure)
        s.room.treasure = chooseTreasure(s.room.treasure, id, 1, 1, "return");
      if (s.room.picnic)
        s.room.picnic = commitPicnic(s.room.picnic, id, 1, {
          option: 0,
          x: 0,
          y: 0,
          rotation: 0,
        });
    };
    let before = frame(s);
    choose("a");
    expect(soundEvents(before, frame(s))).toEqual(["success"]);
    before = frame(s);
    choose("b");
    expect(soundEvents(before, frame(s))).toEqual([
      kind === "minigolf" ? "go" : kind === "picnic" ? "point" : "success",
    ]);
    if (s.room.minigolf) {
      before = frame(s);
      s.room.minigolf = stepGolf(s.room.minigolf, 3000);
      expect(soundEvents(before, frame(s))).toEqual(["point"]);
    }
    before = frame(s);
    if (s.room.minigolf)
      s.room.minigolf = resumeGolf(pauseGolf(s.room.minigolf));
    if (s.room.treasure)
      s.room.treasure = resumeTreasure(pauseTreasure(s.room.treasure));
    if (s.room.picnic) s.room.picnic = resumePicnic(pausePicnic(s.room.picnic));
    expect(soundEvents(before, frame(s))).toEqual([]);
    before = frame(s);
    if (s.room.minigolf)
      s.room.minigolf = {
        ...s.room.minigolf,
        phase: "finished",
        resumePhase: null,
      };
    if (s.room.treasure)
      s.room.treasure = {
        ...s.room.treasure,
        phase: "finished",
        resumePhase: null,
      };
    if (s.room.picnic)
      s.room.picnic = {
        ...s.room.picnic,
        phase: "finished",
        resumePhase: null,
      };
    const after = frame(s);
    expect(soundEvents(before, after)).toEqual(["win"]);
    expect(soundEvents(after, after)).toEqual([]);
    expect(soundEvents(null, after)).toEqual([]);
    s.room.epoch++;
    expect(soundEvents(after, frame(s))).toEqual([]);
  }
});
