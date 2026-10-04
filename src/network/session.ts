import { newArena, moveArena, stepArena } from "../games/arena";
import { validColor, type PaddleColor } from "../games/colors";
import {
  newRoom,
  newPong,
  movePaddle,
  stepPong,
  raceRound,
  raceTap,
  finishRaceRound,
  type Room,
  type GameKind,
  type GameInput,
} from "../games/model";
import { initialGrid, toggleGrid, type GridState } from "../game/grid";
import {
  parseMessage,
  validPlayer,
  type Message,
  type Player,
} from "./protocol";
import { localSignal, parseSignal } from "./signaling";
import { decodeSignal } from "./qr-signal";
import { LatencyWindow, type LatencySummary } from "./latency";

interface Link {
  id: string;
  pc: RTCPeerConnection;
  channel?: RTCDataChannel;
  player?: Player;
  sent: number;
  received: number;
  lastMessage?: number;
  sequence: number;
  timer?: ReturnType<typeof setTimeout>;
  introduction?: ReturnType<typeof setInterval>;
  metrics?: ReturnType<typeof setInterval>;
  probeId: number;
  probe?: { id: number; started: number };
  rtt: LatencyWindow;
  taps: LatencyWindow;
  pendingTaps: Map<number, number>;
  missed: number;
}
export interface ConnectionInfo {
  id: string;
  name: string;
  connection: RTCPeerConnectionState;
  ice: RTCIceConnectionState;
  signaling: RTCSignalingState;
  channel: string;
  sent: number;
  received: number;
  lastMessage?: number;
  rtt?: LatencySummary;
  taps?: LatencySummary;
  missed: number;
}
export interface Snapshot {
  grid: GridState;
  room: Room;
  players: Player[];
  links: ConnectionInfo[];
  status: string;
  error: string;
}
export class Session {
  private links = new Map<string, Link>();
  private grid = initialGrid();
  private room = newRoom("lobby", 0);
  private gameTimer?: ReturnType<typeof setInterval>;
  private raceTimer?: ReturnType<typeof setTimeout>;
  private paddleTimer?: ReturnType<typeof setTimeout>;
  private queuedPaddle?: { epoch: number; position: number };
  private raceShownAt = 0;
  private lastRaceRound = "";
  private players: Player[];
  private status: string;
  private error = "";
  private disposed = false;
  private sequence = 0;
  readonly id = crypto.randomUUID();
  constructor(
    readonly role: "host" | "client",
    readonly me: Player,
    private notify: (snapshot: Snapshot) => void,
  ) {
    this.players = role === "host" ? [me] : [];
    this.status =
      role === "host"
        ? "Hosting · ready to pair"
        : "Waiting for the host’s invite code";
  }
  snapshot(): Snapshot {
    return {
      grid: this.grid,
      room: this.room,
      players: this.players,
      status: this.status,
      error: this.error,
      links: [...this.links.values()].map((l) => ({
        id: l.id,
        name:
          l.player?.name ??
          (this.role === "client" ? "Host" : "Joining player"),
        connection: l.pc.connectionState,
        ice: l.pc.iceConnectionState,
        signaling: l.pc.signalingState,
        channel: l.channel?.readyState ?? "not created",
        sent: l.sent,
        received: l.received,
        lastMessage: l.lastMessage,
        rtt: l.rtt.summary(),
        taps: l.taps.summary(),
        missed: l.missed,
      })),
    };
  }
  private emit() {
    if (!this.disposed) this.notify(this.snapshot());
  }
  private fail(message: string) {
    this.error = message;
    console.warn("[Game Lab]", message);
    this.emit();
  }
  private makeLink(id: string): Link {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const link: Link = {
      id,
      pc,
      sent: 0,
      received: 0,
      sequence: -1,
      probeId: 0,
      rtt: new LatencyWindow(),
      taps: new LatencyWindow(),
      pendingTaps: new Map(),
      missed: 0,
    };
    this.links.set(id, link);
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState))
        this.drop(
          link,
          this.role === "client"
            ? "Host disconnected. Return home and pair again."
            : "Player disconnected. Pair again to rejoin.",
        );
      this.emit();
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed")
        this.drop(
          link,
          "ICE failed. Check the same Wi-Fi network and router client isolation; no relay server is available.",
        );
      this.emit();
    };
    pc.onsignalingstatechange = () => this.emit();
    // Bound abandoned offers and failed handshakes rather than leaving resources open indefinitely.
    link.timer = setTimeout(
      () =>
        this.drop(
          link,
          "Pairing timed out. Create fresh invite and join codes.",
        ),
      180_000,
    );
    return link;
  }
  private attach(link: Link, channel: RTCDataChannel) {
    link.channel = channel;
    let opened = false;
    const openedChannel = () => {
      if (this.disposed || !this.links.has(link.id)) return;
      if (opened) return;
      opened = true;
      this.status =
        this.role === "host"
          ? "Hosting · connected"
          : "DataChannel open · waiting for host";
      clearTimeout(link.timer);
      if (!link.player)
        link.timer = setTimeout(
          () => this.drop(link, "Player introduction timed out. Pair again."),
          30_000,
        );
      if (this.role === "client") {
        // Channel-open alone does not confirm the application handshake.
        // Retry until the host acknowledges us with its initial state.
        link.introduction = setInterval(
          () => this.send(link, { v: 2, type: "hello", player: this.me }),
          1_000,
        );
        this.send(link, { v: 2, type: "hello", player: this.me });
      } else if (link.player) this.broadcast();
      this.emit();
    };
    channel.onopen = openedChannel;
    channel.onmessage = (event) => {
      link.received++;
      link.lastMessage = Date.now();
      const message = parseMessage(event.data);
      if (!message) {
        this.fail(
          "Unsupported game message. Update the app on every device and pair again.",
        );
        return;
      }
      this.receive(link, message);
      this.emit();
    };
    channel.onclose = () =>
      this.drop(
        link,
        this.role === "client"
          ? "Host disconnected. Return home and pair again."
          : "Player disconnected. Pair again to rejoin.",
      );
    channel.onerror = () =>
      this.drop(
        link,
        "DataChannel failed. Pair again with fresh connection text.",
      );
    // Remote-created channels can already be open when delivered to us.
    if (channel.readyState === "open") openedChannel();
  }
  private send(link: Link, message: Message) {
    if (link.channel?.readyState !== "open") return;
    if (link.channel.bufferedAmount > 64_000) {
      this.drop(link, "Connection is too slow; pair again.");
      return;
    }
    try {
      link.channel.send(JSON.stringify(message));
      link.sent++;
    } catch {
      this.drop(link, "Could not send to peer. Pair again.");
    }
  }
  private receive(link: Link, message: Message) {
    if (message.type === "ping" || message.type === "pong") {
      if (!(this.role === "host" ? link.player : this.players.length)) return;
      if (message.type === "ping")
        this.send(link, { v: 2, type: "pong", id: message.id });
      else if (link.probe?.id === message.id) {
        const elapsed = performance.now() - link.probe.started;
        if (elapsed <= 5_000) link.rtt.add(elapsed);
        else link.missed++;
        link.probe = undefined;
      }
      return;
    }
    if (this.role === "host") {
      if (message.type === "hello") {
        if (link.player) {
          // Repeated introductions acknowledge a retry without adding a player
          // or changing the identity already bound to this connection.
          if (link.player.id === message.player.id) this.broadcast();
          else this.fail("Ignored a changed player introduction.");
          return;
        }
        if (
          message.player.id === this.me.id ||
          [...this.links.values()].some(
            (l) => l !== link && l.player?.id === message.player.id,
          )
        ) {
          this.drop(
            link,
            "This player is already connected. Use a separate device or browser profile.",
          );
          return;
        }
        link.player = message.player;
        clearTimeout(link.timer);
        this.error = "";
        this.broadcast();
        this.startMetrics(link);
      } else if (
        message.type === "toggle" &&
        link.player &&
        message.sequence > link.sequence
      ) {
        link.sequence = message.sequence;
        if (message.epoch !== this.room.epoch || this.room.kind !== "lights")
          return;
        this.grid = toggleGrid(this.grid, message.index);
        this.broadcast();
      } else if (
        message.type === "input" &&
        link.player &&
        message.sequence > link.sequence
      ) {
        link.sequence = message.sequence;
        if (message.epoch !== this.room.epoch) return;
        this.applyInput(link.player.id, message.input);
      } else this.fail("Ignored an unexpected client message.");
    } else if (message.type === "state") {
      if (!message.players.some((p) => p.id === this.me.id)) {
        this.fail("Host state did not include this player.");
        return;
      }
      if (message.room.epoch < this.room.epoch) return;
      if (
        message.room.epoch === this.room.epoch &&
        message.grid.revision < this.grid.revision
      )
        return;
      this.room = message.room;
      if (this.room.pong?.phase === "paused") {
        clearTimeout(this.paddleTimer);
        this.paddleTimer = undefined;
        this.queuedPaddle = undefined;
      }
      const raceKey = `${this.room.epoch}/${this.room.race?.round}`;
      if (
        this.room.race?.phase === "active" &&
        raceKey !== this.lastRaceRound
      ) {
        this.lastRaceRound = raceKey;
        this.raceShownAt = performance.now();
      }
      clearTimeout(link.timer);
      clearInterval(link.introduction);
      this.grid = message.grid;
      this.players = message.players;
      this.error = "";
      this.status = "Connected to host";
      if (message.ack !== undefined) {
        const started = link.pendingTaps.get(message.ack);
        if (started !== undefined) link.taps.add(performance.now() - started);
        for (const id of link.pendingTaps.keys())
          if (id <= message.ack) link.pendingTaps.delete(id);
      }
      this.startMetrics(link);
    } else this.fail("Ignored an unexpected host message.");
  }
  private broadcast() {
    this.players = [
      this.me,
      ...[...this.links.values()].flatMap((l) => (l.player ? [l.player] : [])),
    ];
    const message: Message = {
      v: 2,
      type: "state",
      grid: this.grid,
      room: this.room,
      players: this.players,
    };
    for (const link of this.links.values()) {
      if (
        link.player &&
        !(
          this.room.pong?.phase === "playing" &&
          (link.channel?.bufferedAmount ?? 0) > 4_000
        )
      )
        this.send(link, {
          ...message,
          ...(link.sequence >= 0 ? { ack: link.sequence } : {}),
        });
      // A failed send removes the peer and broadcasts a newer roster.
      if (!this.links.has(link.id)) return;
    }
    this.emit();
  }
  private startMetrics(link: Link) {
    if (this.disposed || this.links.get(link.id) !== link) return;
    if (link.metrics) return;
    link.metrics = setInterval(() => {
      const now = performance.now();
      for (const [id, started] of link.pendingTaps)
        if (now - started > 10_000) link.pendingTaps.delete(id);
      if (link.probe && now - link.probe.started >= 5_000) {
        link.missed++;
        link.probe = undefined;
      }
      if (!link.probe && link.channel?.readyState === "open") {
        link.probe = { id: ++link.probeId, started: now };
        this.send(link, { v: 2, type: "ping", id: link.probe.id });
      }
      this.emit();
    }, 1_000);
  }
  private drop(link: Link, reason: string) {
    if (!this.links.has(link.id)) return;
    this.links.delete(link.id);
    clearTimeout(link.timer);
    clearInterval(link.introduction);
    clearInterval(link.metrics);
    link.pendingTaps.clear();
    link.probe = undefined;
    link.pc.onconnectionstatechange = null;
    link.pc.oniceconnectionstatechange = null;
    link.pc.onsignalingstatechange = null;
    link.pc.ondatachannel = null;
    if (link.channel) {
      link.channel.onclose = null;
      link.channel.onerror = null;
      link.channel.onmessage = null;
      link.channel.onopen = null;
      link.channel.close();
    }
    link.pc.close();
    if (this.disposed) return;
    this.error = reason;
    if (this.role === "host") {
      if (
        link.player &&
        (this.room.pong?.seats.includes(link.player.id) ||
          this.room.race?.entries.some((e) => e.id === link.player!.id))
      ) {
        this.stopGameTimers();
        this.room = newRoom(this.room.kind, this.room.epoch + 1);
        this.room.notice =
          "A player left. Choose players and start a new round.";
      }
      this.status = "Hosting · ready to pair";
      this.broadcast();
    } else {
      this.stopGameTimers();
      this.players = [];
      this.status = "Host disconnected";
      this.emit();
    }
  }
  async offer(): Promise<string> {
    if (this.role !== "host")
      throw new Error("Only the host creates invite codes.");
    if (this.links.size >= 7)
      throw new Error("This room supports 8 devices total.");
    const link = this.makeLink(crypto.randomUUID());
    this.attach(link, link.pc.createDataChannel("game", { ordered: true }));
    try {
      await link.pc.setLocalDescription(await link.pc.createOffer());
      return await localSignal(link.pc, this.id, link.id);
    } catch (e) {
      this.drop(link, "Invite code could not be created. Try again.");
      throw e;
    }
  }
  async answer(raw: string): Promise<string> {
    if (this.role !== "client")
      throw new Error("Only a joining player creates a join code.");
    const signal = await decodeSignal(raw, "offer");
    // Parse first so an invalid paste does not discard a working connection.
    this.stopGameTimers();
    this.lastRaceRound = "";
    this.raceShownAt = 0;
    for (const l of this.links.values()) this.drop(l, "Replacing connection.");
    this.grid = initialGrid();
    this.room = newRoom("lobby", 0);
    this.players = [];
    this.error = "";
    const link = this.makeLink(signal.peer);
    link.pc.ondatachannel = (event) => {
      if (event.channel.label !== "game" || link.channel) {
        event.channel.close();
        return;
      }
      this.attach(link, event.channel);
    };
    try {
      await link.pc.setRemoteDescription(signal.description);
      await link.pc.setLocalDescription(await link.pc.createAnswer());
      this.status = "Join code ready · show it to the host";
      this.emit();
      return await localSignal(link.pc, signal.session, signal.peer);
    } catch (e) {
      this.drop(link, "Could not use the invite code. Try a fresh invite.");
      throw e;
    }
  }
  async accept(raw: string) {
    if (this.role !== "host")
      throw new Error("Only the host accepts join codes.");
    const signal = await decodeSignal(raw, "answer");
    const link = this.links.get(signal.peer);
    if (signal.session !== this.id || !link)
      throw new Error(
        "This join code belongs to a different or expired invite.",
      );
    if (link.pc.signalingState !== "have-local-offer")
      throw new Error("This invite has already been used.");
    await link.pc.setRemoteDescription(signal.description);
    this.error = "";
    this.emit();
  }
  cancelOffer(raw: string) {
    const signal = parseSignal(raw, "offer");
    const link = this.links.get(signal.peer);
    if (link && !link.player) this.drop(link, "");
  }
  toggle(index: number) {
    if (this.room.kind !== "lights") return;
    if (this.role === "host") {
      this.grid = toggleGrid(this.grid, index);
      this.broadcast();
    } else {
      const link = [...this.links.values()][0];
      if (link?.channel?.readyState === "open" && this.players.length) {
        const sequence = ++this.sequence;
        if (link.pendingTaps.size >= 64)
          link.pendingTaps.delete(link.pendingTaps.keys().next().value!);
        link.pendingTaps.set(sequence, performance.now());
        this.send(link, {
          v: 2,
          type: "toggle",
          epoch: this.room.epoch,
          index,
          sequence,
        });
      }
      this.emit();
    }
  }
  private stopGameTimers() {
    clearInterval(this.gameTimer);
    clearTimeout(this.raceTimer);
    clearTimeout(this.paddleTimer);
    this.gameTimer = this.raceTimer = this.paddleTimer = undefined;
    this.queuedPaddle = undefined;
  }
  selectGame(kind: GameKind) {
    if (this.role !== "host" || this.disposed) return;
    this.stopGameTimers();
    this.room = newRoom(kind, this.room.epoch + 1);
    this.grid = initialGrid();
    this.broadcast();
  }
  startPong(seats: string[], startingLives = 5) {
    if (
      this.role !== "host" ||
      !["pong", "arena"].includes(this.room.kind) ||
      (this.room.kind === "arena"
        ? seats.length < 3 || seats.length > 4
        : seats.length !== 2) ||
      (this.room.kind === "arena" && ![1, 3, 5, 7].includes(startingLives)) ||
      new Set(seats).size !== seats.length ||
      !seats.every((id) => this.players.some((p) => p.id === id))
    )
      return;
    this.stopGameTimers();
    this.room.epoch++;
    this.room.notice = "";
    this.room.pong = {
      ...(this.room.kind === "arena"
        ? newArena(seats, startingLives)
        : newPong(seats)),
      phase: "serve",
    };
    this.runPong();
    this.broadcast();
  }
  private runPong() {
    let last = performance.now();
    let broadcastAt = last;
    let accumulator = 0;
    this.gameTimer = setInterval(() => {
      const now = performance.now();
      // A suspended tab must not fast-forward an unseen match.
      if (now - last > 500) {
        this.pauseGames();
        return;
      }
      accumulator += Math.min(0.05, (now - last) / 1000);
      last = now;
      while (accumulator >= 1 / 120 && this.room.pong) {
        this.room.pong =
          this.room.kind === "arena"
            ? stepArena(this.room.pong, 1 / 120)
            : stepPong(this.room.pong, 1 / 120);
        accumulator -= 1 / 120;
      }
      if (this.room.pong?.phase === "finished") {
        clearInterval(this.gameTimer);
        this.gameTimer = undefined;
        this.broadcast();
      } else if (now - broadcastAt >= 50) {
        broadcastAt = now;
        this.broadcast();
      } else this.emit();
    }, 1000 / 60);
  }
  pauseGames() {
    if (this.role !== "host") return;
    const pong = this.room.pong;
    if (pong && ["serve", "playing"].includes(pong.phase)) {
      this.stopGameTimers();
      this.room.pong = { ...pong, phase: "paused" };
      this.broadcast();
    } else if (
      this.room.race &&
      ["waiting", "active", "results"].includes(this.room.race.phase)
    ) {
      this.stopGameTimers();
      this.room = newRoom("reaction", this.room.epoch + 1);
      this.room.notice =
        "Race stopped. Keep the host app open, then start again.";
      this.broadcast();
    }
  }
  resumePong() {
    if (this.role !== "host" || this.room.pong?.phase !== "paused") return;
    this.room.pong = { ...this.room.pong, phase: "serve", serveIn: 1 };
    this.runPong();
    this.broadcast();
  }
  startRace() {
    if (this.role !== "host" || this.room.kind !== "reaction") return;
    this.stopGameTimers();
    this.room.epoch++;
    this.room.notice = "";
    const entries = this.players.map((p) => ({
      id: p.id,
      points: 0,
      result: "pending" as const,
      elapsed: null,
    }));
    this.nextRaceRound(entries, 1);
  }
  private nextRaceRound(
    entries: NonNullable<Room["race"]>["entries"],
    round: number,
  ) {
    this.room.race = raceRound(entries, round);
    this.broadcast();
    this.raceTimer = setTimeout(
      () => {
        const race = this.room.race;
        if (!race) return;
        this.raceShownAt = performance.now();
        this.room.race = {
          ...race,
          phase: "active",
          target: Math.floor(Math.random() * 6),
        };
        this.broadcast();
        // Give clients a bounded allowance for delivery, using their own local
        // cue-to-tap measurement rather than subtracting mismatched device clocks.
        const allowance = Math.min(
          250,
          Math.max(
            50,
            ...[...this.links.values()].map((l) => l.rtt.summary()?.p95 ?? 100),
          ),
        );
        this.raceTimer = setTimeout(() => {
          if (!this.room.race) return;
          this.room.race = finishRaceRound(this.room.race);
          this.broadcast();
          this.raceTimer = setTimeout(() => {
            const race = this.room.race;
            if (!race) return;
            if (race.round === 10) {
              this.room.race = { ...race, phase: "finished" };
              this.broadcast();
            } else this.nextRaceRound(race.entries, race.round + 1);
          }, 1400);
        }, 2000 + allowance);
      },
      1200 + Math.random() * 1800,
    );
  }
  private applyInput(id: string, input: GameInput) {
    if (input.kind === "color") {
      const player =
        id === this.me.id
          ? this.me
          : [...this.links.values()].find((l) => l.player?.id === id)?.player;
      if (player && validColor(input.color)) {
        player.color = input.color;
        this.broadcast();
      }
    } else if (input.kind === "paddle" && this.room.pong) {
      this.room.pong =
        this.room.kind === "arena"
          ? moveArena(this.room.pong, id, input.position)
          : movePaddle(this.room.pong, id, input.position);
      this.emit();
    } else if (
      input.kind === "target" &&
      this.room.race?.round === input.round
    ) {
      this.room.race = raceTap(this.room.race, id, input.index, input.elapsed);
      this.broadcast();
    }
  }
  private input(input: GameInput) {
    if (this.role === "host") this.applyInput(this.me.id, input);
    else {
      const link = [...this.links.values()][0];
      if (!this.players.length) return;
      if (link?.channel?.readyState === "open") {
        const sequence = ++this.sequence;
        if (input.kind === "target") {
          if (link.pendingTaps.size >= 64)
            link.pendingTaps.delete(link.pendingTaps.keys().next().value!);
          link.pendingTaps.set(sequence, performance.now());
        }
        this.send(link, {
          v: 2,
          type: "input",
          epoch: this.room.epoch,
          sequence,
          input,
        });
      }
    }
  }
  setColor(color: PaddleColor) {
    if (!validColor(color)) return;
    this.me.color = color;
    savePlayer(this.me);
    this.input({ kind: "color", color });
  }
  move(position: number) {
    if (
      !Number.isFinite(position) ||
      !["pong", "arena"].includes(this.room.kind)
    )
      return;
    this.queuedPaddle = {
      epoch: this.room.epoch,
      position: Math.max(0, Math.min(1, position)),
    };
    if (!this.paddleTimer)
      this.paddleTimer = setTimeout(() => {
        const queued = this.queuedPaddle;
        this.paddleTimer = undefined;
        this.queuedPaddle = undefined;
        if (queued?.epoch === this.room.epoch)
          this.input({ kind: "paddle", position: queued.position });
      }, 33);
  }
  tapTarget(index: number) {
    const race = this.room.race;
    if (!race || !Number.isInteger(index) || index < 0 || index >= 6) return;
    const elapsed =
      race.phase === "active"
        ? Math.max(0, Math.round(performance.now() - this.raceShownAt))
        : 0;
    if (elapsed > 2000) return;
    this.input({ kind: "target", round: race.round, index, elapsed });
  }
  dispose() {
    this.disposed = true;
    this.stopGameTimers();
    for (const link of this.links.values()) this.drop(link, "");
  }
}
export function loadPlayer(): { player: Player; persisted: boolean } {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem("p2p-game-lab-player-v1") ?? "null",
    );
    if (validPlayer(saved)) return { player: saved, persisted: true };
  } catch {
    /* Restricted storage and corrupted data fall back to a temporary identity. */
  }
  const player = {
    id:
      crypto.randomUUID?.() ??
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) =>
        value.toString(16).padStart(2, "0"),
      ).join(""),
    name: "Player",
  };
  return { player, persisted: savePlayer(player) };
}
export function savePlayer(player: Player) {
  try {
    localStorage.setItem("p2p-game-lab-player-v1", JSON.stringify(player));
    return true;
  } catch {
    return false;
  }
}
