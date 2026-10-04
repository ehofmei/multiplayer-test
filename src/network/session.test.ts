import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "./session";

class Channel {
  label = "game";
  readyState = "connecting";
  bufferedAmount = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror = null;
  peer?: Channel;
  ignorePongs = false;
  send(data: string) {
    if (this.ignorePongs && JSON.parse(data).type === "pong") return;
    setTimeout(() => this.peer?.onmessage?.({ data }), 10);
  }
  close() {
    this.readyState = "closed";
  }
  open() {
    this.readyState = "open";
    this.onopen?.();
  }
}
class Peer {
  static all: Peer[] = [];
  connectionState = "new";
  iceConnectionState = "new";
  iceGatheringState = "complete";
  signalingState = "stable";
  ondatachannel?: (event: { channel: Channel }) => void;
  channel = new Channel();
  localDescription?: RTCSessionDescriptionInit;
  constructor() {
    Peer.all.push(this);
  }
  createDataChannel() {
    return this.channel;
  }
  async createOffer() {
    return { type: "offer", sdp: "v=0\r\na=candidate:LAN" };
  }
  async createAnswer() {
    return { type: "answer", sdp: "v=0\r\na=candidate:LAN" };
  }
  async setLocalDescription(description: RTCSessionDescriptionInit) {
    this.localDescription = description;
    this.signalingState =
      description.type === "offer" ? "have-local-offer" : "stable";
  }
  async setRemoteDescription() {
    this.signalingState = "stable";
  }
  close() {
    this.connectionState = "closed";
  }
}
let sessions: Session[];
beforeEach(() => {
  sessions = [];
  Peer.all = [];
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "performance",
    ],
  });
  vi.stubGlobal("RTCPeerConnection", Peer);
});
afterEach(() => {
  for (const session of sessions) session.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function pair() {
  const host = new Session("host", { id: "host", name: "Alex" }, () => {});
  const client = new Session(
    "client",
    { id: "client", name: "Emma" },
    () => {},
  );
  sessions.push(host, client);
  const offer = await host.offer();
  const answer = await client.answer(offer);
  await host.accept(answer);
  const [a, b] = Peer.all;
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  expect(client.snapshot().status).toBe("Connected to host");
  return { host, client, hostChannel: a.channel, clientChannel: b.channel };
}

describe("session latency", () => {
  it("measures local round trips and matches tap acknowledgments without duplicate samples", async () => {
    const { host, client } = await pair();
    host.selectGame("lights");
    await vi.advanceTimersByTimeAsync(1_100);
    expect(host.snapshot().links[0].rtt?.current).toBe(20);
    expect(client.snapshot().links[0].rtt?.current).toBe(20);
    client.toggle(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(client.snapshot().links[0].taps).toEqual({
      current: 20,
      median: 20,
      p95: 20,
      count: 1,
    });
    host.toggle(1);
    await vi.advanceTimersByTimeAsync(10);
    expect(client.snapshot().links[0].taps?.count).toBe(1);
    client.dispose();
    host.dispose();
    await vi.advanceTimersByTimeAsync(20);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("counts unanswered probes and ignores unmatched or late replies", async () => {
    const { hostChannel, client, clientChannel } = await pair();
    hostChannel.ignorePongs = true;
    await vi.advanceTimersByTimeAsync(7_000);
    expect(client.snapshot().links[0].missed).toBe(1);
    expect(client.snapshot().links[0].rtt).toBeUndefined();
    clientChannel.onmessage!({
      data: JSON.stringify({ v: 2, type: "pong", id: 1 }),
    });
    expect(client.snapshot().links[0].rtt).toBeUndefined();
    hostChannel.ignorePongs = false;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(client.snapshot().links[0].rtt?.current).toBe(20);
  });
});

describe("shared game room", () => {
  it("late arrivals spectate the race and losing a participant resets play without losing other peers", async () => {
    const { host, hostChannel } = await pair();
    const offer = await host.offer();
    host.selectGame("reaction");
    host.startRace();
    const late = new Session("client", { id: "late", name: "Sam" }, () => {});
    sessions.push(late);
    await host.accept(await late.answer(offer));
    const [a, b] = Peer.all.slice(-2);
    a.channel.peer = b.channel;
    b.channel.peer = a.channel;
    b.ondatachannel!({ channel: b.channel });
    a.channel.open();
    b.channel.open();
    await vi.advanceTimersByTimeAsync(20);
    expect(late.snapshot().players).toHaveLength(3);
    expect(late.snapshot().room.race?.entries.map((e) => e.id)).toEqual([
      "host",
      "client",
    ]);
    late.tapTarget(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(
      host.snapshot().room.race?.entries.every((e) => e.result === "pending"),
    ).toBe(true);
    hostChannel.onclose!();
    await vi.advanceTimersByTimeAsync(20);
    expect(late.snapshot().room.race?.phase).toBe("ready");
    expect(late.snapshot().players).toHaveLength(2);
    expect(late.snapshot().links[0].channel).toBe("open");
    expect(late.snapshot().room.notice).toContain("A player left");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(host.snapshot().room.race?.phase).toBe("ready");
  });
  it("runs Breakout with shared state, host controls, stale input protection and disconnect cleanup", async () => {
    const { host, client, hostChannel } = await pair();
    host.selectGame("breakout");
    client.startPong(["host", "client"]);
    host.startPong([]);
    host.startPong(["missing"]);
    expect(host.snapshot().room.pong?.phase).toBe("ready");
    host.startPong(["host", "client"]);
    await vi.advanceTimersByTimeAsync(1100);
    expect(client.snapshot().room.kind).toBe("breakout");
    expect(client.snapshot().room.pong?.breakout?.lives).toBe(5);
    client.move(0.8);
    await vi.advanceTimersByTimeAsync(100);
    expect(host.snapshot().room.pong?.paddles[1]).toBe(0.8);
    host.pauseGames();
    await vi.advanceTimersByTimeAsync(20);
    const state = client.snapshot().room.pong;
    await vi.advanceTimersByTimeAsync(2000);
    expect(client.snapshot().room.pong).toEqual(state);
    host.resumePong();
    await vi.advanceTimersByTimeAsync(1100);
    expect(client.snapshot().room.pong?.phase).toBe("playing");
    const epoch = host.snapshot().room.epoch;
    host.startPong(["host", "client"]);
    hostChannel.onmessage!({
      data: JSON.stringify({
        v: 2,
        type: "input",
        epoch,
        sequence: 999,
        input: { kind: "paddle", position: 0.2 },
      }),
    });
    expect(host.snapshot().room.pong?.paddles[1]).toBe(0.5);
    hostChannel.onclose!();
    expect(host.snapshot().room.pong?.phase).toBe("ready");
    expect(host.snapshot().room.notice).toContain("A player left");
    host.startPong(["host"]);
    await vi.advanceTimersByTimeAsync(1100);
    expect(host.snapshot().room.pong?.phase).toBe("playing");
    host.selectGame("lights");
    const room = host.snapshot().room;
    await vi.advanceTimersByTimeAsync(1000);
    expect(host.snapshot().room).toEqual(room);
  });
  it("only lets the host choose, rejects stale inputs and switches without losing peers", async () => {
    const { host, client, hostChannel } = await pair();
    expect(client.snapshot().room.kind).toBe("lobby");
    client.selectGame("pong");
    expect(host.snapshot().room.kind).toBe("lobby");
    host.selectGame("pong");
    host.startPong(["host", "host"]);
    expect(host.snapshot().room.pong?.phase).toBe("ready");
    host.startPong(["host", "client"]);
    await vi.advanceTimersByTimeAsync(1100);
    expect(client.snapshot().room.pong?.phase).toBe("playing");
    client.move(0.8);
    await vi.advanceTimersByTimeAsync(100);
    expect(host.snapshot().room.pong?.paddles[1]).toBe(0.8);
    host.pauseGames();
    await vi.advanceTimersByTimeAsync(10);
    const position = host.snapshot().room.pong?.ball;
    await vi.advanceTimersByTimeAsync(2000);
    expect(host.snapshot().room.pong?.ball).toEqual(position);
    host.resumePong();
    await vi.advanceTimersByTimeAsync(1100);
    expect(host.snapshot().room.pong?.phase).toBe("playing");
    const epoch = host.snapshot().room.epoch;
    host.selectGame("lights");
    hostChannel.onmessage!({
      data: JSON.stringify({
        v: 2,
        type: "toggle",
        epoch,
        index: 0,
        sequence: 100,
      }),
    });
    expect(host.snapshot().grid.revision).toBe(0);
    await vi.advanceTimersByTimeAsync(10);
    expect(client.snapshot().room.kind).toBe("lights");
    expect(client.snapshot().players).toHaveLength(2);
    expect(client.snapshot().links[0].channel).toBe("open");
    host.selectGame("reaction");
    host.startRace();
    client.dispose();
    host.dispose();
    await vi.advanceTimersByTimeAsync(100);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("runs all ten race rounds, scores local response times and ignores repeat/stale taps", async () => {
    const { host, client, hostChannel } = await pair();
    vi.spyOn(Math, "random").mockReturnValue(0);
    host.selectGame("reaction");
    host.startRace();
    await vi.advanceTimersByTimeAsync(10);
    client.tapTarget(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.race?.entries[1].result).toBe("early");
    await vi.advanceTimersByTimeAsync(1200);
    expect(client.snapshot().room.race?.phase).toBe("active");
    const before = client.snapshot().room.race!.entries[1].points;
    client.tapTarget(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.race?.entries[1].points).toBe(before);
    await vi.advanceTimersByTimeAsync(3400);
    expect(host.snapshot().room.race?.round).toBe(2);
    await vi.advanceTimersByTimeAsync(1200);
    client.tapTarget(0);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.race?.entries[1].result).toBe("hit");
    const race = host.snapshot().room.race!;
    hostChannel.onmessage!({
      data: JSON.stringify({
        v: 2,
        type: "input",
        epoch: host.snapshot().room.epoch,
        sequence: 999,
        input: { kind: "target", round: 1, index: 0, elapsed: 0 },
      }),
    });
    expect(host.snapshot().room.race).toBe(race);
    await vi.advanceTimersByTimeAsync(50_000);
    expect(host.snapshot().room.race?.phase).toBe("finished");
    expect(client.snapshot().room.race?.round).toBe(10);
    vi.restoreAllMocks();
  });
});
