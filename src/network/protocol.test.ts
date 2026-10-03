import { describe, expect, it } from "vitest";
import { parseMessage } from "./protocol";
import { parseSignal } from "./signaling";
describe("untrusted inputs", () => {
  it("rejects malformed, oversized, unsupported and out-of-range messages", () => {
    for (const raw of [
      "{",
      "null",
      '"hello"',
      "x".repeat(17_000),
      JSON.stringify({ v: 3, type: "hello", player: { id: "a", name: "A" } }),
      JSON.stringify({ v: 2, type: "toggle", index: 16, sequence: 1 }),
      JSON.stringify({ v: 2, type: "ping", id: -1 }),
      JSON.stringify({ v: 2, type: "pong", id: "1" }),
      JSON.stringify({
        v: 2,
        type: "state",
        grid: { revision: 0, cells: [true] },
        players: [],
      }),
    ])
      expect(parseMessage(raw)).toBeNull();
  });
  it("accepts a valid action and bounded player identity", () => {
    expect(parseMessage('{"v":2,"type":"ping","id":7}')?.type).toBe("ping");
    expect(parseMessage('{"v":2,"type":"pong","id":7}')?.type).toBe("pong");
    expect(
      parseMessage('{"v":2,"type":"toggle","index":0,"sequence":1,"epoch":0}'),
    ).toEqual({ v: 2, type: "toggle", index: 0, sequence: 1, epoch: 0 });
    expect(
      parseMessage('{"v":2,"type":"hello","player":{"id":"a","name":"Alex"}}')
        ?.type,
    ).toBe("hello");
  });
  it("requires a complete signal of the expected type", () => {
    const offer = {
      v: 1,
      session: "a",
      peer: "b",
      description: { type: "offer", sdp: "v=0\r\n" },
    };
    expect(parseSignal(JSON.stringify(offer), "offer")).toEqual(offer);
    for (const text of ["null", "{}", "{", JSON.stringify(offer)])
      expect(() => parseSignal(text, "answer")).toThrow();
  });
});
