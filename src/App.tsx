import { ArenaGame } from "./components/ArenaGame";
import { applyUpdate, checkForUpdate, useUpdates } from "./pwa/updates";
import { useEffect, useRef, useState } from "react";
import { useGameSounds } from "./audio/useGameSounds";
import {
  GamePicker,
  GameBar,
  PongGame,
  ReactionGame,
} from "./components/Games";
import { gameNames } from "./games/model";
import { QrDisplay, QrReader } from "./components/QrPairing";
import type { LatencySummary } from "./network/latency";
import {
  loadPlayer,
  savePlayer,
  Session,
  type Snapshot,
} from "./network/session";

const ms = (value: number) => `${value.toFixed(1)} ms`;
function latencyText(stats?: LatencySummary) {
  return stats
    ? `${ms(stats.current)} · median ${ms(stats.median)} · p95 ${ms(stats.p95)} (${stats.count}/60 samples)`
    : "Collecting samples…";
}

export function App() {
  const [identity] = useState(loadPlayer);
  const [name, setName] = useState(
    identity.player.name === "Player" ? "" : identity.player.name,
  );
  const [persisted, setPersisted] = useState(identity.persisted);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const update = useUpdates();
  const [offlineReady, setOfflineReady] = useState(false);
  const [standalone] = useState(
    () =>
      matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const supported =
    window.isSecureContext && typeof RTCPeerConnection !== "undefined";

  useEffect(() => {
    const ready = () => setOfflineReady(true);
    const visibility = () => {
      if (document.hidden) sessionRef.current?.pauseGames();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pwa-offline", ready);
    // Also detect an already-installed cache after subsequent launches.
    navigator.serviceWorker?.ready.then(() => setOfflineReady(true));
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pwa-offline", ready);
      sessionRef.current?.dispose();
    };
  }, []);
  const start = (role: "host" | "client") => {
    window.scrollTo(0, 0);
    const player = {
      ...identity.player,
      color: loadPlayer().player.color,
      name: name.trim() || "Player",
    };
    setName(name.trim());
    setPersisted(savePlayer(player));
    const next = new Session(role, player, setSnapshot);
    sessionRef.current = next;
    setSession(next);
    setSnapshot(next.snapshot());
    setOutput("");
    setInput("");
    setError("");
    setNotice("");
    setPairing(role === "client");
  };
  const home = () => {
    window.scrollTo(0, 0);
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setSession(null);
    setSnapshot(null);
    setOutput("");
    setInput("");
    setError("");
    setNotice("");
    setBusy(false);
    setPairing(false);
  };
  const action = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Connection failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setNotice("Copied. Send the complete text to the other device.");
    } catch {
      setNotice(
        "Copy unavailable. Select the text below and copy it manually.",
      );
    }
  };
  const applyConnection = (raw: string) =>
    action(async () => {
      const current = sessionRef.current;
      if (!current) return;
      setInput(raw);
      if (current.role === "host") {
        await current.accept(raw);
        setNotice("Join code accepted. Waiting for the direct connection.");
        setPairing(false);
        setOutput("");
        setInput("");
      } else {
        setOutput(await current.answer(raw));
        setInput("");
      }
    });
  useEffect(() => {
    if (session?.role === "client" && (snapshot?.players.length ?? 0) > 0)
      setPairing(false);
  }, [session, snapshot?.players.length]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pairing]);
  const connected =
    session?.role === "host" || (snapshot?.players.length ?? 0) > 0;
  const showPairing = pairing && !(session?.role === "client" && connected);
  const sound = useGameSounds(
    snapshot,
    identity.player.id,
    session?.id ?? "",
    !!session && connected && !showPairing,
  );

  return (
    <main>
      <header>
        <a
          href={import.meta.env.BASE_URL}
          onClick={(e) => {
            e.preventDefault();
            if (!busy) home();
          }}
          aria-label="P2P Game Lab home"
        >
          <span className="brand-icon" aria-hidden="true">
            ▦
          </span>
          <span>P2P Game Lab</span>
        </a>
        <div className="header-tools">
          <span className="badge">
            {standalone ? "Installed PWA" : "Browser"}
          </span>
          <button
            className="quiet sound-toggle"
            aria-label="Sound"
            aria-pressed={sound.enabled}
            onClick={sound.toggle}
          >
            Sound {sound.enabled ? "On" : "Off"}
          </button>
        </div>
      </header>
      {sound.unavailable && (
        <p className="footnote" aria-live="polite">
          Sound couldn’t start. Tap Sound off, then on to try again. You can
          keep playing.
        </p>
      )}
      {update.ready && (
        <aside className="banner">
          An update is ready. Use Update app below when you’re done playing.
        </aside>
      )}
      {!session ? (
        <section className="home">
          <p className="eyebrow">THE SAME WI-FI. A SHARED EXPERIMENT.</p>
          <h1>
            Same Wi-Fi.
            <br />
            <span>More play.</span>
          </h1>
          <p className="intro">
            Connect your family's devices, pick a game, and play together. One
            device hosts. Everyone can join.
          </p>
          <div className="home-card">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              placeholder="Player"
              maxLength={32}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setPersisted(
                  savePlayer({
                    ...identity.player,
                    color: loadPlayer().player.color,
                    name: e.target.value.trim() || "Player",
                  }),
                );
              }}
              autoComplete="nickname"
            />
            {!persisted && (
              <p role="status">
                Storage is unavailable. Your identity will last only for this
                visit.
              </p>
            )}
            <button disabled={!supported} onClick={() => start("host")}>
              Create Game <span aria-hidden="true">→</span>
            </button>
            <button
              className="secondary"
              disabled={!supported}
              onClick={() => start("client")}
            >
              Join Game
            </button>
          </div>
          {!supported && (
            <p className="error" role="alert">
              Open this app over HTTPS in a browser with WebRTC support. Desktop
              localhost also works.
            </p>
          )}
          <div className="how">
            <p>
              <strong>01 / Connect</strong> Use the same Wi-Fi network.
            </p>
            <p>
              <strong>02 / Pair</strong> Scan each other’s QR codes.
            </p>
            <p>
              <strong>03 / Play</strong> The host picks the game.
            </p>
          </div>
          <details className="install">
            <summary>Install on iPhone or iPad</summary>
            <p>
              Open in Safari, tap Share, then Add to Home Screen. Visit online
              once before testing offline. Each device must finish loading the
              app first.
            </p>
          </details>
          <p className="footnote">
            {offlineReady
              ? "App shell cached for offline use."
              : "Offline caching is available in the production build."}{" "}
            Gameplay uses direct WebRTC connections with no STUN or TURN.
          </p>
        </section>
      ) : (
        <>
          <div className="session-heading">
            <div>
              <p className="eyebrow">
                {session.role === "host"
                  ? "YOU ARE THE HOST"
                  : "YOU ARE A PLAYER"}
              </p>
              <h1>
                {showPairing
                  ? "Pair devices"
                  : connected
                    ? snapshot?.room.kind === "lights"
                      ? "Shared grid"
                      : gameNames[snapshot?.room.kind ?? "lobby"]
                    : "Join the fun"}
              </h1>
            </div>
            <button className="quiet" disabled={busy} onClick={home}>
              Return Home
            </button>
          </div>
          <p className="status" role="status">
            <span className={connected ? "dot live" : "dot"} />
            {snapshot?.status}
          </p>
          {!showPairing && (error || snapshot?.error) && (
            <p className="error" role="alert">
              {error || snapshot?.error}
            </p>
          )}
          {!showPairing && (
            <>
              {snapshot?.room.kind !== "lobby" && (
                <GameBar
                  session={session}
                  kind={snapshot?.room.kind ?? "lobby"}
                />
              )}
              {snapshot?.room.notice && (
                <p className="banner" aria-live="polite">
                  {snapshot.room.notice}
                </p>
              )}
              <div className="session-layout">
                {snapshot?.room.kind === "lobby" && (
                  <GamePicker session={session} />
                )}
                {snapshot?.room.kind === "arena" && snapshot.room.pong && (
                  <ArenaGame
                    key={snapshot.room.epoch}
                    game={snapshot.room.pong}
                    players={snapshot.players}
                    session={session}
                    connected={connected}
                  />
                )}
                {snapshot?.room.kind === "pong" && snapshot.room.pong && (
                  <PongGame
                    key={snapshot.room.epoch}
                    game={snapshot.room.pong}
                    epoch={snapshot.room.epoch}
                    players={snapshot.players}
                    session={session}
                    connected={connected}
                  />
                )}
                {snapshot?.room.race && (
                  <ReactionGame
                    game={snapshot.room.race}
                    players={snapshot.players}
                    session={session}
                    connected={connected}
                  />
                )}
                {snapshot?.room.kind === "lights" && (
                  <section className="board-card" aria-label="Shared grid">
                    <div className="board-heading">
                      <h2>Light board</h2>
                      <span>Revision {snapshot?.grid.revision ?? 0}</span>
                    </div>
                    <div className="grid">
                      {snapshot?.grid.cells.map((on, i) => (
                        <button
                          key={i}
                          className={on ? "cell on" : "cell"}
                          aria-label={"Cell " + (i + 1)}
                          aria-pressed={on}
                          disabled={!connected}
                          onClick={() => session.toggle(i)}
                        >
                          <span className="light" aria-hidden="true" />
                          <span>{i + 1}</span>
                          <span className="cell-state">
                            {on ? "ON" : "OFF"}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="board-note">
                      {connected
                        ? "Tap any light. The host shares every change."
                        : "Pair with a host to activate the board."}
                    </p>
                  </section>
                )}
                <aside className="people-card">
                  <div className="board-heading">
                    <h2>At the table</h2>
                    <span>{snapshot?.players.length ?? 0}/8</span>
                  </div>
                  <ul>
                    {snapshot?.players.map((p, i) => (
                      <li key={p.id}>
                        <span className="avatar">
                          {p.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          {p.name}
                          <small>
                            {i === 0 ? "Host" : "Player"}
                            {p.id === identity.player.id ? " · You" : ""}
                          </small>
                        </span>
                        <span className="dot live" />
                      </li>
                    ))}
                  </ul>
                  {session.role === "host" && (
                    <button
                      className="secondary"
                      disabled={busy || pairing}
                      onClick={() =>
                        action(async () => {
                          session.pauseGames();
                          setOutput(await session.offer());
                          setInput("");
                          setPairing(true);
                        })
                      }
                    >
                      Add Player
                    </button>
                  )}
                  {session.role === "client" && !connected && (
                    <p className="muted">
                      The host and players will appear here after pairing.
                    </p>
                  )}
                  <p className="footnote">
                    Keep the host app open and awake. Leaving the app may
                    interrupt connections.
                  </p>
                </aside>
              </div>
            </>
          )}
          {showPairing && (
            <section className="pair-card">
              <p className="eyebrow">PAIR WITH A QR CODE</p>
              <h2>
                {session.role === "host"
                  ? "Invite one device"
                  : output
                    ? "Show your join code"
                    : "Scan the host’s invite code"}
              </h2>
              <p className="pair-instructions">
                {session.role === "host"
                  ? "1. Have the player scan your invite code. 2. Scan their join code. Create a fresh invite for each player."
                  : output
                    ? "Show your join QR code to the host. Keep this screen open while they scan it."
                    : "Scan the host’s QR code. Your join code will appear here."}
              </p>
              {(error || snapshot?.error) && (
                <p className="error" role="alert">
                  {error || snapshot?.error}
                </p>
              )}
              <div className={`pairing-body ${output ? "has-code" : ""}`}>
                {output && (
                  <QrDisplay
                    value={output}
                    kind={session.role === "host" ? "Invite" : "Join"}
                  />
                )}
                <div className="pair-controls">
                  {!(session.role === "client" && output) && (
                    <QrReader
                      kind={session.role === "host" ? "Join" : "Invite"}
                      disabled={busy}
                      onRead={applyConnection}
                    />
                  )}
                  {output && (
                    <>
                      <details className="text-fallback">
                        <summary>Copy/paste instead</summary>
                        <label htmlFor="output">
                          {session.role === "host"
                            ? "Invite text"
                            : "Join text"}
                        </label>
                        <textarea
                          id="output"
                          readOnly
                          value={output}
                          onFocus={(e) => e.target.select()}
                          spellCheck={false}
                        />
                        <button className="secondary" onClick={copy}>
                          Copy {session.role === "host" ? "Invite" : "Join"}
                        </button>
                      </details>
                    </>
                  )}
                  {!(session.role === "client" && output) && (
                    <details className="text-fallback">
                      <summary>Paste connection text instead</summary>
                      <label htmlFor="input">
                        {session.role === "host"
                          ? "Paste player join code"
                          : "Paste host invite code"}
                      </label>
                      <textarea
                        id="input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Paste the complete connection text here…"
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                      />
                      <button
                        disabled={busy || !input.trim()}
                        onClick={() => applyConnection(input)}
                      >
                        {busy
                          ? "Preparing connection…"
                          : session.role === "host"
                            ? "Connect Player"
                            : "Create Join Code"}
                      </button>
                    </details>
                  )}
                  {session.role === "host" && (
                    <button
                      className="quiet"
                      disabled={busy}
                      onClick={() => {
                        session.cancelOffer(output);
                        setError("");
                        setPairing(false);
                        setOutput("");
                        setInput("");
                        setNotice("");
                      }}
                    >
                      Cancel Invite
                    </button>
                  )}
                  {session.role === "client" && output && (
                    <p className="muted">
                      Keep this screen open until the host scans your join code.
                      Pairing expires after three minutes.
                    </p>
                  )}
                  {notice && <p role="status">{notice}</p>}
                </div>
              </div>
            </section>
          )}
          <details className="debug">
            <summary>
              Connection details · {snapshot?.links.length ?? 0} peer(s)
            </summary>
            <p className="footnote">
              Round-trip time includes both directions and peer processing.
              Samples update once per second; median and p95 use the latest 60
              samples. Tap response measures a client action until its host
              state arrives, before screen rendering. Keep both devices
              foregrounded for useful results.
            </p>
            {!snapshot?.links.length && <p>No active peer connections.</p>}
            {snapshot?.links.map((link) => (
              <div className="connection" key={link.id}>
                <h3>{link.name}</h3>
                <dl>
                  <dt>Connection</dt>
                  <dd>{link.connection}</dd>
                  <dt>ICE</dt>
                  <dd>{link.ice}</dd>
                  <dt>Signaling</dt>
                  <dd>{link.signaling}</dd>
                  <dt>DataChannel</dt>
                  <dd>{link.channel}</dd>
                  <dt>Messages sent / received</dt>
                  <dd>
                    {link.sent} / {link.received}
                  </dd>
                  <dt>Last message</dt>
                  <dd>
                    {link.lastMessage
                      ? new Date(link.lastMessage).toLocaleTimeString()
                      : "None yet"}
                  </dd>
                  <dt>Round-trip time</dt>
                  <dd data-testid="rtt">{latencyText(link.rtt)}</dd>
                  <dt>Unanswered probes</dt>
                  <dd>{link.missed}</dd>
                  {session.role === "client" && (
                    <>
                      <dt>Tap response</dt>
                      <dd data-testid="tap-response">
                        {link.taps
                          ? latencyText(link.taps)
                          : "Tap a light or race target to measure"}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            ))}
          </details>
        </>
      )}
      <footer>
        <div>
          LOCAL WI-FI LAB <span>One host. Everyone connected.</span>
        </div>
        <div className="app-updates">
          <span className="build-id" title="UTC build time and source revision">
            Build {__BUILD_ID__}
          </span>
          <button
            className="quiet"
            disabled={update.busy}
            onClick={() => {
              if (!update.ready) void checkForUpdate();
              else if (
                !session ||
                window.confirm(
                  "Updating reloads the app and ends your connection to this game. Update now?",
                )
              )
                void applyUpdate();
            }}
          >
            {update.busy
              ? update.ready
                ? "Updating…"
                : "Checking…"
              : update.ready
                ? "Update app"
                : "Check for updates"}
          </button>
          <p aria-live="polite">{update.message}</p>
        </div>
      </footer>
    </main>
  );
}
