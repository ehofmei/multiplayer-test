import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GolfBallArtwork } from "./GolfCourseArtwork";
import type { GolfState } from "../games/minigolf";
import {
  consecutiveGolfFrames,
  golfContacts,
  golfDrawPoint,
  golfMotionFrame,
  type GolfContact,
  type GolfMotionFrame,
  type GolfPoint,
} from "../games/golf-motion";

type Effect = GolfContact & { key: number; started: number; duration: number };
export function GolfMotion({
  game,
  me,
  colors,
  portrait,
  revealed,
  results,
  connected,
}: {
  game: GolfState;
  me: string;
  colors: string[];
  portrait: boolean;
  revealed: boolean;
  results: boolean;
  connected: boolean;
}) {
  const root = useRef<SVGGElement>(null);
  const bodies = useRef(new Map<string, SVGGElement>());
  const rolls = useRef(new Map<string, SVGPathElement>());
  const pulses = useRef(new Map<number, SVGGElement>());
  const drawn = useRef(new Map<string, GolfPoint & { spin: number }>());
  const previous = useRef<GolfMotionFrame | null>(null);
  const effects = useRef<Effect[]>([]);
  const serial = useRef(0);
  const [shownEffects, setShownEffects] = useState<Effect[]>([]);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [visible, setVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setVisible(!document.hidden);
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useLayoutEffect(() => {
    const before = previous.current,
      next = golfMotionFrame(game);
    previous.current = next;
    const ids = new Set(next.balls.map((b) => b.id));
    drawn.current =
      !before ||
      before.hole !== next.hole ||
      next.phase === "ready" ||
      next.phase === "countdown"
        ? new Map()
        : new Map([...drawn.current].filter(([id]) => ids.has(id)));
    const now = performance.now();
    const live =
      visible && connected && ["rolling", "results"].includes(game.phase);
    const contacts = live ? golfContacts(before, next) : [];
    const flashes = contacts.filter(
      (c, i) =>
        !contacts
          .slice(0, i)
          .some(
            (other) =>
              other.kind === c.kind &&
              Math.hypot(other.x - c.x, other.y - c.y) < 12,
          ),
    );
    const retained =
      live && before?.hole === next.hole
        ? effects.current.filter((e) => now - e.started < e.duration)
        : [];
    effects.current = [
      ...retained,
      ...flashes.map((c) => ({
        ...c,
        key: ++serial.current,
        started: now,
        duration: reduced
          ? 150
          : c.kind === "meteor"
            ? 450
            : c.kind === "mushroom"
              ? 320
              : 260,
      })),
    ].slice(-16);
    if (flashes.length || retained.length !== shownEffects.length || !live)
      setShownEffects(effects.current);
    const smooth =
      live &&
      !reduced &&
      next.phase === "rolling" &&
      consecutiveGolfFrames(before, next);
    const paths = next.balls.map((b) => {
      const old = before?.balls.find((p) => p.id === b.id);
      const contact = contacts.find((c) => c.ball === b.id);
      // A reversal without a trustworthy contact point snaps instead of cutting
      // through an obstacle. Captures, pauses and results are always exact.
      const reversal = !!old && (old.vx * b.vx < 0 || old.vy * b.vy < 0);
      return {
        target: b,
        from: drawn.current.get(b.id) ?? { ...b, spin: 0 },
        corner: contact?.corner,
        moving:
          smooth &&
          !!old &&
          !b.captured &&
          !b.skipped &&
          (!reversal || !!contact?.corner),
      };
    });
    const mushrooms = Array.from(
      root.current
        ?.closest("svg")
        ?.querySelectorAll<SVGGElement>("[data-golf-mushroom-body]") ?? [],
    );
    let frame = 0;
    const draw = () => {
      const elapsed = performance.now() - now,
        fraction = Math.min(1, elapsed / 50);
      root.current?.setAttribute("data-motion", smooth ? "smooth" : "exact");
      paths.forEach((path) => {
        const point = path.moving
          ? golfDrawPoint(path.from, path.corner, path.target, fraction)
          : path.target;
        const old = drawn.current.get(path.target.id) ?? path.from;
        const spin =
          results || path.target.captured || reduced
            ? 0
            : live
              ? old.spin + Math.hypot(point.x - old.x, point.y - old.y) * 0.8
              : old.spin;
        drawn.current.set(path.target.id, { x: point.x, y: point.y, spin });
        bodies.current
          .get(path.target.id)
          ?.setAttribute("transform", `translate(${point.x} ${point.y})`);
        rolls.current
          .get(path.target.id)
          ?.setAttribute("transform", `rotate(${spin})`);
      });
      mushrooms.forEach((m) => m.removeAttribute("transform"));
      for (const effect of effects.current) {
        const p = Math.min(
          1,
          (performance.now() - effect.started) / effect.duration,
        );
        const node = pulses.current.get(effect.key);
        node?.setAttribute("opacity", String(reduced ? 1 : 1 - p));
        const ripple = node?.querySelector("circle");
        const base =
          effect.kind === "meteor"
            ? 30
            : effect.kind === "mushroom"
              ? 34
              : effect.kind === "wall"
                ? 24
                : 15;
        ripple?.setAttribute(
          "r",
          String(
            base + (reduced ? 8 : p * (effect.kind === "meteor" ? 60 : 35)),
          ),
        );
        if (effect.kind === "mushroom" && !reduced) {
          const m = mushrooms[effect.mushroom!];
          const squash =
            p < 0.35
              ? Math.sin((p / 0.35) * Math.PI)
              : -0.65 * Math.sin(((p - 0.35) / 0.65) * Math.PI);
          m?.setAttribute(
            "transform",
            `scale(${1 + 0.2 * squash} ${1 - 0.2 * squash})`,
          );
        }
      }
      const alive = effects.current.filter(
        (e) => performance.now() - e.started < e.duration,
      );
      if (alive.length !== effects.current.length) {
        effects.current = alive;
        setShownEffects(alive);
      }
      if ((smooth && fraction < 1) || effects.current.length)
        frame = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frame);
      mushrooms.forEach((m) => m.removeAttribute("transform"));
    };
    // Readiness-only updates in the same tick must not restart motion or pulses.
  }, [
    game.ticks,
    game.phase,
    game.hole,
    connected,
    portrait,
    reduced,
    visible,
  ]);
  return (
    <g
      ref={root}
      className="golf-motion"
      data-ticks={game.ticks}
      data-reduced-motion={reduced}
    >
      <g aria-hidden="true" pointerEvents="none">
        {shownEffects.map((e) => (
          <g
            key={e.key}
            ref={(node) => {
              if (node) pulses.current.set(e.key, node);
              else pulses.current.delete(e.key);
            }}
            data-golf-effect={e.kind}
            transform={`translate(${e.x} ${e.y})`}
            opacity="1"
          >
            <circle
              r={
                e.kind === "meteor"
                  ? 30
                  : e.kind === "mushroom"
                    ? 34
                    : e.kind === "wall"
                      ? 24
                      : 15
              }
              fill={e.kind === "wall" ? "#fff5c5" : "none"}
              fillOpacity=".35"
              stroke={e.kind === "mushroom" ? "#ffd1d2" : "#ffdf9b"}
              strokeWidth={e.kind === "meteor" ? 5 : 3}
            />
            {e.kind === "meteor" &&
              Array.from({ length: 8 }, (_, i) => (
                <path
                  key={i}
                  transform={`rotate(${i * 45})`}
                  d="M0-46v-18"
                  stroke="#ffe5b4"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              ))}
            {e.kind === "wall" && (
              <path
                d="M-14-14l8 8m20-8-8 8m-6-16v10"
                stroke="#fff3cd"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}
          </g>
        ))}
      </g>
      {revealed &&
        game.balls.map((b, i) => {
          const nearby = game.balls.filter(
            (other) => Math.hypot(other.x - b.x, other.y - b.y) < 40,
          );
          const slot = nearby.findIndex((other) => other.id === b.id);
          const labelX =
            (nearby.length > 1
              ? Math.min(
                  960 - (nearby.length - 1) * 48,
                  Math.max(40, b.x - (nearby.length - 1) * 24),
                ) +
                slot * 48
              : Math.max(24, Math.min(976, b.x))) - b.x;
          const labelY = Math.max(32, b.y - 28) - b.y;
          const scoreY = b.y > 620 ? -70 : 60;
          return (
            <g
              key={b.id}
              ref={(node) => {
                if (node) bodies.current.set(b.id, node);
                else bodies.current.delete(b.id);
              }}
              data-golf-ball={b.id}
              data-target-x={b.x}
              data-target-y={b.y}
              transform={`translate(${b.x} ${b.y})`}
              opacity={b.skipped ? 0.4 : 1}
            >
              <GolfBallArtwork
                x={0}
                y={0}
                radius={b.id === me ? 15 : 10}
                color={colors[i]}
                rollingRef={(node) => {
                  if (node) rolls.current.set(b.id, node);
                  else rolls.current.delete(b.id);
                }}
              />
              <text
                transform={
                  portrait ? `rotate(90 ${labelX} ${labelY})` : undefined
                }
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fill={colors[i]}
                fontSize="32"
                fontWeight="bold"
              >
                {i + 1}
              </text>
              {results && b.id === me && (
                <text
                  transform={portrait ? `rotate(90 0 ${scoreY})` : undefined}
                  x={0}
                  y={scoreY}
                  textAnchor="middle"
                  fill={colors[i]}
                  fontSize="34"
                  fontWeight="bold"
                >
                  +{b.scores[game.hole - 1]}
                </text>
              )}
            </g>
          );
        })}
    </g>
  );
}
