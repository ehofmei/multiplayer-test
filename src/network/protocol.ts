import { validShipSetting } from "../games/ship-controls";
import { glowInt, validGlowPicks } from "../games/glow";
import { validSeekLayout, seekInteger } from "../games/seek";
import { validPlacement } from "../games/picnic";
import { validShot } from "../games/minigolf";
import { treasureChoices } from "../games/treasure";
import { cycleDirections } from "../games/cycle";
import { validColor, type PaddleColor } from "../games/colors";
import { validRoom } from "../games/validate";
import type { Room, GameInput } from "../games/model";
import type { GridState } from "../game/grid";

// Breakout uses the existing bounded paddle input; its level, brick hit points,
// and shared lives are validated as part of every room snapshot by validRoom.
// Decision phases use remaining=0; validRoom checks their timing and Golf
// tickRemainder. Update all devices before playing the revised rules.
// Optional regular-Pong bumpers carry bounded positions, warning/flash timers and
// impact counts, checked by validRoom for every state. No new client action.
// Older hosts can omit bumpers; update every device to see the same obstacles.
// Ship rules 2 require all devices to update: typed settings and team scores
// are validated by validRoom; old hull snapshots are rejected.
export const VERSION = 2;
export const MAX_MESSAGE = 16_384;
export interface Player {
  id: string;
  name: string;
  color?: PaddleColor;
}
export type Message =
  | { v: 2; type: "hello"; player: Player }
  | { v: 2; type: "toggle"; index: number; sequence: number; epoch: number }
  | { v: 2; type: "ping" | "pong"; id: number }
  | {
      v: 2;
      type: "state";
      grid: GridState;
      room: Room;
      players: Player[];
      ack?: number;
    }
  | { v: 2; type: "input"; epoch: number; sequence: number; input: GameInput };
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
export const validPlayer = (p: unknown): p is Player =>
  record(p) &&
  typeof p.id === "string" &&
  p.id.length > 0 &&
  p.id.length <= 80 &&
  typeof p.name === "string" &&
  p.name.trim().length > 0 &&
  p.name.length <= 32 &&
  (p.color === undefined || validColor(p.color));
export function parseMessage(raw: unknown): Message | null {
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE) return null;
  try {
    const m: unknown = JSON.parse(raw);
    if (!record(m) || m.v !== VERSION) return null;
    if (
      m.type === "input" &&
      integer(m.epoch) &&
      integer(m.sequence) &&
      record(m.input)
    ) {
      const i = m.input;
      if (
        i.kind === "glow-color" &&
        Object.keys(i).length === 2 &&
        glowInt(i.color, 0, 11)
      )
        return m as Message;
      if (
        i.kind === "glow-picks" &&
        Object.keys(i).length === 3 &&
        glowInt(i.round, 1, 12) &&
        validGlowPicks(i.picks)
      )
        return m as Message;
      if (
        i.kind === "seek-ready" &&
        Object.keys(i).length === 2 &&
        validSeekLayout(i.layout)
      )
        return m as Message;
      if (
        i.kind === "seek-guess" &&
        Object.keys(i).length === 3 &&
        seekInteger(i.turn, 1, 200) &&
        seekInteger(i.cell, 0, 99)
      )
        return m as Message;
      if (
        i.kind === "picnic-place" &&
        integer(i.round) &&
        i.round >= 1 &&
        i.round <= 10 &&
        (i.placement === null || validPlacement(i.placement))
      )
        return m as Message;
      if (
        i.kind === "golf-shot" &&
        integer(i.hole) &&
        i.hole >= 1 &&
        i.hole <= 5 &&
        validShot(i.angle, i.power)
      )
        return m as Message;
      if (
        i.kind === "dive-choice" &&
        integer(i.dive) &&
        i.dive >= 1 &&
        i.dive <= 3 &&
        integer(i.door) &&
        i.door >= 1 &&
        i.door <= 6 &&
        treasureChoices.some((c) => c === i.choice)
      )
        return m as Message;
      if (
        i.kind === "bakery-pick" &&
        integer(i.round) &&
        i.round >= 1 &&
        i.round <= 2 &&
        integer(i.pick) &&
        i.pick >= 1 &&
        i.pick <= 6 &&
        integer(i.index) &&
        i.index < 6
      )
        return m as Message;
      if (i.kind === "sumo-dash") return m as Message;
      if (
        i.kind === "sumo-move" &&
        typeof i.x === "number" &&
        Number.isFinite(i.x) &&
        Math.abs(i.x) <= 1 &&
        typeof i.y === "number" &&
        Number.isFinite(i.y) &&
        Math.abs(i.y) <= 1
      )
        return m as Message;
      if (
        i.kind === "cycle-turn" &&
        cycleDirections.some((d) => d === i.direction)
      )
        return m as Message;
      if (
        i.kind === "ship-control" &&
        validShipSetting(i.control as number, i.value as number) &&
        integer(i.control) &&
        i.control < 24 &&
        integer(i.value) &&
        i.value <= 3 &&
        integer(i.revision) &&
        i.revision <= 100_000
      )
        return m as Message;
      if (i.kind === "color" && validColor(i.color)) return m as Message;
      if (
        i.kind === "paddle" &&
        typeof i.position === "number" &&
        Number.isFinite(i.position) &&
        i.position >= 0 &&
        i.position <= 1
      )
        return m as Message;
      if (
        i.kind === "target" &&
        integer(i.round) &&
        i.round >= 1 &&
        i.round <= 10 &&
        integer(i.index) &&
        i.index < 6 &&
        integer(i.elapsed) &&
        i.elapsed <= 2000
      )
        return m as Message;
    }
    if (m.type === "hello" && validPlayer(m.player)) return m as Message;
    if ((m.type === "ping" || m.type === "pong") && integer(m.id))
      return m as Message;
    if (
      m.type === "toggle" &&
      integer(m.epoch) &&
      integer(m.index) &&
      m.index < 16 &&
      integer(m.sequence)
    )
      return m as Message;
    if (
      m.type === "state" &&
      validRoom(m.room) &&
      (m.ack === undefined || integer(m.ack)) &&
      record(m.grid) &&
      integer(m.grid.revision) &&
      Array.isArray(m.grid.cells) &&
      m.grid.cells.length === 16 &&
      m.grid.cells.every((c) => typeof c === "boolean") &&
      Array.isArray(m.players) &&
      m.players.length <= 8 &&
      m.players.every(validPlayer) &&
      new Set(m.players.map((p) => p.id)).size === m.players.length
    )
      return m as Message;
  } catch {
    /* Invalid input is reported by the session. */
  }
  return null;
}
