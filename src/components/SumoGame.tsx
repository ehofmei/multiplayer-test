import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  SUMO_BODY,
  SUMO_HZ,
  SUMO_LIMIT,
  sumoRadius,
  type SumoState,
} from "../games/sumo";
import { cycleColors } from "../games/cycle";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
const keyDirections: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};
export function SumoGame({
  game,
  players,
  session,
  connected,
}: {
  game: SumoState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const court = useRef<HTMLDivElement>(null);
  const bodies = useRef<(SVGGElement | null)[]>([]);
  const positions = useRef<Record<string, { x: number; y: number }>>({});
  const previous = useRef<SumoState | null>(null);
  const keys = useRef(new Set<string>());
  const stickPointer = useRef<number | null>(null);
  const dashTouch = useRef(false);
  const movement = useRef({ x: 0, y: 0 });
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const me = game.bumpers.find((b) => b.id === session.me.id);
  const seat = game.bumpers.indexOf(me!);
  const active = connected && game.phase === "playing" && !!me?.alive;
  const configure = game.phase === "ready" || game.phase === "finished";
  const send = (x: number, y: number) => {
    const length = Math.max(1, Math.hypot(x, y));
    movement.current = { x: x / length, y: y / length };
    setStick(movement.current);
    session.moveBumper(movement.current.x, movement.current.y);
  };
  const stop = () => {
    keys.current.clear();
    stickPointer.current = null;
    send(0, 0);
  };
  useEffect(() => {
    if (!active) {
      movement.current = { x: 0, y: 0 };
      keys.current.clear();
      stickPointer.current = null;
      setStick({ x: 0, y: 0 });
      return;
    }
    const timer = setInterval(() => {
      const { x, y } = movement.current;
      if (x || y) session.moveBumper(x, y);
    }, 100);
    const reset = () => stop();
    const hide = () => {
      if (document.hidden) reset();
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", hide);
      session.moveBumper(0, 0);
    };
  }, [active, session]);
  useEffect(() => {
    if (game.phase === "countdown") {
      court.current?.focus({ preventScroll: true });
      court.current?.scrollIntoView({ block: "center" });
    }
  }, [game.phase]);
  // Smooth confirmed snapshots without extrapolating a bumper across the edge.
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = game;
    const animate =
      connected &&
      game.phase === "playing" &&
      before?.phase === "playing" &&
      game.ticks > before.ticks &&
      game.ticks - before.ticks <= SUMO_HZ / 4 &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const starts = game.bumpers.map((b) => positions.current[b.id] ?? b);
    const started = performance.now();
    let frame = 0;
    const draw = () => {
      const fraction = animate
        ? Math.min(1, (performance.now() - started) / 50)
        : 1;
      game.bumpers.forEach((b, i) => {
        const f = b.alive ? fraction : 1;
        const x = starts[i].x + (b.x - starts[i].x) * f;
        const y = starts[i].y + (b.y - starts[i].y) * f;
        positions.current[b.id] = { x, y };
        bodies.current[i]?.setAttribute(
          "transform",
          `translate(${x * 1000} ${y * 1000})`,
        );
      });
      if (fraction < 1) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [game.ticks, game.phase, connected]);
  const alive = game.bumpers.filter((b) => b.alive);
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Player";
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "Ready to rumble?"
      : game.phase === "countdown"
        ? `Get ready… ${Math.ceil(game.countdown / SUMO_HZ)}`
        : game.phase === "paused"
          ? "Ring paused"
          : game.phase === "finished"
            ? alive.length === 0
              ? "Draw! Everyone is out."
              : alive.length === 1
                ? `${name(alive[0].id)} wins!`
                : "Time’s up! Survivors share the win."
            : `${alive.length} bumpers remain · Ring shrinking`;
  const keyboardMove = () => {
    let x = 0,
      y = 0;
    keys.current.forEach((key) => {
      const d = keyDirections[key];
      if (d) {
        x += d[0];
        y += d[1];
      }
    });
    send(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  };
  return (
    <section
      className="games-card sumo-game-card"
      aria-label="Sumo Bumpers game"
      onKeyDown={(e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (!active || (!keyDirections[key] && key !== " ")) return;
        // Leave ordinary buttons usable with Space/assistive activation.
        if (key === " " && e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        if (key === " ") {
          if (!e.repeat) session.dashBumper();
        } else {
          keys.current.add(key);
          keyboardMove();
        }
      }}
      onKeyUp={(e) => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (keyDirections[key]) {
          e.preventDefault();
          keys.current.delete(key);
          if (active) keyboardMove();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <div className="board-heading">
        <h2>Sumo Bumpers</h2>
        <span>{Math.ceil((SUMO_LIMIT - game.ticks) / SUMO_HZ)}s</span>
      </div>
      <p className="sumo-status" aria-live="polite">
        {status}
      </p>
      <div
        className="sumo-court"
        ref={court}
        tabIndex={0}
        role="group"
        aria-label="Sumo ring. Use arrow keys or WASD to move and Space to dash."
        data-tick={game.ticks}
      >
        <svg viewBox="0 0 1000 1000" aria-hidden="true">
          <circle cx="500" cy="500" r="460" fill="#26483f" />
          <circle
            cx="500"
            cy="500"
            r={sumoRadius(game.ticks) * 1000}
            fill="#122c29"
            stroke="#c9ee87"
            strokeWidth="8"
          />
          <circle
            cx="500"
            cy="500"
            r="70"
            fill="none"
            stroke="#527064"
            strokeWidth="3"
          />
          <path d="M480 500h40M500 480v40" stroke="#527064" strokeWidth="3" />
          {game.bumpers.map((b, i) => (
            <g
              key={b.id}
              ref={(element) => {
                bodies.current[i] = element;
              }}
              data-testid={`sumo-bumper-${i}`}
              data-dx={b.dx}
              data-dy={b.dy}
              data-x={b.x}
              data-y={b.y}
              data-alive={b.alive}
              data-cooldown={b.cooldown}
              opacity={b.alive ? 1 : 0.4}
            >
              <circle
                r={SUMO_BODY * 1000 + 5}
                fill={cycleColors[i]}
                stroke={i === seat ? "#fff" : "#527064"}
                strokeWidth={i === seat ? 9 : 4}
              />
              <circle
                r={SUMO_BODY * 1000 - 7}
                fill="none"
                stroke="#122c29"
                strokeWidth="4"
              />
              <text
                y="1"
                dominantBaseline="central"
                textAnchor="middle"
                fontSize="35"
                fontWeight="800"
                fill="#122c29"
              >
                {b.alive ? i + 1 : "×"}
              </text>
            </g>
          ))}
          {game.phase === "ready" && (
            <text
              x="500"
              y="620"
              fill="#c9ee87"
              textAnchor="middle"
              fontSize="35"
            >
              HOLD YOUR GROUND
            </text>
          )}
        </svg>
      </div>
      <div className="sumo-controls">
        <div
          className="sumo-stick"
          role="group"
          aria-label="Movement thumb pad"
          aria-disabled={!active}
          data-active={active}
          onPointerDown={(e) => {
            if (!active || stickPointer.current !== null) return;
            e.preventDefault();
            stickPointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            send(
              (e.clientX - r.left - r.width / 2) / (r.width / 2 - 24),
              (e.clientY - r.top - r.height / 2) / (r.height / 2 - 24),
            );
          }}
          onPointerMove={(e) => {
            if (!active || stickPointer.current !== e.pointerId) return;
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 24),
              y = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 24);
            const length = Math.max(1, Math.hypot(x, y));
            send(x / length, y / length);
          }}
          onPointerUp={(e) => {
            if (stickPointer.current === e.pointerId) stop();
          }}
          onPointerCancel={(e) => {
            if (stickPointer.current === e.pointerId) stop();
          }}
          onLostPointerCapture={(e) => {
            if (stickPointer.current === e.pointerId) stop();
          }}
        >
          <span className="sumo-stick-up" aria-hidden="true">
            ↑
          </span>
          <span className="sumo-stick-down" aria-hidden="true">
            ↓
          </span>
          <span className="sumo-stick-left" aria-hidden="true">
            ←
          </span>
          <span className="sumo-stick-right" aria-hidden="true">
            →
          </span>
          <span
            className="sumo-stick-knob"
            style={{
              transform: `translate(${stick.x * 44}px, ${stick.y * 44}px)`,
            }}
            aria-hidden="true"
          />
        </div>
        <div className="sumo-dash-control">
          <button
            aria-label="Dash"
            disabled={!active || !!me?.cooldown}
            onPointerDown={(e) => {
              dashTouch.current = e.pointerType === "touch";
              // The second thumb must work while the movement thumb is held.
              if (dashTouch.current && active && !me?.cooldown) {
                e.preventDefault();
                session.dashBumper();
              }
            }}
            onClick={(e) => {
              if (e.detail === 0 || !dashTouch.current) session.dashBumper();
            }}
          >
            Dash
          </button>
          <span>
            {me?.cooldown
              ? `${(me.cooldown / SUMO_HZ).toFixed(1)}s recharge`
              : "Move + dash"}
          </span>
        </div>
      </div>
      <p className="sumo-feedback">
        {me
          ? !me.alive
            ? "You’re out. Watch the remaining bumpers."
            : `You are bumper ${seat + 1} · ${name(me.id)}`
          : configure
            ? "2–8 players · Everyone here bumps."
            : "You’re watching. Join the next round."}
      </p>
      {!!game.bumpers.length && (
        <ol className="cycle-riders" aria-label="Bumpers">
          {game.bumpers.map((b, i) => (
            <li key={b.id} className={b.alive ? "" : "crashed"}>
              <span
                className="cycle-number"
                style={{ background: cycleColors[i] }}
              >
                {i + 1}
              </span>
              <span className="cycle-name">
                {name(b.id)}
                {b.id === session.me.id ? " · You" : ""}
              </span>
              <small>{b.alive ? "In" : "Out"}</small>
            </li>
          ))}
        </ol>
      )}
      <p className="muted sumo-help">
        Drag the thumb pad to move; release to brake. Move and tap Dash to bump
        harder (2s recharge). Keyboard: arrows / WASD + Space. Your center
        crossing the shrinking edge means you’re out. Last survivor wins.
      </p>
      {session.role === "host" ? (
        configure ? (
          <>
            <button
              disabled={players.length < 2}
              onClick={() => session.startSumo()}
            >
              {game.phase === "finished" ? "Bump Again" : "Start Bumpers"}
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
                ? session.resumeSumo()
                : session.pauseGames()
            }
          >
            {game.phase === "paused" ? "Resume Bumpers" : "Pause Bumpers"}
          </button>
        )
      ) : (
        configure && <p className="muted">Waiting for the host to start.</p>
      )}
    </section>
  );
}
