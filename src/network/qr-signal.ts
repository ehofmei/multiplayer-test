import { parseSignal, type Signal } from "./signaling";
import { decodeBase45, encodeBase45 } from "./base45";

const PREFIX = "P2P1:";
const MAX = 65_536;

async function boundedBytes(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX) throw new Error("Connection text is too large.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function encodeSignal(raw: string): Promise<string> {
  if (new TextEncoder().encode(raw).length > MAX)
    throw new Error("Connection text is too large.");
  if (typeof CompressionStream === "undefined") return raw;
  const bytes = await boundedBytes(
    new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
  );
  return PREFIX + encodeBase45(bytes);
}

export async function decodeSignal(
  raw: string,
  type: "offer" | "answer",
): Promise<Signal> {
  const text = raw.trim();
  if (!text.startsWith(PREFIX)) return parseSignal(text, type);
  if (text.length > MAX) throw new Error("Connection text is too large.");
  if (typeof DecompressionStream === "undefined")
    throw new Error(
      "This browser cannot read compressed QR codes. Use copy/paste text instead.",
    );
  let decoded: string;
  try {
    const encoded = text.slice(PREFIX.length);
    if (!encoded) throw new Error();
    const bytes = decodeBase45(encoded);
    const result = await boundedBytes(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")),
    );
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Connection text is too large."
    )
      throw error;
    throw new Error(
      "Invalid QR connection text. Scan a fresh code or use copy/paste.",
    );
  }
  return parseSignal(decoded, type);
}
