export interface CyclePoint {
  x: number;
  y: number;
}
const distance = (a: CyclePoint, b: CyclePoint) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const adjacentCyclePoints = (a: CyclePoint, b: CyclePoint) =>
  distance(a, b) === 1;
// If a snapshot arrives before the previous animation finishes, finish that
// segment through its confirmed corner before taking the new one. Never cut a
// diagonal across a turn, and never extrapolate beyond the confirmed target.
export function cycleDrawPoint(
  from: CyclePoint,
  corner: CyclePoint,
  target: CyclePoint,
  fraction: number,
): CyclePoint {
  const first = distance(from, corner),
    second = distance(corner, target);
  const travel = (first + second) * Math.max(0, Math.min(1, fraction));
  const a = travel < first ? from : corner;
  const b = travel < first ? corner : target;
  const length = travel < first ? first : second;
  const ratio =
    length === 0
      ? 1
      : Math.min(1, (travel < first ? travel : travel - first) / length);
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}
