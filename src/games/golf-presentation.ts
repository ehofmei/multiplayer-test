import type { GolfPoint } from "./golf-motion";

export const golfScreenAngle = (angle: number, portrait: boolean) =>
  (angle + (portrait ? 270 : 0)) % 360;
export const golfGuideLength = (scale: number) =>
  Math.max(180, Math.min(280, 76 / Math.max(0.1, scale)));

type LabelBall = GolfPoint & {
  id: string;
  captured: boolean;
  skipped: boolean;
};
export interface GolfLabel {
  id: string;
  text: string;
  members: string[];
  local: boolean;
  x: number;
  y: number;
  width: number;
  ballX: number;
  ballY: number;
}

// Lay out in CSS pixels after course rotation. Bodies are never displaced.
export function golfLabels(
  balls: LabelBall[],
  me: string,
  portrait: boolean,
  scale: number,
): GolfLabel[] {
  const s = Math.max(0.1, scale);
  const width = (portrait ? 700 : 1000) * s;
  const height = (portrait ? 1000 : 700) * s;
  const live = balls.flatMap((b, i) =>
    b.captured || b.skipped
      ? []
      : [
          {
            ...b,
            number: i + 1,
            x: (portrait ? b.y : b.x) * s,
            y: (portrait ? 1000 - b.x : b.y) * s,
          },
        ],
  );
  const groups: (typeof live)[] = [];
  const remaining = new Set(live);
  for (const ball of live) {
    if (!remaining.delete(ball)) continue;
    const group = [ball];
    for (let i = 0; i < group.length; i++)
      for (const other of remaining)
        if (Math.hypot(other.x - group[i].x, other.y - group[i].y) < 28) {
          remaining.delete(other);
          group.push(other);
        }
    groups.push(group);
  }
  const pending = groups
    .flatMap((group) => {
      const own = group.find((b) => b.id === me);
      const others = group.filter((b) => b !== own);
      return [
        ...(own
          ? [{ ball: own, members: [own.id], text: `${own.number} · You` }]
          : []),
        ...(others.length > 1
          ? [
              {
                ball: others[0],
                members: others.map((b) => b.id),
                text: `+${others.length}`,
              },
            ]
          : others.map((b) => ({
              ball: b,
              members: [b.id],
              text: String(b.number),
            }))),
      ];
    })
    .sort(
      (a, b) =>
        Number(b.ball.id === me) - Number(a.ball.id === me) ||
        a.ball.number - b.ball.number,
    );
  const labels: GolfLabel[] = [];
  for (const { ball, members, text } of pending) {
    const w = ball.id === me ? 49 : text.length > 1 ? 28 : 18;
    let chosen: GolfLabel | undefined;
    // Stable nearby slots, then a bounded wider search for corner clusters.
    for (const distance of [23, 43, 63, 83]) {
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [1, 0],
        [-1, 0],
        [1, -1],
        [-1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const x = Math.max(
          w / 2 + 3,
          Math.min(width - w / 2 - 3, ball.x + dx * distance),
        );
        const y = Math.max(13, Math.min(height - 13, ball.y + dy * distance));
        // An edge-clamped badge must not sit over a ball, especially yours.
        if (
          live.some((b) => {
            const radius = (b.id === me ? 23 : 10) * s + 3;
            return (
              Math.abs(b.x - x) < w / 2 + radius &&
              Math.abs(b.y - y) < 10 + radius
            );
          })
        )
          continue;
        if (
          labels.some(
            (l) =>
              Math.abs(l.x - x) < (l.width + w) / 2 + 4 &&
              Math.abs(l.y - y) < 24,
          )
        )
          continue;
        chosen = {
          id: ball.id,
          text,
          members,
          local: ball.id === me,
          x,
          y,
          width: w,
          ballX: ball.x,
          ballY: ball.y,
        };
        break;
      }
      if (chosen) break;
    }
    if (chosen) labels.push(chosen);
  }
  return labels;
}
