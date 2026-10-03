// RFC 9285: this alphabet fits QR alphanumeric mode, producing a less dense
// symbol than base64 for compressed binary data.
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
export function encodeBase45(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 2) {
    const pair = i + 1 < bytes.length;
    const value = pair ? bytes[i] * 256 + bytes[i + 1] : bytes[i];
    text += alphabet[value % 45] + alphabet[Math.floor(value / 45) % 45];
    if (pair) text += alphabet[Math.floor(value / 2025)];
  }
  return text;
}
export function decodeBase45(text: string): Uint8Array<ArrayBuffer> {
  if (text.length % 3 === 1) throw new Error("Invalid Base45 length.");
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 3) {
    const values = [...text.slice(i, i + 3)].map((c) => alphabet.indexOf(c));
    if (values.some((v) => v < 0)) throw new Error("Invalid Base45 character.");
    const value = values[0] + values[1] * 45 + (values[2] ?? 0) * 2025;
    if (values.length === 3) {
      if (value > 65535) throw new Error("Invalid Base45 pair.");
      bytes.push(Math.floor(value / 256), value % 256);
    } else {
      if (value > 255) throw new Error("Invalid Base45 byte.");
      bytes.push(value);
    }
  }
  return new Uint8Array(bytes);
}
