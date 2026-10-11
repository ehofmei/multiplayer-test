import { useEffect, useRef, useState } from "react";
import { AppPanel, GameHelp } from "./AppLayout";
import {
  treasureTotal,
  type Diver,
  type TreasureChoice,
  type TreasureState,
} from "../games/treasure";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
import { DivePicture, DiveScene } from "./DiveArtwork";
const labels: Record<TreasureChoice, string> = {
  return: "Return",
  explore: "Explore",
  shield: "Explore with shield",
};
export function diveReason(d: Diver): string {
  if (!d.locked && d.status !== "exploring")
    return d.status === "boat"
      ? "Safe on the boat; banked points are safe."
      : "Back on the boat; banked points are safe.";
  switch (d.outcome) {
    case "returned":
      return `Returned · banked ${d.change} points.`;
    case "caught":
      return `Caught · lost ${-d.change} haul. Banked points are safe.`;
    case "protected":
      return "Shield saved your haul. You can keep exploring.";
    case "treasure":
      return `Treasure · +${d.change} haul${d.shield ? "." : " · shield spent."}`;
    case "auto-bank":
      return `Sixth door · banked ${d.change} points automatically.`;
    default:
      return d.status === "boat"
        ? "Safe on the boat; next dive starts soon."
        : d.status === "caught"
          ? "Back on the boat; next dive starts soon."
          : "Choose a route, then lock it.";
  }
}
export function TreasureGame({
  game,
  players,
  session,
  connected,
}: {
  game: TreasureState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [selected, setSelected] = useState<TreasureChoice | null>(null);
  const [scoresOpen, setScoresOpen] = useState(false);
  const previous = useRef(game);
  const [effect, setEffect] = useState("");
  useEffect(() => {
    const old = previous.current;
    const before = old.divers.find((d) => d.id === session.me.id);
    const after = game.divers.find((d) => d.id === session.me.id);
    if (
      game.phase === "reveal" &&
      old.phase === "choosing" &&
      before?.status === "exploring" &&
      after
    )
      setEffect(`${game.dive}/${game.door}/${after.outcome}`);
    else if (game.phase !== "reveal") setEffect("");
    previous.current = game;
  }, [game, session.me.id]);
  useEffect(() => setSelected(null), [game.dive, game.door, game.phase]);
  const me = game.divers.find((d) => d.id === session.me.id);
  const outcome =
    game.phase === "reveal" && me?.locked ? me.outcome : "waiting";
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Diver";
  const highest = Math.max(0, ...game.divers.map(treasureTotal));
  const winners = game.divers.filter((d) => treasureTotal(d) === highest);
  const finished = game.phase === "finished";
  const results = finished || game.phase === "summary";
  const ready = game.phase === "ready";
  const active =
    connected &&
    game.phase === "choosing" &&
    me?.status === "exploring" &&
    !me.locked;
  const explorers = game.divers.filter((d) => d.status === "exploring");
  const status = !connected
    ? "Host disconnected"
    : ready
      ? "Three dives. One shield each dive. How far will you go?"
      : game.phase === "paused"
        ? "Dive paused · your haul and choices are safe."
        : game.phase === "countdown" || game.phase === "reorient"
          ? `Get ready · ${Math.ceil(game.remaining / 1000)}`
          : finished
            ? winners.length > 1
              ? `${winners.length} divers share the win!`
              : `${name(winners[0].id)} wins!`
            : game.phase === "summary"
              ? `Dive ${game.dive} complete · ${game.dive === 3 ? "final results next" : "everyone rejoins next dive"}`
              : !me
                ? "You’re watching. Join the next match."
                : game.phase === "reveal"
                  ? diveReason(me)
                  : me.status !== "exploring"
                    ? diveReason(me)
                    : me.locked
                      ? `Choice confirmed · waiting · ${explorers.filter((d) => d.locked).length}/${explorers.length} locked`
                      : "Bank your haul, or risk one more room?";
  const standings = (detailed: boolean) => (
    <ol className="dive-scores" aria-label="Banked standings">
      {[...game.divers]
        .sort((a, b) => treasureTotal(b) - treasureTotal(a))
        .map((d) => (
          <li key={d.id} data-winner={finished && treasureTotal(d) === highest}>
            <span>
              {name(d.id)}
              {d.id === session.me.id ? " · You" : ""}
              {(detailed || finished) && (
                <small>
                  <span className="dive-breakdown">
                    Dives: {d.scores.join(" + ")}
                  </span>
                  {detailed &&
                    (d.status === "exploring"
                      ? `${d.haul} haul${game.phase === "choosing" ? (d.locked ? " · Locked" : " · Choosing") : ""}`
                      : d.status === "caught"
                        ? "Caught"
                        : "On the boat")}
                  {detailed && game.phase === "reveal" && (
                    <>
                      <br />
                      {diveReason(d)}
                    </>
                  )}
                </small>
              )}
            </span>
            <strong>
              {treasureTotal(d)}
              <small>banked</small>
            </strong>
          </li>
        ))}
    </ol>
  );
  const help = (
    <GameHelp label="Help">
      <p>
        2–8 divers explore three dives, up to six doors each. Select a choice
        and Lock choice. Use Tab and Enter on a keyboard.
      </p>
      <p>
        Return banks your entire haul before the next card. Choices have no
        deadline; everyone exploring must Lock choice. Explore risks your haul.
        Explore with shield protects against one hazard and spends your shield
        even on treasure.
      </p>
      <p>
        Each dive starts with 12 shuffled cards: 4 hazards and treasures 2, 2,
        3, 3, 4, 4, 6, 10. Everyone exploring gets the same card and the full
        treasure value. Draws are without replacement. The sixth door
        automatically banks survivors.
      </p>
      <p>
        Example: with 7 haul and 3 hazards in 10 cards, Return guarantees 7
        points. Shield saves your haul on this door, but later doors are
        exposed.
      </p>
      <p>
        Take your time choosing. Reveals last 2 seconds and dive summaries 4
        seconds. Equal totals share the win. Pause preserves the deck and locked
        choices; Resume gives a short countdown. Late arrivals watch until a
        rematch. A participant leaving resets to setup.
      </p>
      <p>Update the app on every device before playing Treasure Dive.</p>
    </GameHelp>
  );
  return (
    <section
      className="games-card dive-game-card"
      data-phase={game.phase}
      aria-label="Treasure Dive"
    >
      <div className="board-heading">
        <h2>Treasure Dive</h2>
      </div>
      <div className="dive-workspace">
        <div className="dive-board">
          {finished ? (
            <div className="dive-finale">
              <DivePicture kind="treasure" />
              <p>Expedition complete</p>
              <h3>
                {winners.length > 1
                  ? `${winners.length} shared winners`
                  : `${name(winners[0].id)} wins!`}
              </h3>
              <strong>
                {highest}
                <small> winning banked points</small>
              </strong>
              <p>
                {me
                  ? `Your bank: ${treasureTotal(me)} · Rank ${1 + game.divers.filter((d) => treasureTotal(d) > treasureTotal(me)).length}`
                  : "Three dives, every treasure counted"}
              </p>
            </div>
          ) : (
            <>
              <div className="dive-progress">
                <strong>
                  {ready
                    ? "Sunken ship expedition"
                    : `Dive ${game.dive}/3 · Door ${game.door}/6`}
                </strong>
                {!ready && !finished && (
                  <span>
                    {game.phase === "paused"
                      ? "Paused"
                      : game.phase === "choosing"
                        ? "Choose"
                        : `${Math.ceil(game.remaining / 1000)}s`}
                  </span>
                )}
              </div>
              <DiveScene card={game.card} door={game.door} />
              <ol className="dive-path" aria-label="Ship doors">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <li
                    key={n}
                    aria-current={n === game.door ? "step" : undefined}
                    data-passed={n < game.door}
                  >
                    {n}
                  </li>
                ))}
              </ol>
              <p className="dive-odds">
                {game.hazardsLeft} hazards / {game.cardsLeft} cards left{" "}
                <strong>
                  {Math.round((game.hazardsLeft / game.cardsLeft) * 100)}%
                </strong>
              </p>
              {!ready && (
                <div className="dive-stats">
                  <span>
                    <DivePicture kind="boat" /> Banked{" "}
                    <strong>{me ? treasureTotal(me) : "—"}</strong>
                  </span>
                  <span>
                    <DivePicture kind="treasure" /> Haul{" "}
                    <strong>{me?.haul ?? "—"}</strong>
                  </span>
                  <span>
                    <DivePicture kind="shield" /> Shield{" "}
                    <strong className="dive-shield-state">
                      {me ? (me.shield ? "Ready" : "Spent") : "—"}
                    </strong>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="dive-decision">
          <p className="dive-status" aria-live="polite">
            {status}
          </p>
          {results ? (
            <div className="dive-results">{standings(false)}</div>
          ) : ready ? (
            <p className="dive-intro">
              Keep your treasure safe on the boat, or brave the ship’s next
              room. Highest banked score wins.
            </p>
          ) : (
            <>
              <p className="dive-card">
                {game.phase === "reveal"
                  ? game.card === null
                    ? "Everyone returned · no card drawn"
                    : game.card === 0
                      ? "Hazard!"
                      : `Treasure +${game.card}`
                  : "Choices stay secret until the reveal"}
              </p>
              {game.phase === "reveal" ? (
                <div
                  className="dive-outcome"
                  data-outcome={outcome ?? "watching"}
                  data-animate={!!effect}
                  key={effect || "still"}
                >
                  <div className="dive-outcome-art">
                    <DivePicture
                      kind={
                        outcome === "protected"
                          ? "shield"
                          : outcome === "caught"
                            ? "hazard"
                            : me?.status === "boat"
                              ? "boat"
                              : "treasure"
                      }
                    />
                    {me &&
                      ["returned", "auto-bank", "caught", "protected"].includes(
                        outcome,
                      ) && (
                        <span className="dive-moving-haul">
                          <DivePicture
                            kind={
                              outcome === "protected" ? "hazard" : "treasure"
                            }
                          />
                        </span>
                      )}
                  </div>
                  <strong>
                    {outcome === "waiting" && me
                      ? `On the boat · ${treasureTotal(me)} banked points safe`
                      : outcome === "caught"
                        ? `−${-(me?.change ?? 0)} haul · bank safe`
                        : outcome === "protected"
                          ? `Shield absorbed hazard · ${me?.haul ?? 0} haul safe`
                          : outcome === "returned" || outcome === "auto-bank"
                            ? `+${me?.change ?? 0} to bank${outcome === "auto-bank" ? " · sixth door" : ""}${outcome === "auto-bank" && game.card === 0 ? " · shield absorbed hazard" : ""}`
                            : outcome === "treasure"
                              ? `+${me?.change ?? 0} joins your haul`
                              : "Watching the expedition"}
                  </strong>
                  {me && (
                    <small>
                      Bank {treasureTotal(me)} · Haul {me.haul} · Shield{" "}
                      {me.shield ? "ready" : "spent"}
                    </small>
                  )}
                </div>
              ) : (
                <>
                  <div className="dive-choices">
                    {(["return", "explore", "shield"] as const).map((c) => (
                      <button
                        key={c}
                        aria-label={labels[c]}
                        aria-pressed={selected === c}
                        disabled={!active || (c === "shield" && !me?.shield)}
                        onClick={() => setSelected(c)}
                      >
                        <DivePicture kind={c === "return" ? "boat" : c} />
                        {c === "shield" ? "Shield" : labels[c]}
                        <small>
                          {c === "return"
                            ? `Bank ${me?.haul ?? 0}`
                            : c === "shield"
                              ? `Protect ${me?.haul ?? 0}`
                              : `Risk ${me?.haul ?? 0}`}
                        </small>
                      </button>
                    ))}
                  </div>
                  <p className="dive-preview">
                    {selected === "return"
                      ? `Bank ${me?.haul ?? 0} points now.`
                      : selected === "shield"
                        ? `Spend your shield; protect ${me?.haul ?? 0} haul this door.`
                        : selected === "explore"
                          ? `Risk ${me?.haul ?? 0} haul; banked ${me ? treasureTotal(me) : 0} stays safe.`
                          : me?.status !== "exploring"
                            ? "Watch this dive; you rejoin the next one."
                            : "Select a choice above."}
                  </p>
                  <button
                    className="dive-lock"
                    disabled={!active || !selected}
                    onClick={() =>
                      selected &&
                      session.chooseTreasure(selected, game.dive, game.door)
                    }
                  >
                    {me?.locked ? "Choice locked" : "Lock choice"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="dive-footer">
        {help}
        <button className="secondary" onClick={() => setScoresOpen(true)}>
          Standings
        </button>
        {session.role === "host" && (
          <>
            {ready || finished ? (
              <button
                disabled={players.length < 2}
                onClick={() => session.startTreasure()}
              >
                {finished ? "Dive Again" : "Start Dive"}
              </button>
            ) : (
              <>
                <button
                  className="secondary"
                  onClick={() =>
                    game.phase === "paused"
                      ? session.resumeTreasure()
                      : session.pauseGames()
                  }
                >
                  {game.phase === "paused" ? "Resume Dive" : "Pause Dive"}
                </button>
                <button
                  className="quiet"
                  onClick={() => session.selectGame("treasure")}
                >
                  Stop Dive
                </button>
              </>
            )}
          </>
        )}
      </div>
      <AppPanel
        title="Dive standings"
        open={scoresOpen}
        onClose={() => setScoresOpen(false)}
      >
        {ready ? (
          <p>{players.length} connected · at least two divers needed.</p>
        ) : (
          standings(true)
        )}
      </AppPanel>
    </section>
  );
}
