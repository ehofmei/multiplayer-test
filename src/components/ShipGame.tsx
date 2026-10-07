import { GameHelp } from "./AppLayout";
import { useState } from "react";
import {
  shipDuration,
  shipPanels,
  type ShipState,
  type ShipDifficulty,
} from "../games/ship";
import { ShipPanelPicture, ShipSettingPicture } from "./ShipArtwork";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
export function ShipGame({
  game,
  players,
  session,
  connected,
}: {
  game: ShipState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [minutes, setMinutes] = useState(shipDuration(game) / 60_000);
  const [difficulty, setDifficulty] = useState<ShipDifficulty>(game.difficulty);
  const host = session.role === "host";
  const configure = game.phase === "ready" || game.phase === "finished";
  const crew = game.crew.includes(session.me.id);
  const active = connected && crew && game.phase === "playing";
  const order = game.orders.find((o) => o.caller === session.me.id);
  const pending = active && order?.status === "pending";
  const panel = order ? shipPanels[order.control] : null;
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "Call it out. Listen. Tap the picture!"
      : game.phase === "paused"
        ? "Mission paused · take a breath."
        : game.phase === "finished"
          ? "Mission complete!"
          : !crew
            ? "You’re watching. Join the next mission."
            : order?.status === "done"
              ? `Order complete! +${order.award} points`
              : order?.status === "missed"
                ? "Order missed · new start!"
                : `${panel?.name}: ${panel?.settings[order?.value ?? 0]}!`;
  return (
    <section
      className="games-card ship-game-card"
      data-phase={game.phase}
      data-difficulty={game.difficulty}
      aria-label="Spaceship Panic game"
    >
      <div className="board-heading">
        <h2>Spaceship Panic</h2>
        <span>{game.crew.length || players.length} crew</span>
      </div>
      {!configure && (
        <div className="ship-stats" aria-label="Team status">
          <strong data-testid="ship-score">
            {game.score.toLocaleString()} points
          </strong>
          <strong data-testid="ship-clock">{clock(game.remaining)}</strong>
          <span data-testid="ship-streak">Streak {game.streak}</span>
        </div>
      )}
      <div className={`ship-order ${active ? (order?.status ?? "") : ""}`}>
        {active && (
          <span className="ship-order-heading">
            {game.crew.length === 1
              ? "SOLO · YOUR OWN PANEL"
              : "CALL THIS OUT TO YOUR CREW"}
          </span>
        )}
        <div className="ship-callout">
          {pending && order && (
            <div className="ship-command-pictures" aria-hidden="true">
              <ShipPanelPicture control={order.control} value={order.value} />
              <span>→</span>
              <ShipSettingPicture control={order.control} value={order.value} />
            </div>
          )}
          <p className="ship-command" aria-live="polite">
            {status}
          </p>
        </div>
        {pending && order && (
          <span className="ship-deadline" aria-label="Order time remaining">
            {Math.ceil(order.remaining / 1000)}s left
          </span>
        )}
      </div>
      {crew && !configure && (
        <div className="ship-panels" aria-label="Your ship controls">
          {game.controls.map((control, i) =>
            control.owner !== session.me.id ? null : (
              <fieldset
                key={i}
                className="ship-panel"
                disabled={!active}
                data-kind={shipPanels[i].kind}
                data-wrong={control.wrong}
              >
                <legend>
                  <ShipPanelPicture control={i} value={control.value} />
                  <span>{shipPanels[i].name}</span>
                </legend>
                <div className="ship-settings">
                  {shipPanels[i].settings.map((label, value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${shipPanels[i].name} ${label}`}
                      aria-pressed={control.value === value}
                      disabled={!active || control.value === value}
                      data-testid={`ship-control-${i}-${value}`}
                      onClick={() =>
                        session.setShipControl(i, value, control.revision)
                      }
                    >
                      <ShipSettingPicture control={i} value={value} />
                      <span>{label}</span>
                      <span className="ship-selected" aria-hidden="true">
                        {control.value === value ? "✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
                {control.wrong && (
                  <span className="ship-control-hint" role="status">
                    Try another setting
                  </span>
                )}
              </fieldset>
            ),
          )}
        </div>
      )}
      {game.phase === "finished" && (
        <div className="ship-results" aria-label="Mission results">
          <span>TEAM SCORE</span>
          <strong data-testid="ship-score">
            {game.score.toLocaleString()}
          </strong>
          <div>
            <p>
              <b data-testid="ship-completed">{game.completed}</b> commands
              completed
            </p>
            <p>
              <b data-testid="ship-best-streak">{game.bestStreak}</b> highest
              streak
            </p>
          </div>
          <small>
            {game.difficulty === "gentle" ? "Gentle" : "Standard"} ·{" "}
            {clock(game.duration)} mission
          </small>
        </div>
      )}
      <GameHelp>
        <p className="muted ship-help">
          Call out the panel name and setting. Match the pictures and tap once.
          Each phone has three panels. Correct commands earn 100 points, plus 20
          for each extra success in the team streak, up to 300 points per
          command. Wrong requested settings and missed orders reset the streak;
          your score stays. Unrelated panels are safe to explore. Pressure
          builds until the clock ends. Gentle gives more time. Everyone should
          update before playing these rules.
        </p>
      </GameHelp>
      {host && configure && (
        <>
          <div className="ship-config">
            <fieldset className="ship-duration">
              <legend>Mission length</legend>
              <div>
                {[1, 2, 3].map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${value} minute${value === 1 ? "" : "s"}`}
                    aria-pressed={minutes === value}
                    onClick={() => setMinutes(value)}
                  >
                    {value} min{value === 2 && <small>Recommended</small>}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="ship-difficulty">
              <legend>Command pace</legend>
              <div>
                {(["gentle", "standard"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={difficulty === value}
                    onClick={() => setDifficulty(value)}
                  >
                    {value === "gentle" ? "Gentle" : "Standard"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <button onClick={() => session.startShip(minutes, difficulty)}>
            {game.phase === "finished" ? "Launch Again" : "Launch Mission"}
          </button>
          {players.length === 1 && game.phase === "ready" && (
            <p className="muted">
              Solo practice uses your own panels. Add a player for teamwork.
            </p>
          )}
        </>
      )}
      {host && !configure && (
        <button
          className="secondary"
          onClick={() =>
            game.phase === "paused"
              ? session.resumeShip()
              : session.pauseGames()
          }
        >
          {game.phase === "paused" ? "Resume Mission" : "Pause Mission"}
        </button>
      )}
      {!host && configure && (
        <p className="muted">
          The host launches the mission. Everyone here joins the crew.
        </p>
      )}
    </section>
  );
}
