import type { GridState } from "../game/grid";

export const VERSION = 1;
export const MAX_MESSAGE = 16_384;
export interface Player {
  id: string;
  name: string;
}
export type Message =
  | { v: 1; type: "hello"; player: Player }
  | { v: 1; type: "toggle"; index: number; sequence: number }
  | { v: 1; type: "ping" | "pong"; id: number }
  | { v: 1; type: "state"; grid: GridState; players: Player[]; ack?: number };
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
  p.name.length <= 32;
export function parseMessage(raw: unknown): Message | null {
  if (typeof raw !== "string" || raw.length > MAX_MESSAGE) return null;
  try {
    const m: unknown = JSON.parse(raw);
    if (!record(m) || m.v !== VERSION) return null;
    if (m.type === "hello" && validPlayer(m.player)) return m as Message;
    if ((m.type === "ping" || m.type === "pong") && integer(m.id))
      return m as Message;
    if (
      m.type === "toggle" &&
      integer(m.index) &&
      m.index < 16 &&
      integer(m.sequence)
    )
      return m as Message;
    if (
      m.type === "state" &&
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
