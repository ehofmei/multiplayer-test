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
      data: JSON.stringify({ v: 1, type: "pong", id: 1 }),
    });
    expect(client.snapshot().links[0].rtt).toBeUndefined();
    hostChannel.ignorePongs = false;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(client.snapshot().links[0].rtt?.current).toBe(20);
  });
});
