import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AppPanel, GameHelp, GameSurface } from "./AppLayout";
import { courses, golfTotal, type GolfState } from "../games/minigolf";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
const colors = [
  "#e9f99b",
  "#7dd3fc",
  "#fda4af",
  "#fde047",
  "#c4b5fd",
  "#ffffff",
  "#fb923c",
  "#6ee7b7",
];
const windNames = ["→ East", "↓ South", "← West", "↑ North"];
export function MinigolfGame({
  game,
  players,
  session,
  connected,
}: {
  game: GolfState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const course = courses[Math.max(0, game.hole - 1)];
  const initialAngle = () =>
    Math.round(
      ((Math.atan2(
        course.cup[1] - course.tee[1],
        course.cup[0] - course.tee[0],
      ) *
        180) /
        Math.PI +
        360) %
        360,
    ) % 360;
  const [aim, setAim] = useState({
    angle: initialAngle(),
    power: 0.6,
    drafted: false,
  });
  const [scoresOpen, setScoresOpen] = useState(false);
  const [aimOpen, setAimOpen] = useState(false);
  const [compactAim, setCompactAim] = useState(
    () => matchMedia("(max-width: 650px) and (max-height: 650px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 650px) and (max-height: 650px)");
    const change = () => setCompactAim(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const drag = useRef<{ pointer: number; previous: typeof aim } | null>(null);
  const me = game.balls.find((b) => b.id === session.me.id);
  const myIndex = game.balls.findIndex((b) => b.id === session.me.id);
  const active = connected && game.phase === "aiming" && !!me && !me.locked;
  const ready = game.phase === "ready",
    finished = game.phase === "finished";
  const effective =
    game.phase === "paused" || game.phase === "reorient"
      ? game.resumePhase
      : game.phase;
  const revealed = ["rolling", "results", "finished"].includes(effective ?? "");
  const results = effective === "results" || finished;
  const cancelDrag = () => {
    if (drag.current) {
      setAim(drag.current.previous);
      drag.current = null;
    }
  };
  useEffect(() => {
    setAim({ angle: initialAngle(), power: 0.6, drafted: false });
    drag.current = null;
  }, [game.hole]);
  useEffect(() => {
    if (!active) cancelDrag();
  }, [active]);
  useEffect(() => {
    const clear = () => cancelDrag();
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Golfer";
  const highest = Math.max(0, ...game.balls.map(golfTotal));
  const winners = game.balls.filter((b) => golfTotal(b) === highest);
  const status = !connected
    ? "Host disconnected"
    : ready
      ? "Five greens. One shot per hole. Aim together."
      : game.phase === "paused"
        ? "Paused · shots and conditions are saved."
        : game.phase === "countdown" || game.phase === "reorient"
          ? `Get ready · ${Math.ceil(game.remaining / 1000)}`
          : finished
            ? winners.length > 1
              ? `${winners.length} golfers share the win!`
              : `${name(winners[0].id)} wins!`
            : !me
              ? "You’re watching. Join the next match."
              : results
                ? me.skipped
                  ? "No shot · 0 points. Next hole is a fresh chance."
                  : me.captured
                    ? "In the cup! +100 points."
                    : `Near the cup · +${me.scores[game.hole - 1]} points.`
                : game.phase === "preview"
                  ? "Study the green. Your shot starts soon."
                  : game.phase === "rolling"
                    ? "Shots away! Watch the shared gust."
                    : me.locked
                      ? "Shot confirmed · waiting for launch."
                      : "Drag from your ball, or adjust below. Then Ready.";
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) * 1000) / bounds.width,
      y: ((event.clientY - bounds.top) * 700) / bounds.height,
    };
  };
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!active || drag.current?.pointer !== event.pointerId) return;
    const p = point(event),
      dx = p.x - course.tee[0],
      dy = p.y - course.tee[1];
    const length = Math.hypot(dx, dy);
    setAim({
      angle:
        length > 1
          ? Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360) % 360
          : aim.angle,
      power: Math.round(Math.min(1, length / 300) * 100) / 100,
      drafted: true,
    });
  };
  const arrowLength = 50 + aim.power * 250;
  const radians = (aim.angle * Math.PI) / 180;
  const aimFields = (
    <>
      {" "}
      <label>
        Angle <span>{Math.round(aim.angle)}°</span>
        <input
          type="range"
          aria-label="Shot angle"
          min="0"
          max="359"
          step="1"
          value={aim.angle}
          disabled={!active}
          onChange={(e) =>
            setAim({
              ...aim,
              angle: Number(e.target.value),
              drafted: true,
            })
          }
        />
      </label>
      <label>
        Power <span>{Math.round(aim.power * 100)}%</span>
        <input
          type="range"
          aria-label="Shot power"
          min="0"
          max="100"
          step="1"
          value={aim.power * 100}
          disabled={!active}
          onChange={(e) =>
            setAim({
              ...aim,
              power: Number(e.target.value) / 100,
              drafted: true,
            })
          }
        />
      </label>
    </>
  );
  const standings = (
    <ol className="golf-scores">
      {[...game.balls]
        .sort((a, b) => golfTotal(b) - golfTotal(a))
        .map((b) => (
          <li key={b.id}>
            <span>
              <b>
                {name(b.id)}
                {b.id === session.me.id ? " · You" : ""}
              </b>
              <small>
                Holes: {b.scores.join(" + ")}
                {b.skipped
                  ? " · Missed shot"
                  : b.captured
                    ? " · In the cup"
                    : ""}
              </small>
            </span>
            <strong>{golfTotal(b)}</strong>
          </li>
        ))}
    </ol>
  );
  return (
    <section
      className="games-card golf-game-card"
      aria-label="Meteor Minigolf"
      data-phase={game.phase}
    >
      <div className="golf-heading">
        <strong>
          {ready ? "Open green" : `Hole ${game.hole}/5 · ${course.name}`}
        </strong>
        <span>
          {ready || finished
            ? ""
            : game.phase === "paused"
              ? "Paused"
              : `${Math.ceil(game.remaining / 1000)}s`}
        </span>
      </div>
      <div className="golf-workspace">
        <div className="golf-board">
          <GameSurface ratio={1000 / 700}>
            <svg
              className="golf-course"
              viewBox="0 0 1000 700"
              role="img"
              aria-label={`${course.name} course. Drag from the tee toward your shot. Angle and power controls are below.`}
              data-aiming={active}
              onPointerDown={(event) => {
                if (!active || event.button !== 0) return;
                const p = point(event),
                  bounds = event.currentTarget.getBoundingClientRect();
                if (
                  Math.hypot(
                    ((p.x - course.tee[0]) * bounds.width) / 1000,
                    ((p.y - course.tee[1]) * bounds.height) / 700,
                  ) > 32
                )
                  return;
                drag.current = { pointer: event.pointerId, previous: aim };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={move}
              onPointerUp={(event) => {
                if (drag.current?.pointer !== event.pointerId) return;
                move(event);
                drag.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
            >
              <defs>
                <pattern
                  id="golf-stars"
                  width="120"
                  height="100"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="30" cy="40" r="2" fill="#8dd0bc" opacity=".22" />
                  <path d="M85 72h10m-5-5v10" stroke="#8dd0bc" opacity=".15" />
                </pattern>
                <marker
                  id="golf-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M0 0L10 5L0 10Z" fill="#ffffff" />
                </marker>
              </defs>
              <rect
                x="5"
                y="5"
                width="990"
                height="690"
                rx="28"
                fill="#164b43"
                stroke="#b7d8a0"
                strokeWidth="10"
              />
              <rect
                x="12"
                y="12"
                width="976"
                height="676"
                rx="20"
                fill="url(#golf-stars)"
              />
              {[160, 80, 24].map((r) => (
                <circle
                  key={r}
                  cx={course.cup[0]}
                  cy={course.cup[1]}
                  r={r}
                  fill={r === 24 ? "#092922" : "none"}
                  stroke="#a9d6ad"
                  strokeWidth="2"
                  strokeDasharray={r === 24 ? undefined : "8 12"}
                />
              ))}
              <path
                d={`M${course.cup[0]} ${course.cup[1]}v-90l55 20-55 20`}
                fill="#f2ca79"
                stroke="#f2ca79"
                strokeWidth="4"
              />
              <text
                x={course.cup[0] + 30}
                y={course.cup[1] + 50}
                fill="#e9f4d6"
                fontSize="23"
              >
                100
              </text>
              {course.walls.map(([x, y, w, h], i) => (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx="4"
                  fill="#789795"
                  stroke="#cee1dc"
                  strokeWidth="4"
                />
              ))}
              {course.mushrooms.map(([x, y], i) => (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r="30"
                    fill="#df959f"
                    stroke="#ffe6e9"
                    strokeWidth="4"
                  />
                  <circle cx={x - 10} cy={y - 8} r="6" fill="#ffe6e9" />
                  <circle cx={x + 12} cy={y + 10} r="7" fill="#ffe6e9" />
                </g>
              ))}
              {course.meteor && (
                <g>
                  <circle
                    cx={course.meteor[0]}
                    cy={course.meteor[1]}
                    r="90"
                    fill={game.impacted ? "#efa56133" : "#efa56111"}
                    stroke="#f2ad76"
                    strokeDasharray="10 10"
                    strokeWidth="3"
                  />
                  <text
                    x={course.meteor[0]}
                    y={course.meteor[1] + 8}
                    textAnchor="middle"
                    fontSize="27"
                    fill="#ffd4a6"
                  >
                    {game.impacted ? "Impact" : "☄"}
                  </text>
                </g>
              )}
              {!revealed && (
                <>
                  <circle
                    cx={course.tee[0]}
                    cy={course.tee[1]}
                    r="26"
                    fill={colors[Math.max(0, myIndex)]}
                    stroke="#092922"
                    strokeWidth="4"
                  />
                  <text
                    x={course.tee[0]}
                    y={course.tee[1] + 7}
                    fill="#092922"
                    fontSize="21"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {myIndex < 0 ? "T" : myIndex + 1}
                  </text>
                  {aim.drafted && me && (
                    <line
                      x1={course.tee[0]}
                      y1={course.tee[1]}
                      x2={course.tee[0] + Math.cos(radians) * arrowLength}
                      y2={course.tee[1] + Math.sin(radians) * arrowLength}
                      stroke="#fff"
                      strokeWidth="5"
                      markerEnd="url(#golf-arrow)"
                    />
                  )}
                </>
              )}
              {revealed &&
                game.balls.map((b, i) => {
                  const nearby = game.balls.filter(
                    (other) => Math.hypot(other.x - b.x, other.y - b.y) < 40,
                  );
                  const slot = nearby.findIndex((other) => other.id === b.id);
                  const labelX =
                    nearby.length > 1
                      ? Math.min(
                          960 - (nearby.length - 1) * 48,
                          Math.max(40, b.x - (nearby.length - 1) * 24),
                        ) +
                        slot * 48
                      : Math.max(24, Math.min(976, b.x));
                  return (
                    <g key={b.id} opacity={b.skipped ? 0.4 : 1}>
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={b.id === session.me.id ? 15 : 10}
                        fill={colors[i]}
                        stroke="#092922"
                        strokeWidth="3"
                      />
                      <text
                        x={labelX}
                        y={Math.max(32, b.y - 28)}
                        textAnchor="middle"
                        fill={colors[i]}
                        fontSize="32"
                        fontWeight="bold"
                      >
                        {i + 1}
                      </text>
                      {results && b.id === session.me.id && (
                        <text
                          x={b.x}
                          y={b.y > 620 ? b.y - 70 : b.y + 60}
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
            </svg>
          </GameSurface>
          <p className="golf-legend">
            ◎ Cup · ▰ Wall · ● Mushroom + boost · ☄ Meteor
          </p>
        </div>
        <div className="golf-controls">
          <div className="golf-stats">
            <span>
              Your total <strong>{me ? golfTotal(me) : "—"}</strong>
            </span>
            <span>
              {myIndex >= 0
                ? `Ball ${myIndex + 1}`
                : ready
                  ? "Join at Start"
                  : "Spectator"}
              <strong>
                {game.balls.length
                  ? `${game.balls.filter((b) => b.locked).length}/${game.balls.length} ready`
                  : "2–8 players"}
              </strong>
            </span>
          </div>
          <p className="golf-status" aria-live="polite">
            {status}
          </p>
          <p className="golf-weather">
            Wind {windNames[game.wind]} ·{" "}
            {game.conditions
              ? `${game.conditions.strength} units/s²`
              : "0, 12 or 24 units/s²"}
            {course.meteor ? (
              <small>
                Meteor{" "}
                {game.conditions?.impact != null
                  ? `at ${game.conditions.impact.toFixed(1)}s`
                  : "between 4–5.5s"}{" "}
                · radius 90
              </small>
            ) : null}
          </p>
          {finished ? (
            <div className="golf-final">
              <strong>Your holes</strong>
              <p>{me?.scores.join(" + ") ?? "Watched this match"}</p>
              <span>Open Standings for every golfer’s score.</span>
            </div>
          ) : (
            <div className="golf-aim">
              {compactAim ? (
                <button
                  className="secondary"
                  disabled={!active}
                  onClick={() => setAimOpen(true)}
                >
                  Adjust aim
                </button>
              ) : (
                aimFields
              )}
              <button
                className="golf-ready"
                disabled={!active || !aim.drafted}
                onClick={() => {
                  cancelDrag();
                  session.shootGolf(game.hole, aim.angle, aim.power);
                }}
              >
                {me?.locked ? "Shot locked" : "Ready"}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="golf-footer">
        {session.role === "host" && (
          <>
            {ready || finished ? (
              <button
                disabled={players.length < 2}
                onClick={() => session.startGolf()}
              >
                {finished ? "Play Again" : "Start Golf"}
              </button>
            ) : (
              <>
                <button
                  className="secondary"
                  onClick={() =>
                    game.phase === "paused"
                      ? session.resumeGolf()
                      : session.pauseGames()
                  }
                >
                  {game.phase === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  className="quiet"
                  onClick={() => session.selectGame("minigolf")}
                >
                  Stop
                </button>
              </>
            )}
          </>
        )}
        <button
          className="quiet"
          disabled={!game.balls.length}
          onClick={() => setScoresOpen(true)}
        >
          Standings
        </button>
        <GameHelp label="Help">
          <p>
            Drag from your ball toward the travel direction. Longer drags mean
            more power. Release to preview; tap Ready to lock. Or use Angle and
            Power (arrow keys work). 0° goes right; 90° goes down. Shots stay
            secret until everyone launches together.
          </p>
          <p>
            Example: on the open green, aim right with about 60% power. Wind may
            carry your ball a little farther. Each hole gives one shot; no Ready
            at the deadline means 0 points for that hole.
          </p>
          <p>
            A slow ball within 24 units of the cup earns 100. Otherwise earn
            max(0, 70 − floor(distance / 8)). Five holes add up; equal totals
            share the win. Balls pass through each other. Mushrooms bounce and
            boost; walls and edges bounce.
          </p>
          <p>
            The arrow shows direction, not a predicted path. Everyone sees the
            wind direction; the host draws a shared strength of 0, 12 or 24.
            Meteor warnings have radius 90 and impact between 4 and 5.5 seconds,
            pushing uncaptured balls outward. Actual conditions appear at
            launch.
          </p>
          <p>
            The starting pace is 4 seconds to preview, 20 to aim, 10 to roll and
            3 for scores. Holes advance automatically. Pause saves shots and
            conditions; Resume gives a short countdown. Late arrivals watch
            until a rematch. A participant leaving resets the match.
          </p>
          <p>Update the app on every device before playing Meteor Minigolf.</p>
        </GameHelp>
      </div>
      <AppPanel
        title="Adjust shot"
        open={aimOpen}
        onClose={() => setAimOpen(false)}
      >
        <p>Adjust angle and power, then close this panel and tap Ready.</p>
        <div className="golf-aim-dialog">{aimFields}</div>
      </AppPanel>
      <AppPanel
        title="Golf standings"
        open={scoresOpen}
        onClose={() => setScoresOpen(false)}
      >
        {standings}
      </AppPanel>
    </section>
  );
}
