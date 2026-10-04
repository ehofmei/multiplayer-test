import { validColor, type PaddleColor } from "../games/colors";
import { validRoom } from "../games/validate";
import type { Room, GameInput } from "../games/model";
import type { GridState } from "../game/grid";

// Breakout uses the existing bounded paddle input; its level, brick hit points,
// and shared lives are validated as part of every room snapshot by validRoom.
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
