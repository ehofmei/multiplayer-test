import { expect, it } from "vitest";
import { decodeBase45, encodeBase45 } from "./base45";
it("matches RFC 9285 vectors, including spaces and an odd final byte", () => {
  for (const [raw, encoded] of [
    ["AB", "BB8"],
    ["Hello!!", "%69 VD92EX0"],
    ["base-45", "UJCLQE7W581"],
    ["ietf!", "QED8WEX0"],
  ]) {
    expect(encodeBase45(new TextEncoder().encode(raw))).toBe(encoded);
    expect(new TextDecoder().decode(decodeBase45(encoded))).toBe(raw);
  }
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  expect(decodeBase45(encodeBase45(bytes))).toEqual(bytes);
});
it("rejects invalid characters, lengths, and values outside byte ranges", () => {
  for (const text of ["A", "AAAA", "aa", "::", ":::"])
    expect(() => decodeBase45(text)).toThrow();
});
