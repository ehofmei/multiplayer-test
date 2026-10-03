import { initialGrid, toggleGrid, type GridState } from "../game/grid";
import {
  parseMessage,
  validPlayer,
  type Message,
  type Player,
} from "./protocol";
import { localSignal, parseSignal } from "./signaling";

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
}
export interface Snapshot {
  grid: GridState;
  players: Player[];
  links: ConnectionInfo[];
  status: string;
  error: string;
}
export class Session {
  private links = new Map<string, Link>();
  private grid = initialGrid();
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
      role === "host" ? "Hosting · ready to pair" : "Waiting for a host offer";
  }
  snapshot(): Snapshot {
    return {
      grid: this.grid,
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
    const link: Link = { id, pc, sent: 0, received: 0, sequence: -1 };
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
        this.drop(link, "Pairing timed out. Create a fresh offer and answer."),
      180_000,
    );
    return link;
  }
  private attach(link: Link, channel: RTCDataChannel) {
    link.channel = channel;
    channel.onopen = () => {
      if (this.disposed || !this.links.has(link.id)) return;
      this.status =
        this.role === "host"
          ? "Hosting · connected"
          : "DataChannel open · waiting for host";
      clearTimeout(link.timer);
      link.timer = setTimeout(
        () => this.drop(link, "Player introduction timed out. Pair again."),
        30_000,
      );
      if (this.role === "client")
        this.send(link, { v: 1, type: "hello", player: this.me });
      this.emit();
    };
    channel.onmessage = (event) => {
      link.received++;
      link.lastMessage = Date.now();
      const message = parseMessage(event.data);
      if (!message) {
        this.fail("Ignored a malformed or unsupported protocol message.");
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
    if (this.role === "host") {
      if (message.type === "hello") {
        if (link.player) {
          this.fail("Ignored a repeated player introduction.");
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
      } else if (
        message.type === "toggle" &&
        link.player &&
        message.sequence > link.sequence
      ) {
        link.sequence = message.sequence;
        this.grid = toggleGrid(this.grid, message.index);
        this.broadcast();
      } else this.fail("Ignored an unexpected client message.");
    } else if (message.type === "state") {
      if (!message.players.some((p) => p.id === this.me.id)) {
        this.fail("Host state did not include this player.");
        return;
      }
      if (message.grid.revision < this.grid.revision) return;
      clearTimeout(link.timer);
      this.grid = message.grid;
      this.players = message.players;
      this.error = "";
      this.status = "Connected to host";
    } else this.fail("Ignored an unexpected host message.");
  }
  private broadcast() {
    this.players = [
      this.me,
      ...[...this.links.values()].flatMap((l) => (l.player ? [l.player] : [])),
    ];
    const message: Message = {
      v: 1,
      type: "state",
      grid: this.grid,
      players: this.players,
    };
    for (const link of this.links.values()) {
      if (link.player) this.send(link, message);
      // A failed send removes the peer and broadcasts a newer roster.
      if (!this.links.has(link.id)) return;
    }
    this.emit();
  }
  private drop(link: Link, reason: string) {
    if (!this.links.has(link.id)) return;
    this.links.delete(link.id);
    clearTimeout(link.timer);
    link.pc.onconnectionstatechange = null;
    link.pc.oniceconnectionstatechange = null;
    link.pc.onsignalingstatechange = null;
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
      this.status = "Hosting · ready to pair";
      this.broadcast();
    } else {
      this.players = [];
      this.status = "Host disconnected";
      this.emit();
    }
  }
  async offer(): Promise<string> {
    if (this.role !== "host") throw new Error("Only the host creates offers.");
    if (this.links.size >= 7)
      throw new Error("This test supports 8 devices total.");
    const link = this.makeLink(crypto.randomUUID());
    this.attach(link, link.pc.createDataChannel("game", { ordered: true }));
    try {
      await link.pc.setLocalDescription(await link.pc.createOffer());
      return await localSignal(link.pc, this.id, link.id);
    } catch (e) {
      this.drop(link, "Offer could not be created. Try again.");
      throw e;
    }
  }
  async answer(raw: string): Promise<string> {
    if (this.role !== "client")
      throw new Error("Only a client answers offers.");
    const signal = parseSignal(raw, "offer");
    // Parse first so an invalid paste does not discard a working connection.
    for (const l of this.links.values()) this.drop(l, "Replacing connection.");
    this.grid = initialGrid();
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
      this.status = "Answer ready · send it back to the host";
      this.emit();
      return await localSignal(link.pc, signal.session, signal.peer);
    } catch (e) {
      this.drop(link, "Could not apply the offer. Try a fresh handshake.");
      throw e;
    }
  }
  async accept(raw: string) {
    if (this.role !== "host") throw new Error("Only the host accepts answers.");
    const signal = parseSignal(raw, "answer");
    const link = this.links.get(signal.peer);
    if (signal.session !== this.id || !link)
      throw new Error("This answer belongs to a different or expired offer.");
    if (link.pc.signalingState !== "have-local-offer")
      throw new Error("This offer has already been answered.");
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
    if (this.role === "host") {
      this.grid = toggleGrid(this.grid, index);
      this.broadcast();
    } else {
      const link = [...this.links.values()][0];
      if (link?.channel?.readyState === "open" && this.players.length)
        this.send(link, {
          v: 1,
          type: "toggle",
          index,
          sequence: ++this.sequence,
        });
      this.emit();
    }
  }
  dispose() {
    this.disposed = true;
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
