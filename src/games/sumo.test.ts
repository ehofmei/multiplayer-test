import { expect, it } from "vitest";
import { newRoom } from "./model";
import { validRoom } from "./validate";
import { parseMessage, MAX_MESSAGE } from "../network/protocol";
import {
  dashSumo,
  moveSumo,
  newSumo,
  stepSumo,
  stopSumo,
  sumoRadius,
  SUMO_BODY,
  SUMO_COOLDOWN,
  SUMO_COUNTDOWN,
  SUMO_PRESSURE,
  SUMO_LEASE,
  SUMO_SPEED,
  SUMO_HZ,
  sumoStick,
  type SumoState,
} from "./sumo";
const playing = (ids = ["a", "b"]): SumoState => ({
  ...newSumo(ids),
  phase: "playing",
  countdown: 0,
});
const advance = (s: SumoState, ticks: number) => {
  for (let i = 0; i < ticks; i++) s = stepSumo(s);
  return s;
};
const room = (s: SumoState) => ({ ...newRoom("sumo", 1), sumo: s });
it("starts 2–8 separated, numbered seats and counts down before motion", () => {
  for (let n = 2; n <= 8; n++) {
    const s = newSumo(Array.from({ length: n }, (_, i) => String(i)));
    expect(validRoom(room(s))).toBe(true);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        expect(
          Math.hypot(
            s.bumpers[i].x - s.bumpers[j].x,
            s.bumpers[i].y - s.bumpers[j].y,
          ),
        ).toBeGreaterThan(2 * SUMO_BODY);
    expect(moveSumo(s, "0", 1, 0)).toBe(s);
    const started = advance(s, SUMO_COUNTDOWN);
    expect(started.phase).toBe("playing");
    expect(started.ticks).toBe(0);
  }
});
it("normalizes diagonal motion, brakes on release and expires lost input", () => {
  let s = moveSumo(playing(), "a", 1, 1);
  expect(Math.hypot(s.bumpers[0].dx, s.bumpers[0].dy)).toBeCloseTo(1);
  s = advance(s, 24);
  expect(s.bumpers[0].x).toBeGreaterThan(0.25);
  expect(s.bumpers[0].y).toBeGreaterThan(0.5);
  const speed = Math.hypot(s.bumpers[0].vx, s.bumpers[0].vy);
  s = advance(moveSumo(s, "a", 0, 0), 24);
  expect(Math.hypot(s.bumpers[0].vx, s.bumpers[0].vy)).toBeLessThan(speed);
  s = advance(moveSumo(s, "a", 1, 0), SUMO_LEASE);
  expect(s.bumpers[0].inputFor).toBe(0);
  expect(s.bumpers[0].dx).toBe(0);
  for (const [x, y] of [
    [NaN, 0],
    [0, Infinity],
    [1.01, 0],
  ])
    expect(moveSumo(s, "a", x, y)).toBe(s);
  expect(moveSumo(s, "spectator", 1, 0).bumpers).toEqual(s.bumpers);
});
it("dashes only while moving, enforces recharge and bounds speed", () => {
  let s = playing();
  expect(dashSumo(s, "a").bumpers).toEqual(s.bumpers);
  s = dashSumo(moveSumo(s, "a", 1, 0), "a");
  expect(s.bumpers[0].vx).toBeCloseTo(1.35);
  expect(s.bumpers[0].cooldown).toBe(SUMO_COOLDOWN);
  expect(dashSumo(s, "a").bumpers).toEqual(s.bumpers);
  s = advance(s, SUMO_COOLDOWN);
  expect(s.bumpers[0].cooldown).toBe(0);
  s = dashSumo(moveSumo(s, "a", 0, -1), "a");
  expect(s.bumpers[0].vy).toBeLessThan(-0.6);
  expect(validRoom(room(s))).toBe(true);
});
it("transfers a head-on bump without repeated kicks and separates coincident centers", () => {
  const s = playing();
  s.bumpers[0] = { ...s.bumpers[0], x: 0.465, vx: 0.4 };
  s.bumpers[1] = { ...s.bumpers[1], x: 0.53, y: 0.5 };
  const bumped = stepSumo(s);
  expect(bumped.bumpers[1].vx).toBeGreaterThan(0.35);
  expect(bumped.bumpers[0].vx).toBeLessThan(0.05);
  const speed = bumped.bumpers[1].vx;
  expect(stepSumo(bumped).bumpers[1].vx).toBeLessThan(speed);
  s.bumpers[0].x = s.bumpers[1].x = 0.5;
  s.bumpers[0].vx = 0;
  const apart = stepSumo(s);
  expect(apart.bumpers[1].x - apart.bumpers[0].x).toBeCloseTo(2 * SUMO_BODY);
});
it("rings out simultaneously, stops eliminated movement and resolves wins and simultaneous draws without a timed survivor win", () => {
  let s = playing();
  s.bumpers[0].x = 0.945;
  const won = stepSumo(s);
  expect(won.phase).toBe("finished");
  expect(won.bumpers.map((b) => b.alive)).toEqual([false, true]);
  expect(moveSumo(won, "a", 1, 0)).toBe(won);
  expect(stepSumo(won)).toBe(won);
  s.bumpers[1].x = 0.055;
  expect(stepSumo(s).bumpers.every((b) => !b.alive)).toBe(true);
  s = playing();
  s.ticks = 60 * 120 - 1;
  s.bumpers[0].x = 0.4;
  s.bumpers[1].x = 0.6;
  const timed = stepSumo(s);
  expect(timed.phase).toBe("playing");
  expect(validRoom(room(timed))).toBe(true);
  expect(timed.bumpers.every((b) => b.alive)).toBe(true);
  expect(sumoRadius(0)).toBeCloseTo(0.44);
  expect(sumoRadius(60 * 120)).toBeCloseTo(0.2);
  expect(sumoRadius(SUMO_PRESSURE)).toBe(0);
  const squeezed = advance(timed, 30 * 120);
  expect(squeezed.phase).toBe("finished");
  expect(squeezed.bumpers.filter((b) => b.alive).length).toBeLessThanOrEqual(1);
  expect(validRoom(room(squeezed))).toBe(true);
  expect(validRoom(room({ ...timed, phase: "finished" }))).toBe(false);
});
it("freezes pause/countdown controls and stops velocity before resuming", () => {
  const moving = dashSumo(moveSumo(playing(), "a", 1, 0), "a");
  const paused = { ...stopSumo(moving), phase: "paused" as const };
  expect(stepSumo(paused)).toBe(paused);
  expect(moveSumo(paused, "a", 1, 0)).toBe(paused);
  expect(dashSumo(paused, "a")).toBe(paused);
  expect(paused.bumpers[0]).toMatchObject({
    vx: 0,
    vy: 0,
    dx: 0,
    dy: 0,
    inputFor: 0,
  });
});
it("validates a full eight-player simulation and bounds malformed wire fields", () => {
  let s = playing(Array.from({ length: 8 }, (_, i) => String(i)));
  for (let tick = 0; tick < SUMO_PRESSURE && s.phase !== "finished"; tick++) {
    if (tick % 12 === 0)
      for (const b of s.bumpers) {
        s = moveSumo(
          s,
          b.id,
          Math.sin(tick * 0.01 + Number(b.id)),
          Math.cos(tick * 0.01 + Number(b.id)),
        );
        if (tick % 120 === 0) s = dashSumo(s, b.id);
      }
    s = stepSumo(s);
    expect(validRoom(room(s))).toBe(true);
  }
  expect(s.phase).toBe("finished");
  expect(JSON.stringify(room(s)).length).toBeLessThan(MAX_MESSAGE / 2);
  for (const [field, value] of [
    ["x", -0.1],
    ["vy", Infinity],
    ["dx", 2],
    ["cooldown", 241],
    ["inputFor", 46],
    ["alive", 1],
    ["id", ""],
  ]) {
    const broken = playing();
    Object.assign(broken.bumpers[0], { [field as string]: value });
    expect(validRoom(room(broken))).toBe(false);
  }
  const duplicate = playing(["a", "a"]);
  expect(validRoom(room(duplicate))).toBe(false);
  expect(validRoom({ ...newRoom("lights", 1), sumo: s })).toBe(false);
  expect(validRoom({ ...room(s), ship: {} })).toBe(false);
  const wire = (input: unknown) =>
    JSON.stringify({ v: 2, type: "input", epoch: 1, sequence: 1, input });
  expect(parseMessage(wire({ kind: "sumo-dash" }))).not.toBeNull();
  expect(parseMessage(wire({ kind: "sumo-move", x: 1, y: -1 }))).not.toBeNull();
  for (const input of [
    { kind: "sumo-move", x: 2, y: 0 },
    { kind: "sumo-move", x: "1", y: 0 },
    { kind: "sumo-move", x: 0 },
  ])
    expect(parseMessage(wire(input))).toBeNull();
});

it("a fast contact pushes an opponent across the edge while the attacker survives", () => {
  const s = playing();
  s.bumpers[0] = { ...s.bumpers[0], x: 0.84, vx: 1 };
  s.bumpers[1] = { ...s.bumpers[1], x: 0.91, y: 0.5 };
  const result = advance(s, 120);
  expect(result.phase).toBe("finished");
  expect(result.bumpers.map((b) => b.alive)).toEqual([true, false]);
});

it("filters thumb jitter, preserves analog travel and bounds off-pad diagonals", () => {
  expect(sumoStick(0.04, -0.04)).toEqual({ x: 0, y: 0 });
  expect(sumoStick(0.54, 0).x).toBeCloseTo(0.5);
  expect(sumoStick(-4, 0)).toEqual({ x: -1, y: 0 });
  const diagonal = sumoStick(2, 2);
  expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
});
it("dash covers substantially more ground than steering and brakes on release", () => {
  const start = moveSumo(playing(), "a", 1, 0);
  const normal = advance(start, 22);
  const burst = advance(dashSumo(start, "a"), 22);
  expect(burst.bumpers[0].x - 0.25).toBeGreaterThan(
    (normal.bumpers[0].x - 0.25) * 4,
  );
  expect(
    Math.hypot(burst.bumpers[0].vx, burst.bumpers[0].vy),
  ).toBeLessThanOrEqual(SUMO_SPEED);
  const released = advance(moveSumo(burst, "a", 0, 0), 24);
  expect(
    Math.hypot(released.bumpers[0].vx, released.bumpers[0].vy),
  ).toBeLessThan(0.4);
});

it("rejects pressure ticks outside the bounded wire range and rejects shared survivor results", () => {
  const s = playing();
  expect(validRoom(room({ ...s, ticks: SUMO_PRESSURE + 1 }))).toBe(false);
  expect(
    validRoom(room({ ...s, ticks: 60 * SUMO_HZ, phase: "finished" })),
  ).toBe(false);
});
