import { useEffect, useRef, useState } from "react";
import { sumoEffects, type SumoEffect } from "../games/sumo-feedback";
import type { SumoState } from "../games/sumo";
import { cycleColors } from "../games/cycle";

export function SumoEffects({
  game,
  connected,
}: {
  game: SumoState;
  connected: boolean;
}) {
  const previous = useRef<SumoState | null>(null);
  const [effects, setEffects] = useState<(SumoEffect & { until: number })[]>(
    [],
  );
  useEffect(() => {
    const before = previous.current;
    previous.current = game;
    if (!connected || !["playing", "finished"].includes(game.phase)) {
      previous.current = null;
      setEffects([]);
      return;
    }
    const added = sumoEffects(before, game);
    if (added.length)
      setEffects((old) =>
        [
          ...old,
          ...added.map((e) => ({
            ...e,
            until: performance.now() + (e.kind === "out" ? 800 : 220),
          })),
        ].slice(-16),
      );
  }, [game, connected]);
  useEffect(() => {
    if (!effects.length) return;
    const timer = setTimeout(
      () => setEffects((old) => old.filter((e) => e.until > performance.now())),
      Math.max(1, Math.min(...effects.map((e) => e.until)) - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [effects]);
  return (
    <g className="sumo-effects" aria-hidden="true">
      {effects.map((e) => (
        <g
          key={e.key}
          className={`sumo-effect sumo-effect-${e.kind}`}
          data-seat={e.seat + 1}
          transform={`translate(${e.x * 1000} ${e.y * 1000})`}
        >
          <g
            className="sumo-effect-burst"
            stroke={e.kind === "out" ? cycleColors[e.seat] : "#fff1bc"}
            fill="none"
            strokeWidth={e.kind === "out" ? 9 : 6}
            strokeLinecap="round"
          >
            <circle r={e.kind === "out" ? 55 : 42} />
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                transform={`rotate(${i * 45})`}
                d={e.kind === "out" ? "M0 -66 V-98" : "M0 -49 V-64"}
              />
            ))}
          </g>
          {e.kind === "out" && (
            <text
              textAnchor="middle"
              x={Math.max(110, Math.min(890, e.x * 1000)) - e.x * 1000}
              y={Math.max(50, Math.min(950, e.y * 1000 - 108)) - e.y * 1000}
              fill="#fff1bc"
              stroke="#10192d"
              strokeWidth="5"
              paintOrder="stroke"
              fontSize="35"
              fontWeight="850"
            >
              {e.seat + 1} OUT!
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
