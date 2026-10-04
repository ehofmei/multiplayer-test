// A gentle opening, then a predictable time-based ramp even on wall-only rallies.
export function rallyBall(
  ball: { vx: number; vy: number },
  elapsed: number,
  cap: number,
) {
  const current = Math.hypot(ball.vx, ball.vy);
  if (current === 0) return ball;
  const minimum = 0.42 + Math.max(0, elapsed - 2) * 0.065;
  const speed = Math.min(cap, Math.max(current, minimum));
  return { vx: (ball.vx * speed) / current, vy: (ball.vy * speed) / current };
}
