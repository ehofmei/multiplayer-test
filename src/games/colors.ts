export const paddleColors = [
  { name: "Lime", hex: "#d9f29d" },
  { name: "Sky", hex: "#7dd3fc" },
  { name: "Coral", hex: "#fda4af" },
  { name: "Gold", hex: "#fde047" },
  { name: "Lavender", hex: "#c4b5fd" },
  { name: "White", hex: "#f5f4ee" },
] as const;
export type PaddleColor = (typeof paddleColors)[number]["name"];
export const validColor = (value: unknown): value is PaddleColor =>
  paddleColors.some((c) => c.name === value);
export const paddleHex = (color: PaddleColor | undefined, side: number) =>
  paddleColors.find((c) => c.name === color)?.hex ??
  paddleColors[side % paddleColors.length].hex;
