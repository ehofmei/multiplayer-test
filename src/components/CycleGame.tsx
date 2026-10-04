import {
  adjacentCyclePoints,
  cycleDrawPoint,
  type CyclePoint,
} from "../games/cycle-motion";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  CYCLE_SIZE,
  CYCLE_LIMIT,
  CYCLE_STEP_MS,
  cycleColors,
  cycleDirections,
  type CycleDirection,
  type CycleState,
} from "../games/cycle";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";

const arrows = ["↑", "→", "↓", "←"];
export function CycleGame({
  game,
  players,
  session,
  connected,
}: {
  game: CycleState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const court = useRef<HTMLDivElement>(null);
  const heads = useRef<(SVGGElement | null)[]>([]);
  const extensions = useRef<(SVGLineElement | null)[]>([]);
  const drawn = useRef<Record<string, CyclePoint>>({});
  const previous = useRef<CycleState | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = game;
    const animate =
      connected &&
      game.phase === "playing" &&
      before?.phase === "playing" &&
      game.ticks === before.ticks + 1 &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paths = game.riders.map((r) => {
      const old = before?.riders.find((p) => p.id === r.id);
      const moving =
        animate && r.alive && old?.alive && adjacentCyclePoints(old, r);
      return {
        target: { x: r.x, y: r.y },
        corner: moving ? { x: old.x, y: old.y } : r,
        from: moving ? (drawn.current[r.id] ?? old) : r,
        moving,
      };
    });
    const start = performance.now();
    let frame = 0;
    const draw = () => {
      const fraction = Math.min(1, (performance.now() - start) / CYCLE_STEP_MS);
      paths.forEach((path, i) => {
        const point = path.moving
          ? cycleDrawPoint(path.from, path.corner, path.target, fraction)
          : path.target;
        drawn.current[game.riders[i].id] = point;
        heads.current[i]?.setAttribute(
          "transform",
          `translate(${point.x * 10 + 5} ${point.y * 10 + 5})`,
        );
        const line = extensions.current[i];
        line?.setAttribute("x1", String(path.corner.x * 10 + 5));
        line?.setAttribute("y1", String(path.corner.y * 10 + 5));
        line?.setAttribute("x2", String(point.x * 10 + 5));
        line?.setAttribute("y2", String(point.y * 10 + 5));
      });
      if (fraction < 1 && paths.some((path) => path.moving))
        frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
    // Queued-input updates within the same tick must not restart the animation.
  }, [game.ticks, game.phase, connected]);
  useEffect(() => {
    if (game.phase === "countdown") {
      court.current?.focus({ preventScroll: true });
      court.current?.scrollIntoView({ block: "center" });
    }
  }, [game.phase]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const touch = useRef(false);
  const seat = game.riders.findIndex((r) => r.id === session.me.id);
  const me = game.riders[seat];
  const active = connected && game.phase === "playing" && !!me?.alive;
  const configure = game.phase === "ready" || game.phase === "finished";
  const survivors = game.riders.filter((r) => r.alive);
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Player";
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "Ready to ride?"
      : game.phase === "paused"
        ? "Arena paused"
        : game.phase === "countdown"
          ? `Get ready… ${Math.ceil((game.countdown * CYCLE_STEP_MS) / 1000)}`
          : game.phase === "finished"
            ? survivors.length === 0
              ? "Draw! Everyone crashed."
              : survivors.length === 1
                ? `${name(survivors[0].id)} wins!`
                : "Time’s up! Survivors share the win."
            : `${survivors.length} riders remain`;
  const movingHeads = new Set(
    game.phase === "playing"
      ? game.riders.filter((r) => r.alive).map((r) => r.y * CYCLE_SIZE + r.x)
      : [],
  );
  const steer = (direction: CycleDirection) => {
    if (active) session.turnCycle(direction);
  };
  return (
    <section
      className="games-card cycle-game-card"
      aria-label="Light-cycle Arena game"
      onKeyDown={(e) => {
        const keys: Record<string, CycleDirection> = {
          ArrowUp: "up",
          ArrowRight: "right",
          ArrowDown: "down",
          ArrowLeft: "left",
          w: "up",
          d: "right",
          s: "down",
          a: "left",
        };
        const direction = keys[e.key];
        if (direction && active) {
          e.preventDefault();
          if (!e.repeat) steer(direction);
        }
      }}
    >
      <div className="board-heading">
        <h2>Light-cycle Arena</h2>
        <span>
          {Math.ceil(((CYCLE_LIMIT - game.ticks) * CYCLE_STEP_MS) / 1000)}s
        </span>
      </div>
      <p className="cycle-status" aria-live="polite">
        {status}
      </p>
      <div
        ref={court}
        className="cycle-court"
        role="group"
        aria-label="Light-cycle arena. Use arrow keys or swipe to steer."
        tabIndex={0}
        data-active={active}
        data-tick={game.ticks}
        onPointerDown={(e) => {
          if (!active) return;
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (
            !active ||
            !swipe.current ||
            !e.currentTarget.hasPointerCapture(e.pointerId)
          )
            return;
          const dx = e.clientX - swipe.current.x,
            dy = e.clientY - swipe.current.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
          steer(
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up",
          );
          swipe.current = null;
        }}
        onPointerUp={() => {
          swipe.current = null;
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <svg
          viewBox={`0 0 ${CYCLE_SIZE * 10} ${CYCLE_SIZE * 10}`}
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="cycle-grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M10 0H0V10"
                fill="none"
                stroke="#ffffff"
                strokeOpacity=".07"
                strokeWidth=".5"
              />
            </pattern>
          </defs>
          <rect width="320" height="320" fill="url(#cycle-grid)" />
          {cycleColors.map((color, i) => (
            <path
              key={color}
              fill={color}
              fillOpacity=".72"
              d={[...game.cells]
                .flatMap((cell, n) =>
                  Number(cell) === i + 1 && !movingHeads.has(n)
                    ? [
                        `M${(n % CYCLE_SIZE) * 10} ${Math.floor(n / CYCLE_SIZE) * 10}h10v10h-10z`,
                      ]
                    : [],
                )
                .join(" ")}
            />
          ))}
          {game.riders.map((r, i) => (
            <line
              className="cycle-extension"
              data-testid={`cycle-extension-${i}`}
              key={`extension-${r.id}`}
              ref={(element) => {
                extensions.current[i] = element;
              }}
              stroke={cycleColors[i]}
              strokeOpacity=".72"
              strokeWidth="10"
              strokeLinecap="butt"
            />
          ))}
          {game.riders.map((r, i) => (
            <g
              key={r.id}
              ref={(element) => {
                heads.current[i] = element;
              }}
              data-testid={`cycle-rider-${i}`}
              data-direction={r.direction}
              data-alive={r.alive}
              data-x={r.x}
              data-y={r.y}
            >
              <rect
                x={-6}
                y={-6}
                width="12"
                height="12"
                rx="3"
                fill={r.alive ? cycleColors[i] : "#122c29"}
                stroke={r.alive ? "#fff" : cycleColors[i]}
                strokeWidth="1"
              />
              <text
                x={0}
                y={0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9"
                fontWeight="800"
                fill={r.alive ? "#122c29" : cycleColors[i]}
              >
                {r.alive ? i + 1 : "×"}
              </text>
            </g>
          ))}
          {game.phase === "ready" && (
            <text
              x="160"
              y="160"
              textAnchor="middle"
              fill="#c9ee87"
              fontSize="13"
            >
              MAKE YOUR OWN ESCAPE ROUTE
            </text>
          )}
        </svg>
      </div>
      <div
        className="cycle-controls"
        role="group"
        aria-label="Steering controls"
      >
        {cycleDirections.map((direction, i) => (
          <button
            key={direction}
            className={`cycle-${direction}`}
            aria-label={`Steer ${direction}`}
            disabled={!active}
            onPointerDown={(e) => {
              touch.current = e.pointerType === "touch";
              if (touch.current && e.isPrimary && active) {
                e.preventDefault();
                steer(direction);
              }
            }}
            onClick={(e) => {
              if (e.detail === 0 || !touch.current) steer(direction);
            }}
          >
            {arrows[i]}
          </button>
        ))}
        <span className="cycle-control-center" aria-hidden="true">
          TURN
        </span>
      </div>
      <p className="cycle-feedback">
        {me
          ? !me.alive
            ? "You crashed. Watch the remaining riders."
            : `You are rider ${seat + 1} · ${name(me.id)}`
          : game.phase === "ready"
            ? "2–8 players · Everyone here rides."
            : "You’re watching. Join the next round."}
      </p>
      {!!game.riders.length && (
        <ol className="cycle-riders" aria-label="Riders">
          {game.riders.map((r, i) => (
            <li key={r.id} className={r.alive ? "" : "crashed"}>
              <span
                className="cycle-number"
                style={{ background: cycleColors[i] }}
              >
                {i + 1}
              </span>
              <span className="cycle-name">
                {name(r.id)}
                {r.id === session.me.id ? " · You" : ""}
              </span>
              <small>{r.alive ? "Riding" : "Out"}</small>
            </li>
          ))}
        </ol>
      )}
      <p className="muted cycle-help">
        Keep moving. Avoid walls and every trail, including yours. Tap arrows,
        swipe the arena, or focus it and use arrow keys / WASD. One turn per
        step; no reversing. Last survivor wins.
      </p>
      {session.role === "host" ? (
        configure ? (
          <>
            <button
              disabled={players.length < 2}
              onClick={() => session.startCycle()}
            >
              {game.phase === "finished" ? "Ride Again" : "Start Arena"}
            </button>
            {players.length < 2 && (
              <p className="muted">Add another player to start.</p>
            )}
          </>
        ) : (
          <button
            className="secondary"
            onClick={() =>
              game.phase === "paused"
                ? session.resumeCycle()
                : session.pauseGames()
            }
          >
            {game.phase === "paused" ? "Resume Arena" : "Pause Arena"}
          </button>
        )
      ) : (
        configure && <p className="muted">Waiting for the host to start.</p>
      )}
    </section>
  );
}
