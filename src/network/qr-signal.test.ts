import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeSignal, encodeSignal } from "./qr-signal";
import { encodeBase45 } from "./base45";

const offer = {
  v: 1,
  session: "a",
  peer: "b",
  description: {
    type: "offer",
    sdp: "v=0\r\na=candidate:" + "local-network ".repeat(100),
  },
};
const raw = JSON.stringify(offer);
afterEach(() => vi.unstubAllGlobals());
describe("QR signaling", () => {
  it("round-trips complete offers with compression and accepts legacy text", async () => {
    const encoded = await encodeSignal(raw);
    expect(encoded.startsWith("P2P1:")).toBe(true);
    expect(encoded.length).toBeLessThan(raw.length);
    expect(await decodeSignal(encoded, "offer")).toEqual(offer);
    expect(await decodeSignal(raw, "offer")).toEqual(offer);
    await expect(decodeSignal(encoded, "answer")).rejects.toThrow(
      "valid join code",
    );
  });
  it("rejects invalid, truncated, oversized and expanded payloads", async () => {
    for (const value of ["P2P1:!", "P2P1:eA", "P2P1:" + "x".repeat(65_536)])
      await expect(decodeSignal(value, "offer")).rejects.toThrow();
    await expect(encodeSignal("x".repeat(65_537))).rejects.toThrow("too large");
    const compressed = new Blob(["x".repeat(100_000)])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(compressed).arrayBuffer());
    const bomb = "P2P1:" + encodeBase45(bytes);
    await expect(decodeSignal(bomb, "offer")).rejects.toThrow("too large");
  });
  it("keeps raw copy/paste usable when compression APIs are absent", async () => {
    const encoded = await encodeSignal(raw);
    vi.stubGlobal("CompressionStream", undefined);
    vi.stubGlobal("DecompressionStream", undefined);
    expect(await encodeSignal(raw)).toBe(raw);
    expect(await decodeSignal(raw, "offer")).toEqual(offer);
    await expect(decodeSignal(encoded, "offer")).rejects.toThrow("copy/paste");
  });
});
