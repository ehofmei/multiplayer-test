import { MISSION_MS, shipSystems, type ShipState } from "../games/ship";
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
  const host = session.role === "host";
  const configure = game.phase === "ready" || game.phase === "finished";
  const crew = game.crew.includes(session.me.id);
  const active = connected && crew && game.phase === "playing";
  const order = game.orders.find((o) => o.caller === session.me.id);
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "Gather your crew."
      : game.phase === "paused"
        ? "Mission paused · take a breath."
        : game.phase === "finished"
          ? game.hull > 0
            ? "Mission complete! Everyone made it."
            : "Hull lost. Try again together!"
          : !crew
            ? "You’re watching. Join the next mission."
            : order?.status === "done"
              ? "Order complete! +3 hull"
              : order?.status === "missed"
                ? "Order missed! −15 hull"
                : `Set ${shipSystems[order?.control ?? 0]} to ${order?.value}.`;
  return (
    <section
      className="games-card ship-game-card"
      aria-label="Spaceship Panic game"
    >
      <div className="board-heading">
        <h2>Spaceship Panic</h2>
        <span>{game.crew.length || players.length} crew</span>
      </div>
      <div className="ship-stats" aria-label="Ship status">
        <strong data-testid="ship-hull">Hull {game.hull}%</strong>
        <span data-testid="ship-clock">{clock(game.remaining)}</span>
        <span data-testid="ship-repairs">{game.repairs} repairs</span>
      </div>
      <progress
        className="ship-hull"
        aria-label="Hull health"
        value={game.hull}
        max="100"
      />
      <div className={`ship-order ${order?.status ?? ""}`}>
        {active && (
          <span className="ship-order-heading">
            {game.crew.length === 1
              ? "SOLO · YOUR OWN PANEL"
              : "CALL THIS OUT TO YOUR CREW"}
          </span>
        )}
        <p className="ship-command" aria-live="polite">
          {status}
        </p>
        {active && order?.status === "pending" && (
          <span className="ship-deadline" aria-label="Order time remaining">
            {Math.ceil(order.remaining / 1000)}s left
          </span>
        )}
      </div>
      {crew && (
        <div className="ship-panels" aria-label="Your ship controls">
          {game.controls.map((control, i) =>
            control.owner !== session.me.id ? null : (
              <fieldset key={i} className="ship-panel" disabled={!active}>
                <legend>{shipSystems[i]}</legend>
                <div>
                  {[0, 1, 2, 3].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${shipSystems[i]} ${value}`}
                      aria-pressed={control.value === value}
                      disabled={!active || control.value === value}
                      data-testid={`ship-control-${i}-${value}`}
                      onClick={() =>
                        session.setShipControl(i, value, control.revision)
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            ),
          )}
        </div>
      )}
      <p className="muted ship-help">
        {game.phase === "ready"
          ? "Survive a three-minute mission. Each phone has three controls; your orders usually belong to someone else. Read them aloud, listen for yours, and set the requested number."
          : "Read orders aloud. Only your three controls appear here. Missed orders cost 15 hull; wrong settings on a requested control cost 5. Repairs restore 3."}
      </p>
      {configure && game.phase === "finished" && (
        <p className="ship-summary">
          {game.repairs} repairs · {game.mistakes} mistakes ·{" "}
          {clock(MISSION_MS - game.remaining)} flown
        </p>
      )}
      {host && configure && (
        <>
          <button onClick={() => session.startShip()}>
            {game.phase === "finished" ? "Launch Again" : "Launch Mission"}
          </button>
          {players.length === 1 && (
            <p className="muted">
              Solo practice: orders use your own controls. Add another player
              for co-op.
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
