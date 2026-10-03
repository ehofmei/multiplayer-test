import { afterEach, describe, expect, it, vi } from "vitest";
import { Sounds } from "./sounds";
class Oscillator {
  type = "sine";
  frequency = { value: 0 };
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
        linearRampToValueAtTime: vi.fn(),
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
