import { startRequirement } from "./gameCatalog";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { AppPanel, GameHelp, GameSurface } from "./AppLayout";
import { GolfGuide } from "./GolfGuide";
import { golfGuideLength, golfScreenAngle } from "../games/golf-presentation";
import { GolfMotion } from "./GolfMotion";
import { GolfResults } from "./GolfResults";
import { GolfBallArtwork, GolfCourseArtwork } from "./GolfCourseArtwork";
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
  const board = useRef<HTMLDivElement>(null);
  const courseLayer = useRef<SVGGElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [courseScale, setCourseScale] = useState(1);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const wideScale = Math.min(width / 1000, height / 700);
      const tallScale = Math.min(width / 700, height / 1000);
      // Rotate only for a meaningful scale gain and a readable narrow dimension.
      const tall = tallScale * 700 >= 216 && tallScale > wideScale * 1.08;
      setPortrait(tall);
      setCourseScale(tall ? tallScale : wideScale);
    });
    observer.observe(board.current!);
    return () => observer.disconnect();
  }, []);
  const screenAngle = golfScreenAngle(aim.angle, portrait);
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
  const [dragging, setDragging] = useState(false);
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
      setDragging(false);
    }
  };
  useEffect(() => {
    setAim({ angle: initialAngle(), power: 0.6, drafted: false });
    drag.current = null;
    setDragging(false);
  }, [game.hole]);
  useEffect(() => {
    cancelDrag();
  }, [active, portrait]);
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
  const gameStatus = !connected
    ? "Host disconnected"
    : ready
      ? startRequirement("minigolf", players.length) ||
        "Five greens. One shot per hole. Aim together."
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
                      ? "Shot confirmed · waiting for players."
                      : aim.power === 0
                        ? "Set power above 0% to Ready."
                        : "Preview your shot, then tap Ready.";
  const rematchRequirement =
    game.phase === "finished" && connected
      ? startRequirement("minigolf", players.length)
      : "";
  const status = rematchRequirement
    ? `${gameStatus} · ${rematchRequirement}`
    : gameStatus;
  const point = (event: PointerEvent<SVGSVGElement>) =>
    new DOMPoint(event.clientX, event.clientY).matrixTransform(
      courseLayer.current!.getScreenCTM()!.inverse(),
    );
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
      // The same 120px gesture reaches full power on every screen size.
      power:
        Math.round(
          Math.min(
            1,
            (length * event.currentTarget.getBoundingClientRect().width) /
              (portrait ? 700 : 1000) /
              120,
          ) * 100,
        ) / 100,
      drafted: true,
    });
  };
  const arrowLength = golfGuideLength(courseScale);
  const powerPercent = Math.round(aim.power * 100);
  const powerName =
    aim.power === 0
      ? "No power"
      : aim.power <= 1 / 3
        ? "Gentle"
        : aim.power <= 2 / 3
          ? "Medium"
          : "Strong";
  const powerColor =
    aim.power <= 1 / 3 ? "#c7efb0" : aim.power <= 2 / 3 ? "#e9edaa" : "#ffd0a3";
  const aimFields = (
    <>
      {" "}
      <label>
        Angle <span>{Math.round(screenAngle)}°</span>
        <input
          type="range"
          aria-label="Shot angle"
          aria-valuetext={`${screenAngle} degrees · 0 right, 90 down`}
          min="0"
          max="359"
          step="1"
          value={screenAngle}
          disabled={!active}
          onChange={(e) =>
            setAim({
              ...aim,
              angle: (Number(e.target.value) + (portrait ? 90 : 0)) % 360,
              drafted: true,
            })
          }
        />
      </label>
      <label className="golf-power">
        Power <span>{powerPercent}%</span>
        <input
          className="golf-power-input"
          style={
            {
              "--golf-power": `${powerPercent}%`,
              "--golf-power-color": powerColor,
            } as CSSProperties
          }
          type="range"
          aria-label="Shot power"
          aria-valuetext={`${powerPercent}% · ${powerName}`}
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
        <small className="golf-power-marks" aria-hidden="true">
          <span>Gentle</span>
          <span>Medium</span>
          <span>Strong</span>
        </small>
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
                {game.balls.findIndex((ball) => ball.id === b.id) + 1}.{" "}
                {name(b.id)}
                {b.id === session.me.id ? " · You" : ""}
              </b>
              <small>
                Holes: {b.scores.join(" + ")}
                {game.phase === "aiming"
                  ? b.locked
                    ? " · Ready"
                    : " · Choosing"
                  : ""}
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
          {finished
            ? "Final standings"
            : ready
              ? "Open green"
              : `Hole ${game.hole}/5 · ${course.name}`}
        </strong>
        <span>
          {ready || finished
            ? ""
            : game.phase === "paused"
              ? "Paused"
              : game.phase === "aiming"
                ? "Choose"
                : game.phase === "rolling"
                  ? "Rolling"
                  : `${Math.ceil(game.remaining / 1000)}s`}
        </span>
      </div>
      {finished && (
        <GolfResults
          balls={game.balls}
          players={players}
          me={session.me.id}
          status={status}
        />
      )}
      <div className="golf-workspace" hidden={finished}>
        <div className="golf-board" ref={board}>
          <GameSurface ratio={portrait ? 700 / 1000 : 1000 / 700}>
            <svg
              className="golf-course"
              viewBox={portrait ? "0 0 700 1000" : "0 0 1000 700"}
              role="img"
              aria-label={`${course.name} course. ${revealed ? game.balls.map((b, i) => `Ball ${i + 1}: ${name(b.id)}${b.id === session.me.id ? ", you" : ""}${b.captured ? ", in the cup" : ""}`).join(". ") : "Drag from the tee toward your shot, or use the Angle and Power controls."}`}
              data-aiming={active}
              data-layout={portrait ? "portrait" : "landscape"}
              onPointerDown={(event) => {
                if (!active || event.button !== 0) return;
                const p = point(event),
                  bounds = event.currentTarget.getBoundingClientRect();
                if (
                  Math.hypot(p.x - course.tee[0], p.y - course.tee[1]) *
                    (bounds.width / (portrait ? 700 : 1000)) >
                  40
                )
                  return;
                drag.current = { pointer: event.pointerId, previous: aim };
                setDragging(true);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={move}
              onPointerUp={(event) => {
                if (drag.current?.pointer !== event.pointerId) return;
                move(event);
                drag.current = null;
                setDragging(false);
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={cancelDrag}
              onLostPointerCapture={cancelDrag}
            >
              <g
                ref={courseLayer}
                transform={
                  portrait ? "translate(0 1000) rotate(-90)" : undefined
                }
              >
                <GolfCourseArtwork
                  hole={game.hole}
                  impacted={game.impacted}
                  portrait={portrait}
                />
                {!revealed && (
                  <>
                    <GolfBallArtwork
                      x={course.tee[0]}
                      y={course.tee[1]}
                      radius={26}
                      color={colors[Math.max(0, myIndex)]}
                    />
                    {me && (
                      <circle
                        className="golf-ball-outline"
                        cx={course.tee[0]}
                        cy={course.tee[1]}
                        r="33"
                        fill="none"
                        stroke="#fbffd9"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    )}
                    <text
                      transform={
                        portrait
                          ? `rotate(90 ${course.tee[0]} ${course.tee[1]})`
                          : undefined
                      }
                      x={course.tee[0]}
                      y={course.tee[1] + 7}
                      fill="#092922"
                      fontSize="21"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {myIndex < 0 ? "T" : myIndex + 1}
                    </text>
                    {me && (
                      <g
                        className="golf-aim-guide"
                        opacity={aim.drafted ? 1 : 0.75}
                      >
                        <g
                          transform={`translate(${course.tee[0]} ${course.tee[1]})`}
                        >
                          <GolfGuide
                            angle={aim.angle}
                            power={aim.power}
                            length={arrowLength}
                            color={powerColor}
                          />
                        </g>
                      </g>
                    )}
                  </>
                )}
                <GolfMotion
                  game={game}
                  me={session.me.id}
                  colors={colors}
                  portrait={portrait}
                  revealed={revealed}
                  results={results}
                  connected={connected}
                  scale={courseScale}
                />
              </g>
            </svg>
          </GameSurface>
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
          <p
            id="minigolf-start-guidance"
            className={finished ? "golf-workspace-status" : "golf-status"}
            aria-live={finished ? "off" : "polite"}
          >
            {status}
          </p>
          <p className="golf-weather">
            <svg
              className="golf-wind-pointer"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".3"
              />
              <path
                transform={`rotate(${golfScreenAngle(game.wind * 90, portrait)} 16 16)`}
                d="M6 16h19m-8-7 8 7-8 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Wind {windNames[(game.wind + (portrait ? 3 : 0)) % 4]} ·{" "}
            {game.conditions
              ? ["Still air", "Light gust", "Strong gust"][
                  game.conditions.strength / 12
                ]
              : "Gust revealed at launch"}
            {course.meteor && (
              <small>Meteor {game.impacted ? "landed" : "incoming"}</small>
            )}
          </p>
          {results || (effective === "rolling" && me?.captured) ? (
            <div className="golf-hole-reward" aria-live="polite">
              <span>
                {me
                  ? me.skipped
                    ? "No shot"
                    : me.captured
                      ? "In the cup!"
                      : "Near the cup"
                  : "Hole complete"}
              </span>
              {me && (
                <strong>
                  +{me.captured ? 100 : me.scores[game.hole - 1]}
                  <small>points</small>
                </strong>
              )}
              <small>
                {game.phase === "rolling"
                  ? "Watching the remaining shots"
                  : "Next green coming up"}
              </small>
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
                disabled={!active || aim.power <= 0 || dragging}
                onClick={() => {
                  if (drag.current || !active || aim.power <= 0) return;
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
                aria-describedby="minigolf-start-guidance"
                disabled={!connected || players.length < 2}
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
        <GameHelp>
          <p>
            Drag from your ball toward the travel direction. Longer drags mean
            more power, with the same drag distance on every screen. Release to
            preview; tap Ready to lock, or confirm the suggested shot. Or use
            Angle and Power (arrow keys work). Angles and wind follow your
            screen: 0° goes right; 90° goes down. The course turns upright when
            that makes it larger, with the same positions and shot on every
            device. Shots stay secret until everyone launches together.
          </p>
          <p>
            Example: on the open green, aim toward the cup with about 60% power.
            Wind may carry your ball a little farther. Each hole gives one shot.
            Take your time; everyone launches when all shots are Ready.
          </p>
          <p>
            A slow ball within 24 units of the cup earns 100. Otherwise earn
            max(0, 70 − floor(distance / 8)). Five holes add up; equal totals
            share the win. Balls pass through each other. Mushrooms bounce and
            boost; walls and edges bounce.
          </p>
          <p>
            The arrow shows direction; its fill shows power, not distance or a
            predicted path. The meter marks gentle, medium and strong power;
            zero does not launch and cannot be confirmed. Lower power gives
            finer control, while strong shots retain travel after a bank.
            Everyone sees the wind direction; the host draws a shared strength
            of 0, 12 or 24. Meteor warnings have radius 90 and impact between 4
            and 5.5 seconds, pushing uncaptured balls outward. Actual conditions
            appear at launch.
          </p>
          <p>
            Each hole has 4 seconds to preview and 3 for scores. Aiming has no
            deadline; shots finish when all balls settle or reach the cup. Pause
            saves shots and conditions; Resume gives a short countdown. Late
            arrivals watch until a rematch. A participant leaving resets the
            match.
          </p>
          <p>
            Short pulses mark launches, rebounds, mushroom boosts and meteor
            impacts. Optional sound adds a putter tap, knock, spring and thump.
            Sound starts muted. Reduced motion keeps exact ball positions and
            static highlights.
          </p>
          <p>
            A captured ball drops into the cup with a small sparkle and optional
            chime. Hole points are shown beside the course; final rankings show
            every golfer’s total and five-hole scores. Ties share the win.
            Results stay until the host starts another match. Reduced motion
            uses a static cup highlight.
          </p>
          <p>Update the app on every device before playing Meteor Minigolf.</p>
        </GameHelp>
      </div>
      <AppPanel
        title="Adjust shot"
        open={aimOpen}
        onClose={() => setAimOpen(false)}
      >
        <svg
          className="golf-aim-preview"
          viewBox="0 0 240 180"
          role="img"
          aria-label={`Shot preview: ${screenAngle} degrees, ${powerPercent}% power`}
        >
          <g transform="translate(120 90)">
            <circle
              r="64"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".15"
              strokeDasharray="3 8"
            />
            <circle
              r="13"
              fill={colors[Math.max(0, myIndex)]}
              stroke="#173d33"
              strokeWidth="3"
            />
            <g transform="scale(.48)">
              <GolfGuide
                angle={screenAngle}
                power={aim.power}
                color={powerColor}
              />
            </g>
          </g>
        </svg>
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
