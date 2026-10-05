import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Session } from "./session";
import { glowColors } from "../games/glow";

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
  it("synchronizes ship repairs and rejects stale/foreign control inputs", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { host, client, hostChannel } = await pair();
    client.selectGame("ship");
    expect(host.snapshot().room.kind).toBe("lobby");
    host.selectGame("ship");
    client.startShip();
    expect(host.snapshot().room.ship?.phase).toBe("ready");
    host.startShip();
    await vi.advanceTimersByTimeAsync(20);
    client.setShipControl(0, 1, 0);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.ship?.repairs).toBe(0);
    client.setShipControl(3, 2, 0);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.ship?.hull).toBe(95);
    client.setShipControl(3, 1, 1);
    await vi.advanceTimersByTimeAsync(20);
    expect(client.snapshot().room.ship?.repairs).toBe(1);
    expect(client.snapshot().room.ship?.hull).toBe(98);
    client.setShipControl(3, 3, 1);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.ship?.controls[3].value).toBe(1);
    host.pauseGames();
    await vi.advanceTimersByTimeAsync(20);
    const paused = client.snapshot().room.ship;
    client.setShipControl(3, 3, 2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(client.snapshot().room.ship).toEqual(paused);
    host.resumeShip();
    await vi.advanceTimersByTimeAsync(250);
    expect(client.snapshot().room.ship?.phase).toBe("playing");
    const epoch = host.snapshot().room.epoch;
    host.startShip();
    hostChannel.onmessage!({
      data: JSON.stringify({
        v: 2,
        type: "input",
        epoch,
        sequence: 999,
        input: { kind: "ship-control", control: 3, value: 1, revision: 0 },
      }),
    });
    expect(host.snapshot().room.ship?.repairs).toBe(0);
    hostChannel.onclose!();
    expect(host.snapshot().room.ship?.phase).toBe("ready");
    expect(host.snapshot().room.notice).toContain("A player left");
    host.startShip();
    host.selectGame("lights");
    await vi.advanceTimersByTimeAsync(20000);
    expect(host.snapshot().room.ship).toBeNull();
    host.dispose();
    client.dispose();
    expect(vi.getTimerCount()).toBe(0);
    vi.restoreAllMocks();
  });
  it("keeps late crew as spectators until the next launch", async () => {
    const { host } = await pair();
    const offer = await host.offer();
    host.selectGame("ship");
    host.startShip();
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
    expect(late.snapshot().room.ship?.crew).toEqual(["host", "client"]);
    late.setShipControl(0, 1, 0);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.ship?.repairs).toBe(0);
    a.channel.onclose!();
    expect(host.snapshot().room.ship?.phase).toBe("playing");
    expect(host.snapshot().players).toHaveLength(2);
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

describe("Light-cycle sessions", () => {
  it("requires two players and host authority, synchronizes turns, rejects stale epochs and sequences, and freezes on pause", async () => {
    const { host, client, hostChannel } = await pair();
    client.selectGame("cycle");
    expect(host.snapshot().room.kind).toBe("lobby");
    host.selectGame("cycle");
    client.startCycle();
    expect(host.snapshot().room.cycle?.phase).toBe("ready");
    host.startCycle();
    await vi.advanceTimersByTimeAsync(3_020);
    expect(client.snapshot().room.cycle?.phase).toBe("playing");
    client.turnCycle("up");
    await vi.advanceTimersByTimeAsync(150);
    expect(client.snapshot().room.cycle?.riders[1].direction).toBe("up");
    const epoch = host.snapshot().room.epoch;
    const inject = (epoch: number, sequence: number, direction: string) =>
      hostChannel.onmessage!({
        data: JSON.stringify({
          v: 2,
          type: "input",
          epoch,
          sequence,
          input: { kind: "cycle-turn", direction },
        }),
      });
    inject(epoch - 1, 20, "left");
    inject(epoch, 19, "left");
    expect(host.snapshot().room.cycle?.riders[1].queued).toBeNull();
    inject(epoch, 21, "left");
    expect(host.snapshot().room.cycle?.riders[1].queued).toBe("left");
    host.pauseGames();
    const paused = structuredClone(host.snapshot().room.cycle);
    expect(paused?.riders[1].queued).toBeNull();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(host.snapshot().room.cycle).toEqual(paused);
    host.resumeCycle();
    await vi.advanceTimersByTimeAsync(3_160);
    expect(host.snapshot().room.cycle?.riders[1].direction).toBe("up");
    host.startCycle();
    expect(host.snapshot().room.epoch).toBe(epoch + 1);
    expect(host.snapshot().room.cycle?.ticks).toBe(0);
    host.selectGame("lights");
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.snapshot().room.kind).toBe("lights");
    expect(client.snapshot().links[0].channel).toBe("open");
  });
  it("lets late arrivals watch, preserves play when spectators leave, and resets when a rider leaves", async () => {
    const { host, hostChannel } = await pair();
    const offer = await host.offer();
    host.selectGame("cycle");
    host.startCycle();
    const late = new Session("client", { id: "late", name: "Sam" }, () => {});
    sessions.push(late);
    await host.accept(await late.answer(offer));
    const [a, b] = Peer.all.slice(-2);
    a.channel.peer = b.channel;
    b.channel.peer = a.channel;
    b.ondatachannel!({ channel: b.channel });
    a.channel.open();
    b.channel.open();
    await vi.advanceTimersByTimeAsync(3_020);
    expect(late.snapshot().room.cycle?.riders).toHaveLength(2);
    late.turnCycle("up");
    await vi.advanceTimersByTimeAsync(20);
    expect(
      host.snapshot().room.cycle?.riders.every((r) => r.queued === null),
    ).toBe(true);
    a.channel.onclose!();
    expect(host.snapshot().room.cycle?.phase).toBe("playing");
    hostChannel.onclose!();
    expect(host.snapshot().room.cycle?.phase).toBe("ready");
    expect(host.snapshot().room.notice).toContain("A player left");
    host.startCycle();
    expect(host.snapshot().room.cycle?.phase).toBe("ready");
    await vi.advanceTimersByTimeAsync(5000);
    expect(host.snapshot().room.cycle?.ticks).toBe(0);
  });
  it("pauses instead of fast-forwarding after a stalled host and clears timers on disposal", async () => {
    const { host, client } = await pair();
    host.selectGame("cycle");
    host.startCycle();
    const clock = vi.spyOn(performance, "now").mockReturnValue(5000);
    await vi.advanceTimersByTimeAsync(25);
    expect(host.snapshot().room.cycle?.phase).toBe("paused");
    clock.mockRestore();
    host.resumeCycle();
    client.dispose();
    host.dispose();
    await vi.advanceTimersByTimeAsync(50);
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("shares the host's chosen ship duration and preserves it through pause/resume", async () => {
  const { host, client } = await pair();
  host.selectGame("ship");
  for (const minutes of [0, 4, NaN, 1.5]) host.startShip(minutes);
  expect(host.snapshot().room.ship?.phase).toBe("ready");
  client.startShip(1);
  expect(host.snapshot().room.ship?.phase).toBe("ready");
  for (const minutes of [1, 2, 3]) {
    host.startShip(minutes);
    await vi.advanceTimersByTimeAsync(20);
    expect(client.snapshot().room.ship?.duration).toBe(minutes * 60_000);
    expect(client.snapshot().room.ship?.remaining).toBe(minutes * 60_000);
    host.pauseGames();
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.snapshot().room.ship?.remaining).toBe(minutes * 60_000);
    host.resumeShip();
    await vi.advanceTimersByTimeAsync(270);
    expect(client.snapshot().room.ship?.duration).toBe(minutes * 60_000);
    expect(client.snapshot().room.ship?.remaining).toBe(minutes * 60_000 - 250);
  }
});

it("runs host-owned Sumo movement/dashes, rejects stale input, and freezes pause/resume", async () => {
  const { host, client, hostChannel } = await pair();
  host.selectGame("sumo");
  client.startSumo();
  expect(host.snapshot().room.sumo?.phase).toBe("ready");
  host.startSumo();
  const epoch = host.snapshot().room.epoch;
  await vi.advanceTimersByTimeAsync(3050);
  expect(client.snapshot().room.sumo?.phase).toBe("playing");
  client.moveBumper(-1, 0);
  await vi.advanceTimersByTimeAsync(20);
  client.dashBumper();
  await vi.advanceTimersByTimeAsync(100);
  expect(client.snapshot().room.sumo?.bumpers[1].x).toBeLessThan(0.75);
  expect(client.snapshot().room.sumo?.bumpers[1].cooldown).toBeGreaterThan(0);
  hostChannel.onmessage!({
    data: JSON.stringify({
      v: 2,
      type: "input",
      epoch: epoch - 1,
      sequence: 50,
      input: { kind: "sumo-move", x: 1, y: 0 },
    }),
  });
  hostChannel.onmessage!({
    data: JSON.stringify({
      v: 2,
      type: "input",
      epoch,
      sequence: 49,
      input: { kind: "sumo-move", x: 1, y: 0 },
    }),
  });
  expect(host.snapshot().room.sumo?.bumpers[1].dx).toBe(-1);
  await vi.advanceTimersByTimeAsync(500);
  expect(host.snapshot().room.sumo?.bumpers[1].inputFor).toBe(0);
  host.pauseGames();
  await vi.advanceTimersByTimeAsync(20);
  const paused = structuredClone(client.snapshot().room.sumo);
  await vi.advanceTimersByTimeAsync(1000);
  expect(client.snapshot().room.sumo).toEqual(paused);
  expect(paused?.bumpers[1].vx).toBe(0);
  host.resumeSumo();
  await vi.advanceTimersByTimeAsync(3050);
  expect(client.snapshot().room.sumo?.phase).toBe("playing");
  expect(client.snapshot().room.sumo?.bumpers[1].dx).toBe(0);
  host.startSumo();
  expect(host.snapshot().room.epoch).toBe(epoch + 1);
  expect(host.snapshot().room.sumo?.ticks).toBe(0);
  host.selectGame("lights");
  await vi.advanceTimersByTimeAsync(20);
  expect(client.snapshot().room.kind).toBe("lights");
  client.dispose();
  host.dispose();
  await vi.advanceTimersByTimeAsync(20);
  expect(vi.getTimerCount()).toBe(0);
});

it("Sumo spectators cannot move, spectator departures preserve play and participants leaving reset", async () => {
  const { host, hostChannel } = await pair();
  const offer = await host.offer();
  host.selectGame("sumo");
  host.startSumo();
  const late = new Session("client", { id: "late", name: "Sam" }, () => {});
  sessions.push(late);
  await host.accept(await late.answer(offer));
  const [a, b] = Peer.all.slice(-2);
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(3_050);
  expect(late.snapshot().room.sumo?.bumpers).toHaveLength(2);
  late.moveBumper(1, 0);
  late.dashBumper();
  await vi.advanceTimersByTimeAsync(20);
  expect(
    host.snapshot().room.sumo?.bumpers.every((r) => r.inputFor === 0),
  ).toBe(true);
  a.channel.onclose!();
  expect(host.snapshot().room.sumo?.phase).toBe("playing");
  hostChannel.onclose!();
  expect(host.snapshot().room.sumo?.phase).toBe("ready");
  expect(host.snapshot().room.notice).toContain("A player left");
  host.startSumo();
  expect(host.snapshot().room.sumo?.phase).toBe("ready");
  await vi.advanceTimersByTimeAsync(5000);
  expect(host.snapshot().room.sumo?.ticks).toBe(0);
});

it("Sumo pauses on a scheduling stall rather than fast-forwarding", async () => {
  const { host } = await pair();
  host.selectGame("sumo");
  host.startSumo();
  const clock = vi.spyOn(performance, "now").mockReturnValue(5000);
  await vi.advanceTimersByTimeAsync(25);
  expect(host.snapshot().room.sumo?.phase).toBe("paused");
  expect(host.snapshot().room.sumo?.ticks).toBe(0);
  clock.mockRestore();
});

it("Bakery protects hands, rejects stale/duplicate picks, pauses reveals and rematches", async () => {
  const { host, client, hostChannel } = await pair();
  const sent = vi.spyOn(hostChannel, "send");
  host.selectGame("bakery");
  host.startBakery();
  await vi.advanceTimersByTimeAsync(20);
  const view = client.snapshot().room.bakery!;
  expect(view.bakers.find((b) => b.id === "host")!.hand).toBeNull();
  expect(view.bakers.find((b) => b.id === "client")!.hand).toHaveLength(6);
  expect(host.snapshot().room.bakery!.bakers[1].hand).toBeNull();
  client.startBakery();
  client.pickTreat(0, 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.bakery!.bakers[1].locked).toBe(true);
  expect(host.snapshot().room.bakery!.bakers[1].choice).toBeNull();
  const packet = sent.mock.calls
    .map(([raw]) => JSON.parse(raw))
    .filter((m) => m.type === "state")
    .at(-1);
  expect(
    packet.room.bakery.bakers.find((b: { id: string }) => b.id === "host").hand,
  ).toBeNull();
  expect(
    packet.room.bakery.bakers.find((b: { id: string }) => b.id === "client")
      .hand,
  ).toHaveLength(6);
  expect(
    packet.room.bakery.bakers.every(
      (b: { choice: unknown }) => b.choice === null,
    ),
  ).toBe(true);
  client.pickTreat(1, 1, 1);
  host.pickTreat(0, 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(client.snapshot().room.bakery!.phase).toBe("reveal");
  host.pauseGames();
  await vi.advanceTimersByTimeAsync(3000);
  expect(client.snapshot().room.bakery!.phase).toBe("paused");
  host.resumeBakery();
  await vi.advanceTimersByTimeAsync(1820);
  expect(client.snapshot().room.bakery!.pick).toBe(2);
  client.pickTreat(0, 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.bakery!.bakers[1].locked).toBe(false);
  host.pauseGames();
  client.pickTreat(0, 1, 2);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.bakery!.bakers[1].locked).toBe(false);
  host.resumeBakery();
  for (let round = 1; round <= 2; round++) {
    for (let pick = round === 1 ? 2 : 1; pick <= 6; pick++) {
      host.pickTreat(0, round, pick);
      client.pickTreat(0, round, pick);
      await vi.advanceTimersByTimeAsync(1840);
    }
    if (round === 1) {
      host.nextBakeryRound();
      await vi.advanceTimersByTimeAsync(20);
    }
  }
  expect(client.snapshot().room.bakery!.phase).toBe("finished");
  host.startBakery();
  await vi.advanceTimersByTimeAsync(20);
  expect(client.snapshot().room.bakery!.pick).toBe(1);
  expect(
    client.snapshot().room.bakery!.bakers.every((b) => b.banked === 0),
  ).toBe(true);
  client.dispose();
  // Mock channels do not automatically propagate close events.
  Peer.all[0].channel.onclose?.();
  expect(host.snapshot().room.bakery!.phase).toBe("ready");
});

it("Treasure requires two players and host authority, hides future cards/choices, preserves paused locks and rejects stale inputs", async () => {
  const solo = new Session("host", { id: "solo", name: "Solo" }, () => {});
  sessions.push(solo);
  solo.selectGame("treasure");
  solo.startTreasure();
  expect(solo.snapshot().room.treasure!.phase).toBe("ready");
  const { host, client, hostChannel, clientChannel } = await pair();
  const sent = vi.spyOn(hostChannel, "send");
  host.selectGame("treasure");
  host.startTreasure();
  await vi.advanceTimersByTimeAsync(3020);
  const view = () => host.snapshot().room.treasure!;
  const epoch = host.snapshot().room.epoch;
  client.startTreasure();
  expect(client.snapshot().room.epoch).toBe(epoch);
  client.chooseTreasure("shield", 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(view().divers[1].locked).toBe(true);
  expect(view().divers[1].choice).toBeNull();
  expect(view().deck).toBeNull();
  for (const [raw] of sent.mock.calls) {
    const m = JSON.parse(raw);
    if (m.type === "state") {
      expect(m.room.treasure.deck).toBeNull();
      expect(
        m.room.treasure.divers.every(
          (d: { choice: unknown }) => d.choice === null,
        ),
      ).toBe(true);
    }
  }
  client.chooseTreasure("return", 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  host.pauseGames();
  const paused = view();
  await vi.advanceTimersByTimeAsync(15000);
  expect(view()).toEqual(paused);
  client.resumeTreasure();
  expect(view().phase).toBe("paused");
  host.resumeTreasure();
  await vi.advanceTimersByTimeAsync(3020);
  expect(view().phase).toBe("choosing");
  expect(view().divers[1].locked).toBe(true);
  host.chooseTreasure("return", 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(view().phase).toBe("reveal");
  expect(view().divers[1].shield).toBe(false);
  await vi.advanceTimersByTimeAsync(2100);
  const before = structuredClone(view());
  const inject = (
    epoch: number,
    sequence: number,
    dive: number,
    door: number,
  ) =>
    clientChannel.send(
      JSON.stringify({
        v: 2,
        type: "input",
        epoch,
        sequence,
        input: { kind: "dive-choice", dive, door, choice: "return" },
      }),
    );
  inject(epoch - 1, 100, 1, 2);
  inject(epoch, 101, 1, 1);
  inject(epoch, 100, 1, 2);
  await vi.advanceTimersByTimeAsync(20);
  expect(view().divers).toEqual(before.divers);
  host.selectGame("lights");
  await vi.advanceTimersByTimeAsync(20000);
  expect(host.snapshot().room.kind).toBe("lights");
});

it("Treasure timeouts automatically finish, rematch resets scores/epoch, and disposal clears all timers", async () => {
  const { host, client } = await pair();
  host.selectGame("treasure");
  host.startTreasure();
  await vi.advanceTimersByTimeAsync(46000);
  expect(client.snapshot().room.treasure!.phase).toBe("finished");
  expect(
    client
      .snapshot()
      .room.treasure!.divers.every((d) => d.scores.every((n) => n === 0)),
  ).toBe(true);
  const epoch = host.snapshot().room.epoch;
  host.startTreasure();
  expect(host.snapshot().room.epoch).toBe(epoch + 1);
  expect(host.snapshot().room.treasure!.phase).toBe("countdown");
  host.dispose();
  client.dispose();
  await vi.advanceTimersByTimeAsync(20);
  expect(vi.getTimerCount()).toBe(0);
});

it("Treasure late arrivals spectate; spectator loss preserves play, participant loss resets, stalls pause", async () => {
  const { host } = await pair();
  host.selectGame("treasure");
  host.startTreasure();
  await vi.advanceTimersByTimeAsync(3020);
  const spectator = new Session(
    "client",
    { id: "watch", name: "Watcher" },
    () => {},
  );
  sessions.push(spectator);
  const offer = await host.offer();
  const answer = await spectator.answer(offer);
  await host.accept(answer);
  const a = Peer.all[2],
    b = Peer.all[3];
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  spectator.chooseTreasure("explore", 1, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.treasure!.divers).toHaveLength(2);
  expect(spectator.snapshot().room.treasure!.deck).toBeNull();
  a.channel.onclose?.();
  expect(host.snapshot().room.treasure!.phase).toBe("choosing");
  const clock = vi
    .spyOn(performance, "now")
    .mockReturnValue(performance.now() + 1000);
  await vi.advanceTimersByTimeAsync(100);
  expect(host.snapshot().room.treasure!.phase).toBe("paused");
  clock.mockRestore();
  Peer.all[0].channel.onclose?.();
  expect(host.snapshot().room.treasure!.phase).toBe("ready");
});

it("Golf requires host/two players, hides locks and conditions until launch, preserves pause, rejects stale inputs, finishes and rematches", async () => {
  const solo = new Session("host", { id: "solo", name: "Solo" }, () => {});
  sessions.push(solo);
  solo.selectGame("minigolf");
  solo.startGolf();
  expect(solo.snapshot().room.minigolf!.phase).toBe("ready");
  const { host, client, hostChannel, clientChannel } = await pair();
  const sent = vi.spyOn(hostChannel, "send");
  host.selectGame("minigolf");
  host.startGolf();
  await vi.advanceTimersByTimeAsync(7020);
  const view = () => host.snapshot().room.minigolf!;
  const epoch = host.snapshot().room.epoch;
  client.startGolf();
  expect(client.snapshot().room.epoch).toBe(epoch);
  client.shootGolf(1, 0, 0.6);
  await vi.advanceTimersByTimeAsync(20);
  expect(view().balls[1].locked).toBe(true);
  expect(view().balls[1].shot).toBeNull();
  for (const [raw] of sent.mock.calls) {
    const m = JSON.parse(raw);
    if (m.type === "state") {
      expect(m.room.minigolf.conditions).toBeNull();
      expect(
        m.room.minigolf.balls.every((b: { shot: unknown }) => b.shot === null),
      ).toBe(true);
    }
  }
  host.pauseGames();
  const paused = structuredClone(view());
  await vi.advanceTimersByTimeAsync(10000);
  expect(view()).toEqual(paused);
  client.resumeGolf();
  expect(view().phase).toBe("paused");
  host.resumeGolf();
  await vi.advanceTimersByTimeAsync(3020);
  expect(view().phase).toBe("aiming");
  expect(view().balls[1].locked).toBe(true);
  client.shootGolf(1, 90, 1);
  host.shootGolf(1, 0, 0.6);
  await vi.advanceTimersByTimeAsync(20020);
  expect(view().phase).toBe("rolling");
  expect(view().balls[1].shot).toEqual({ angle: 0, power: 0.6 });
  await vi.advanceTimersByTimeAsync(14000);
  expect(view().hole).toBe(2);
  const inject = (e: number, sequence: number, hole: number) =>
    clientChannel.send(
      JSON.stringify({
        v: 2,
        type: "input",
        epoch: e,
        sequence,
        input: { kind: "golf-shot", hole, angle: 0, power: 0.6 },
      }),
    );
  inject(epoch - 1, 100, 2);
  inject(epoch, 101, 1);
  inject(epoch, 100, 2);
  await vi.advanceTimersByTimeAsync(20);
  expect(view().balls[1].locked).toBe(false);
  await vi.advanceTimersByTimeAsync(160000);
  expect(client.snapshot().room.minigolf!.phase).toBe("finished");
  host.startGolf();
  expect(host.snapshot().room.epoch).toBe(epoch + 1);
  expect(view().balls.every((b) => b.scores.every((n) => n === 0))).toBe(true);
  host.selectGame("lights");
  await vi.advanceTimersByTimeAsync(20000);
  expect(client.snapshot().room.kind).toBe("lights");
  host.dispose();
  client.dispose();
  await vi.advanceTimersByTimeAsync(20);
  expect(vi.getTimerCount()).toBe(0);
});

it("Golf late arrivals watch, spectator disconnect preserves play, host stalls pause and participant loss resets", async () => {
  const { host } = await pair();
  host.selectGame("minigolf");
  host.startGolf();
  await vi.advanceTimersByTimeAsync(7020);
  const spectator = new Session(
    "client",
    { id: "watch", name: "Watcher" },
    () => {},
  );
  sessions.push(spectator);
  const offer = await host.offer();
  const answer = await spectator.answer(offer);
  await host.accept(answer);
  const a = Peer.all[2],
    b = Peer.all[3];
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  spectator.shootGolf(1, 0, 1);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.minigolf!.balls).toHaveLength(2);
  a.channel.onclose?.();
  expect(host.snapshot().room.minigolf!.phase).toBe("aiming");
  const clock = vi
    .spyOn(performance, "now")
    .mockReturnValue(performance.now() + 1000);
  await vi.advanceTimersByTimeAsync(50);
  expect(host.snapshot().room.minigolf!.phase).toBe("paused");
  clock.mockRestore();
  Peer.all[0].channel.onclose?.();
  expect(host.snapshot().room.minigolf!.phase).toBe("ready");
});

it("Picnic requires host/two players, keeps placements private, preserves pause, rejects stale actions, finishes and rematches", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const solo = new Session("host", { id: "solo", name: "Solo" }, () => {});
  sessions.push(solo);
  solo.selectGame("picnic");
  solo.startPicnic();
  expect(solo.snapshot().room.picnic!.phase).toBe("ready");
  const { host, client, hostChannel, clientChannel } = await pair();
  const sent = vi.spyOn(hostChannel, "send");
  host.selectGame("picnic");
  host.startPicnic();
  await vi.advanceTimersByTimeAsync(3020);
  const view = () => host.snapshot().room.picnic!;
  const epoch = host.snapshot().room.epoch;
  client.startPicnic();
  expect(host.snapshot().room.epoch).toBe(epoch);
  client.placePicnic(1, { option: 0, x: 0, y: 0, rotation: 0 });
  await vi.advanceTimersByTimeAsync(20);
  expect(view().picnickers[1].locked).toBe(true);
  expect(view().picnickers[1].board).toBe("0".repeat(36));
  for (const [raw] of sent.mock.calls) {
    const m = JSON.parse(raw);
    if (m.type === "state") {
      expect(m.room.picnic.bags).toBeNull();
      expect(
        m.room.picnic.picnickers.every(
          (p: { placement: unknown }) => p.placement === null,
        ),
      ).toBe(true);
    }
  }
  client.placePicnic(1, null);
  await vi.advanceTimersByTimeAsync(20);
  host.pauseGames();
  const paused = structuredClone(view());
  await vi.advanceTimersByTimeAsync(15000);
  expect(view()).toEqual(paused);
  client.resumePicnic();
  expect(view().phase).toBe("paused");
  host.resumePicnic();
  await vi.advanceTimersByTimeAsync(3020);
  expect(view().picnickers[1].locked).toBe(true);
  host.placePicnic(1, null);
  await vi.advanceTimersByTimeAsync(20);
  expect(view().phase).toBe("reveal");
  expect(view().picnickers[1].board[0]).not.toBe("0");
  host.pauseGames();
  const reveal = structuredClone(view());
  await vi.advanceTimersByTimeAsync(5000);
  expect(view()).toEqual(reveal);
  host.resumePicnic();
  await vi.advanceTimersByTimeAsync(6100);
  expect(view().round).toBe(2);
  for (const [e, sequence, round] of [
    [epoch - 1, 100, 2],
    [epoch, 101, 1],
    [epoch, 100, 2],
  ])
    clientChannel.send(
      JSON.stringify({
        v: 2,
        type: "input",
        epoch: e,
        sequence,
        input: { kind: "picnic-place", round, placement: null },
      }),
    );
  await vi.advanceTimersByTimeAsync(20);
  expect(view().picnickers.every((p) => !p.locked)).toBe(true);
  await vi.advanceTimersByTimeAsync(165000);
  expect(view().phase).toBe("finished");
  host.startPicnic();
  expect(host.snapshot().room.epoch).toBe(epoch + 1);
  expect(view().picnickers.every((p) => p.board === "0".repeat(36))).toBe(true);
  host.selectGame("lights");
  await vi.advanceTimersByTimeAsync(20000);
  expect(host.snapshot().room.kind).toBe("lights");
  host.dispose();
  client.dispose();
  solo.dispose();
  await vi.advanceTimersByTimeAsync(20);
  expect(vi.getTimerCount()).toBe(0);
});
it("Picnic spectators cannot place; spectator departures preserve play, stalls pause and participant loss resets", async () => {
  const { host } = await pair();
  host.selectGame("picnic");
  host.startPicnic();
  await vi.advanceTimersByTimeAsync(3020);
  const spectator = new Session(
    "client",
    { id: "watch", name: "Watcher" },
    () => {},
  );
  sessions.push(spectator);
  const offer = await host.offer();
  await host.accept(await spectator.answer(offer));
  const [a, b] = Peer.all.slice(-2);
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  spectator.placePicnic(1, null);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.picnic!.picnickers).toHaveLength(2);
  expect(host.snapshot().room.picnic!.picnickers.every((p) => !p.locked)).toBe(
    true,
  );
  a.channel.onclose?.();
  expect(host.snapshot().room.picnic!.phase).toBe("placing");
  const clock = vi
    .spyOn(performance, "now")
    .mockReturnValue(performance.now() + 1000);
  await vi.advanceTimersByTimeAsync(100);
  expect(host.snapshot().room.picnic!.phase).toBe("paused");
  clock.mockRestore();
  Peer.all[0].channel.onclose?.();
  expect(host.snapshot().room.picnic!.phase).toBe("ready");
});

describe("Light Seek session", () => {
  const layout = [
    { piece: 0, x: 0, y: 0, rotation: 0 },
    { piece: 1, x: 0, y: 1, rotation: 0 },
    { piece: 2, x: 0, y: 3, rotation: 0 },
    { piece: 3, x: 0, y: 4, rotation: 0 },
    { piece: 4, x: 0, y: 6, rotation: 0 },
  ];
  it("pairs, locks privately, rejects stale epochs/sequence/turns, pauses, rematches, switches and disposes", async () => {
    const { host, client, clientChannel } = await pair();
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      client.selectGame("seek");
      expect(host.snapshot().room.kind).toBe("lobby");
      host.selectGame("seek");
      client.startSeek();
      expect(host.snapshot().room.seek?.phase).toBe("ready");
      host.startSeek();
      await vi.advanceTimersByTimeAsync(20);
      const epoch = host.snapshot().room.epoch;
      host.readySeek(layout);
      await vi.advanceTimersByTimeAsync(20);
      expect(client.snapshot().room.seek?.seats[0].layout).toBeNull();
      expect(host.snapshot().room.seek?.seats[0].layout).toEqual(layout);
      await vi.advanceTimersByTimeAsync(100000);
      expect(host.snapshot().room.seek?.phase).toBe("setup");
      client.readySeek(layout);
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.seek?.seats[1].layout).toBeNull();
      host.pauseGames();
      await vi.advanceTimersByTimeAsync(10000);
      expect(host.snapshot().room.seek?.phase).toBe("paused");
      host.resumeSeek();
      await vi.advanceTimersByTimeAsync(6020);
      expect(client.snapshot().room.seek?.phase).toBe("playing");
      client.guessSeek(1, 0);
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.seek?.turn).toBe(1);
      host.guessSeek(1, 0);
      await vi.advanceTimersByTimeAsync(20);
      expect(client.snapshot().room.seek?.last?.piece).toBeNull();
      clientChannel.send(
        JSON.stringify({
          v: 2,
          type: "input",
          epoch: epoch - 1,
          sequence: 1,
          input: { kind: "seek-guess", turn: 2, cell: 99 },
        }),
      );
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.seek?.turn).toBe(2);
      client.guessSeek(2, 99);
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.seek?.turn).toBe(3);
      clientChannel.send(
        JSON.stringify({
          v: 2,
          type: "input",
          epoch,
          sequence: 1,
          input: { kind: "seek-guess", turn: 3, cell: 98 },
        }),
      );
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.seek?.turn).toBe(3);
      host.guessSeek(3, 0);
      expect(host.snapshot().room.seek?.turn).toBe(3);
      const { placedSeekCells } = await import("../games/seek");
      for (const [i, c] of layout.flatMap(placedSeekCells).slice(1).entries()) {
        host.guessSeek(host.snapshot().room.seek!.turn, c);
        await vi.advanceTimersByTimeAsync(20);
        if (i < 17) {
          client.guessSeek(client.snapshot().room.seek!.turn, 98 - i);
          await vi.advanceTimersByTimeAsync(20);
        }
      }
      expect(client.snapshot().room.seek?.phase).toBe("finished");
      expect(
        client.snapshot().room.seek?.seats.every((s) => s.layout?.length === 5),
      ).toBe(true);
      host.startSeek();
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.epoch).toBeGreaterThan(epoch);
      expect(client.snapshot().room.seek?.seats.every((s) => !s.ready)).toBe(
        true,
      );
      host.selectGame("lights");
      await vi.advanceTimersByTimeAsync(20);
      client.toggle(0);
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().grid.cells[0]).toBe(true);
      host.dispose();
      client.dispose();
      await vi.advanceTimersByTimeAsync(20);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      random.mockRestore();
    }
  });
  it("requires exactly two and resets on participant loss", async () => {
    const { host, client, hostChannel } = await pair();
    host.selectGame("seek");
    host.startSeek();
    host.readySeek(layout);
    hostChannel.onclose?.();
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.seek?.phase).toBe("ready");
    host.startSeek();
    expect(host.snapshot().room.seek?.phase).toBe("ready");
    client.dispose();
  });
});

it("Light Seek spectators cannot ready or guess, spectator loss preserves play, and stalls pause countdowns", async () => {
  const { host } = await pair();
  host.selectGame("seek");
  host.startSeek();
  const spectator = new Session(
    "client",
    { id: "watch", name: "Watcher" },
    () => {},
  );
  sessions.push(spectator);
  const offer = await host.offer();
  await host.accept(await spectator.answer(offer));
  const [a, b] = Peer.all.slice(-2);
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  expect(
    spectator.snapshot().room.seek?.seats.every((s) => s.layout === null),
  ).toBe(true);
  spectator.guessSeek(1, 0);
  spectator.readySeek([
    { piece: 0, x: 0, y: 0, rotation: 0 },
    { piece: 1, x: 0, y: 1, rotation: 0 },
    { piece: 2, x: 0, y: 3, rotation: 0 },
    { piece: 3, x: 0, y: 4, rotation: 0 },
    { piece: 4, x: 0, y: 6, rotation: 0 },
  ]);
  await vi.advanceTimersByTimeAsync(20);
  expect(host.snapshot().room.seek?.seats.every((s) => !s.ready)).toBe(true);
  a.channel.onclose?.();
  expect(host.snapshot().room.seek?.phase).toBe("setup");
  host.pauseGames();
  host.resumeSeek();
  const clock = vi
    .spyOn(performance, "now")
    .mockReturnValue(performance.now() + 1000);
  await vi.advanceTimersByTimeAsync(100);
  expect(host.snapshot().room.seek?.phase).toBe("paused");
  clock.mockRestore();
  host.resumeSeek();
  await vi.advanceTimersByTimeAsync(3020);
  expect(host.snapshot().room.seek?.phase).toBe("setup");
  // Exactly-two guard also applies when extra devices are connected before Start.
  host.selectGame("seek");
  const extra = new Session("client", { id: "extra", name: "Extra" }, () => {});
  sessions.push(extra);
  const invite = await host.offer();
  await host.accept(await extra.answer(invite));
  const [c, d] = Peer.all.slice(-2);
  c.channel.peer = d.channel;
  d.channel.peer = c.channel;
  d.ondatachannel!({ channel: d.channel });
  c.channel.open();
  d.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  host.startSeek();
  expect(host.snapshot().room.seek?.phase).toBe("ready");
});

async function glowJoin(host: Session, id: string) {
  const client = new Session("client", { id, name: id }, () => {});
  sessions.push(client);
  const invite = await host.offer();
  await host.accept(await client.answer(invite));
  const [a, b] = Peer.all.slice(-2);
  a.channel.peer = b.channel;
  b.channel.peer = a.channel;
  b.ondatachannel!({ channel: b.channel });
  a.channel.open();
  b.channel.open();
  await vi.advanceTimersByTimeAsync(20);
  return { client, a, b };
}
describe("Glow room", () => {
  it("enforces host settings, secret host/client/spectator views, locks, epochs, sequences and complete scoring", async () => {
    const { host, client, clientChannel } = await pair();
    host.selectGame("glow");
    host.startGlow();
    expect(host.snapshot().room.glow?.phase).toBe("ready");
    const { client: third } = await glowJoin(host, "third");
    const original = client
      .snapshot()
      .room.glow!.seats.find((s) => s.id === "client")!.color;
    const freeColor = glowColors.findIndex(
      (_, color) =>
        !host.snapshot().room.glow!.seats.some((s) => s.color === color),
    );
    expect(freeColor).toBeGreaterThanOrEqual(0);
    host.claimGlowColor(freeColor);
    client.claimGlowColor(freeColor);
    await vi.advanceTimersByTimeAsync(20);
    expect(
      host.snapshot().room.glow!.seats.find((s) => s.id === "client")!.color,
    ).toBe(original);
    expect(
      client.snapshot().room.glow!.seats.find((s) => s.id === "host")!.color,
    ).toBe(freeColor);
    client.setGlowRounds(5);
    expect(host.snapshot().room.glow?.rounds).toBe(8);
    host.setGlowRounds(5);
    await vi.advanceTimersByTimeAsync(20);
    host.startGlow();
    client.startGlow();
    host.setGlowRounds(12);
    await vi.advanceTimersByTimeAsync(3020);
    expect(host.snapshot().room.glow?.rounds).toBe(5);
    const epoch = host.snapshot().room.epoch;
    host.lockGlowPicks(1, [0, 1, 2]);
    await vi.advanceTimersByTimeAsync(20);
    expect(client.snapshot().room.glow?.seats[0].picks).toBeNull();
    client.lockGlowPicks(1, [0, 3, 4]);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.glow?.seats[1].picks).toBeNull();
    expect(client.snapshot().room.glow?.seats[1].picks).toEqual([0, 3, 4]);
    host.pauseGames();
    host.resumeGlow();
    await vi.advanceTimersByTimeAsync(3020);
    expect(client.snapshot().room.glow?.seats[1].locked).toBe(true);
    await vi.advanceTimersByTimeAsync(100000);
    expect(host.snapshot().room.glow?.phase).toBe("choosing");
    third.lockGlowPicks(1, [0, 4, 5]);
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.glow?.seats.map((s) => s.scores)).toEqual([
      [2],
      [1],
      [1],
    ]);
    host.pauseGames();
    await vi.advanceTimersByTimeAsync(50000);
    host.resumeGlow();
    await vi.advanceTimersByTimeAsync(3020);
    expect(host.snapshot().room.glow?.phase).toBe("reveal");
    await vi.advanceTimersByTimeAsync(6000);
    clientChannel.send(
      JSON.stringify({
        v: 2,
        type: "input",
        epoch: epoch - 1,
        sequence: 100,
        input: { kind: "glow-picks", round: 2, picks: [0, 1, 2] },
      }),
    );
    clientChannel.send(
      JSON.stringify({
        v: 2,
        type: "input",
        epoch,
        sequence: 99,
        input: { kind: "glow-picks", round: 2, picks: [0, 1, 2] },
      }),
    );
    await vi.advanceTimersByTimeAsync(20);
    expect(host.snapshot().room.glow?.seats[1].locked).toBe(false);
    // Subsequent genuine messages need a newer sequence after the injected probes.
    for (let r = 2; r <= 5; r++) {
      host.lockGlowPicks(r, [0, 1, 2]);
      clientChannel.send(
        JSON.stringify({
          v: 2,
          type: "input",
          epoch,
          sequence: 100 + r,
          input: { kind: "glow-picks", round: r, picks: [0, 3, 4] },
        }),
      );
      third.lockGlowPicks(r, [0, 4, 5]);
      await vi.advanceTimersByTimeAsync(20);
      expect(host.snapshot().room.glow?.phase).toBe("reveal");
      await vi.advanceTimersByTimeAsync(6000);
    }
    expect(client.snapshot().room.glow?.phase).toBe("finished");
    expect(
      host
        .snapshot()
        .room.glow?.seats.map((s) => s.scores.reduce((a, b) => a + b, 0)),
    ).toEqual([10, 5, 5]);
    const colors = host.snapshot().room.glow?.seats.map((s) => s.color);
    host.startGlow();
    expect(host.snapshot().room.epoch).toBe(epoch + 1);
    expect(host.snapshot().room.glow?.seats.map((s) => s.color)).toEqual(
      colors,
    );
    expect(
      host
        .snapshot()
        .room.glow?.seats.every((s) => !s.scores.length && s.picks === null),
    ).toBe(true);
  });
  it("freezes late spectators, resets on participant loss, retains colors and cleans timers on stop/switch/disposal", async () => {
    const { host } = await pair();
    const third = await glowJoin(host, "third");
    host.selectGame("glow");
    host.startGlow();
    await vi.advanceTimersByTimeAsync(3020);
    host.lockGlowPicks(1, [0, 1, 2]);
    const late = await glowJoin(host, "late");
    expect(late.client.snapshot().room.glow?.seats).toHaveLength(3);
    expect(
      late.client.snapshot().room.glow?.seats.every((s) => s.picks === null),
    ).toBe(true);
    late.client.lockGlowPicks(1, [0, 1, 2]);
    late.client.claimGlowColor(11);
    await vi.advanceTimersByTimeAsync(20);
    late.a.channel.onclose?.();
    expect(host.snapshot().room.glow?.phase).toBe("choosing");
    const colors = host
      .snapshot()
      .room.glow?.seats.filter((s) => s.id !== "third")
      .map((s) => s.color);
    third.a.channel.onclose?.();
    expect(host.snapshot().room.glow?.phase).toBe("ready");
    expect(host.snapshot().room.glow?.seats.map((s) => s.color)).toEqual(
      colors,
    );
    expect(host.snapshot().room.glow?.seats.every((s) => !s.locked)).toBe(true);
    await glowJoin(host, "replacement");
    host.startGlow();
    const clock = vi
      .spyOn(performance, "now")
      .mockReturnValue(performance.now() + 1000);
    await vi.advanceTimersByTimeAsync(100);
    expect(host.snapshot().room.glow?.phase).toBe("paused");
    clock.mockRestore();
    host.resumeGlow();
    host.selectGame("glow");
    await vi.advanceTimersByTimeAsync(10000);
    expect(host.snapshot().room.glow?.phase).toBe("ready");
    host.startGlow();
    host.selectGame("lights");
    await vi.advanceTimersByTimeAsync(10000);
    expect(host.snapshot().room.glow).toBeNull();
    for (const session of sessions) session.dispose();
    await vi.advanceTimersByTimeAsync(20);
    expect(vi.getTimerCount()).toBe(0);
  });
});
