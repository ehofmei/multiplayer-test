import { afterEach, describe, expect, it, vi } from "vitest";
import { Sounds } from "./sounds";
class Oscillator {
  type = "sine";
  frequency = {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}
class Context {
  static instances: Context[] = [];
  state = "suspended";
  currentTime = 0;
  destination = {};
  voices: Oscillator[] = [];
  peaks: number[] = [];
  constructor() {
    Context.instances.push(this);
  }
  resume = vi.fn(async () => {
    this.state = "running";
  });
  suspend = vi.fn(async () => {
    this.state = "suspended";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createOscillator() {
    const voice = new Oscillator();
    this.voices.push(voice);
    return voice;
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn((peak: number) => this.peaks.push(peak)),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
}
afterEach(() => {
  vi.unstubAllGlobals();
  Context.instances = [];
});
describe("sound lifecycle", () => {
  it("keeps Breakout rallies quiet and admits team outcomes through saturated contacts", async () => {
    vi.stubGlobal("window", { AudioContext: Context });
    const sounds = new Sounds();
    sounds.setEnabled(true);
    await sounds.unlock();
    const c = Context.instances[0];
    for (let i = 0; i < 4; i++) {
      c.currentTime += 0.11;
      sounds.play("breakout-break", "breakout");
      sounds.play("paddle", "breakout"); // Same observation window stays quiet.
    }
    expect(c.voices).toHaveLength(8);
    expect(c.peaks).toEqual(Array(8).fill(0.035));
    const contacts = [...c.voices];
    sounds.play("breakout-clear", "breakout");
    expect(c.voices.slice(-3).map((v) => v.frequency.value)).toEqual([
      660, 880, 1320,
    ]);
    expect(
      contacts.every((v) =>
        v.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    expect(c.peaks.slice(-3)).toEqual([0.055, 0.055, 0.055]);
    c.currentTime += 0.11;
    sounds.play("breakout-hit", "breakout");
    expect(c.voices).toHaveLength(11); // No contact over the clear phrase.
    sounds.play("miss", "breakout");
    expect(c.voices).toHaveLength(12);
    sounds.play("finish", "breakout");
    expect(c.voices).toHaveLength(14);
    sounds.setEnabled(false);
    expect(
      c.voices.every((v) =>
        v.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    sounds.play("breakout-clear", "breakout");
    expect(c.voices).toHaveLength(14);
    sounds.dispose();
  });
  it("keeps distinct Ship cues quiet, brief and within the voice limit", async () => {
    vi.stubGlobal("window", { AudioContext: Context });
    const sounds = new Sounds();
    sounds.setEnabled(true);
    await sounds.unlock();
    const c = Context.instances[0];
    for (const cue of [
      "ship-command",
      "ship-wrong",
      "ship-missed",
      "ship-streak",
      "ship-success",
    ] as const)
      sounds.play(cue);
    expect(c.voices.map((v) => v.frequency.value)).toEqual([
      700, 310, 240, 210, 520, 780, 620, 830,
    ]);
    expect(c.peaks).toEqual(Array(8).fill(0.035));
    sounds.play("ship-command");
    expect(c.voices).toHaveLength(8);
    sounds.setEnabled(false);
    expect(
      c.voices.every((v) =>
        v.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    sounds.dispose();
  });
  it("sweeps the optional dash swoosh and never plays it before unlocking", async () => {
    vi.stubGlobal("window", { AudioContext: Context });
    const sounds = new Sounds();
    sounds.play("sumo-dash");
    expect(Context.instances).toHaveLength(0);
    sounds.setEnabled(true);
    await sounds.unlock();
    sounds.play("sumo-dash");
    const voice = Context.instances[0].voices[0];
    expect(voice.type).toBe("triangle");
    expect(voice.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      100,
      0.18,
    );
    sounds.dispose();
  });
  it("plays the four Golf timbres within the shared voice limit and silences them on mute", async () => {
    vi.stubGlobal("window", { AudioContext: Context });
    const sounds = new Sounds();
    sounds.play("golf-tap");
    expect(Context.instances).toHaveLength(0);
    sounds.setEnabled(true);
    await sounds.unlock();
    const c = Context.instances[0];
    for (const cue of [
      "golf-tap",
      "golf-knock",
      "golf-spring",
      "golf-meteor",
    ] as const)
      sounds.play(cue);
    expect(c.voices).toHaveLength(7);
    expect(c.voices.map((v) => v.frequency.value)).toEqual([
      460, 230, 420, 760, 1150, 90, 145,
    ]);
    sounds.setEnabled(false);
    expect(
      c.voices.every((v) =>
        v.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    sounds.dispose();
  });
  it("lets Golf rewards interrupt contact voices and throttles repeated knocks without queueing", async () => {
    vi.stubGlobal("window", { AudioContext: Context });
    const sounds = new Sounds();
    sounds.setEnabled(true);
    await sounds.unlock();
    const c = Context.instances[0];
    sounds.play("golf-spring");
    sounds.play("golf-meteor");
    sounds.play("golf-knock");
    const contacts = [...c.voices];
    c.currentTime = 0.1;
    sounds.play("golf-knock");
    expect(c.voices).toHaveLength(6);
    sounds.play("golf-cup");
    expect(c.voices).toHaveLength(9);
    expect(
      contacts.every((v) =>
        v.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    expect(c.voices.slice(-3).map((v) => v.frequency.value)).toEqual([
      280, 660, 880,
    ]);
    sounds.play("win");
    expect(c.voices).toHaveLength(12);
    expect(c.peaks.slice(0, 6).every((p) => p <= 0.055)).toBe(true);
    sounds.dispose();
  });
  it("starts silent, requires unlocking, bounds rapid audio, and stops on mute/background/dispose", async () => {
    vi.stubGlobal("window", { AudioContext: Context });
    const sounds = new Sounds();
    sounds.play("win");
    expect(await sounds.unlock()).toBe(false);
    expect(Context.instances).toHaveLength(0);
    sounds.setEnabled(true);
    sounds.play("on");
    expect(Context.instances).toHaveLength(0);
    expect(await sounds.unlock()).toBe(true);
    const c = Context.instances[0];
    expect(c.resume).toHaveBeenCalledOnce();
    sounds.play("win");
    sounds.play("win");
    expect(c.voices).toHaveLength(3);
    for (let i = 0; i < 20; i++) {
      c.currentTime += 0.1;
      sounds.play("win");
    }
    expect(c.voices).toHaveLength(8);
    sounds.setEnabled(false);
    expect(
      c.voices.every((v) =>
        v.stop.mock.calls.some((args) => args.length === 0),
      ),
    ).toBe(true);
    const count = c.voices.length;
    sounds.play("on");
    expect(c.voices).toHaveLength(count);
    sounds.setEnabled(true);
    sounds.suspend();
    expect(c.suspend).toHaveBeenCalledOnce();
    sounds.play("on");
    expect(c.voices).toHaveLength(count);
    await sounds.unlock();
    sounds.play("on");
    expect(c.voices).toHaveLength(count + 1);
    sounds.dispose();
    expect(c.close).toHaveBeenCalledOnce();
    expect(await sounds.unlock()).toBe(false);
  });
  it("fails quietly when audio is unavailable or resume is denied", async () => {
    vi.stubGlobal("window", {});
    const absent = new Sounds();
    absent.setEnabled(true);
    expect(await absent.unlock()).toBe(false);
    vi.stubGlobal("window", { AudioContext: Context });
    const denied = new Sounds();
    denied.setEnabled(true);
    const resume = vi.spyOn(Context.prototype, "createOscillator");
    // Simulate a browser that cannot leave suspended state.
    class Blocked extends Context {
      resume = vi.fn(async () => {
        throw new Error("blocked");
      });
    }
    vi.stubGlobal("window", { AudioContext: Blocked });
    expect(await denied.unlock()).toBe(false);
    expect(() => denied.play("go")).not.toThrow();
    expect(resume).not.toHaveBeenCalled();
    denied.dispose();
    vi.restoreAllMocks();
  });
});

it("keeps Glow phrases quiet, short, bounded and subject to mute/unlock", async () => {
  vi.stubGlobal("window", { AudioContext: Context });
  const sounds = new Sounds();
  sounds.play("glow-claim");
  expect(Context.instances).toHaveLength(0);
  sounds.setEnabled(true);
  await sounds.unlock();
  const c = Context.instances[0];
  for (const cue of ["glow-claim", "glow-mixed", "glow-clash"] as const)
    sounds.play(cue);
  expect(c.voices).toHaveLength(7);
  expect(c.peaks).toEqual(Array(7).fill(0.035));
  for (const voice of c.voices)
    expect(voice.stop.mock.calls[0][0]).toBeLessThan(0.4);
  sounds.play("glow-clash");
  expect(c.voices).toHaveLength(7);
  sounds.setEnabled(false);
  expect(
    c.voices.every((v) => v.stop.mock.calls.some((args) => args.length === 0)),
  ).toBe(true);
  sounds.dispose();
});
