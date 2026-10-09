export type Cue =
  | "golf-cup"
  | "golf-tap"
  | "golf-knock"
  | "golf-spring"
  | "golf-meteor"
  | "seek-miss"
  | "seek-hit"
  | "seek-found"
  | "enable"
  | "on"
  | "off"
  | "paddle"
  | "bumper"
  | "wall"
  | "point"
  | "serve"
  | "go"
  | "hold"
  | "success"
  | "wrong"
  | "miss"
  | "win"
  | "finish";
type Note = [frequency: number, duration: number, delay?: number];
const notes: Record<Cue, Note[]> = {
  "golf-cup": [
    [280, 0.08],
    [660, 0.1, 0.1],
    [880, 0.15, 0.2],
  ],
  "golf-tap": [[460, 0.035]],
  "golf-knock": [[230, 0.055]],
  "golf-spring": [
    [420, 0.05],
    [760, 0.08, 0.03],
    [1150, 0.09, 0.075],
  ],
  "golf-meteor": [
    [90, 0.22],
    [145, 0.1, 0.04],
  ],
  "seek-miss": [
    [180, 0.16],
    [360, 0.08],
  ],
  "seek-hit": [
    [880, 0.09],
    [1320, 0.16, 0.06],
  ],
  "seek-found": [
    [523, 0.18],
    [659, 0.18, 0.08],
    [784, 0.24, 0.16],
    [1046, 0.25, 0.24],
  ],
  enable: [[740, 0.08]],
  on: [[700, 0.06]],
  off: [[420, 0.06]],
  paddle: [[620, 0.045]],
  bumper: [
    [940, 0.07],
    [470, 0.09, 0.035],
  ],
  wall: [[330, 0.035]],
  point: [
    [440, 0.09],
    [660, 0.12, 0.1],
  ],
  serve: [[520, 0.08]],
  go: [
    [880, 0.08],
    [1100, 0.1, 0.09],
  ],
  hold: [
    [220, 0.16],
    [277, 0.16],
  ],
  success: [
    [660, 0.07],
    [880, 0.1, 0.08],
  ],
  wrong: [
    [150, 0.14],
    [120, 0.1, 0.15],
  ],
  miss: [[260, 0.08]],
  win: [
    [523, 0.1],
    [659, 0.1, 0.11],
    [784, 0.18, 0.22],
  ],
  finish: [
    [440, 0.1],
    [523, 0.14, 0.12],
  ],
};
export class Sounds {
  private context?: AudioContext;
  private enabled = false;
  private disposed = false;
  private voices = new Set<OscillatorNode>();
  private played = new Map<Cue, number>();
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }
  // Called directly from a tap/key gesture, including on saved-preference visits.
  async unlock(): Promise<boolean> {
    if (!this.enabled || this.disposed) return false;
    try {
      const Constructor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Constructor) return false;
      this.context ??= new Constructor();
      if (this.context.state !== "running") await this.context.resume();
      return this.context.state === "running";
    } catch {
      return false;
    }
  }
  play(cue: Cue) {
    const context = this.context;
    if (!this.enabled || this.disposed || context?.state !== "running") return;
    const now = context.currentTime;
    if (now - (this.played.get(cue) ?? -Infinity) < 0.06) return;
    this.played.set(cue, now);
    for (const [frequency, duration, delay = 0] of notes[cue]) {
      if (this.voices.size >= 8) break;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = now + delay;
        oscillator.type = cue === "wrong" ? "triangle" : "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.09, at + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        this.voices.add(oscillator);
        oscillator.onended = () => {
          this.voices.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(at);
        oscillator.stop(at + duration + 0.015);
      } catch {
        /* Audio failure must never interrupt gameplay. */
      }
    }
  }
  stop() {
    for (const oscillator of this.voices) {
      try {
        oscillator.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.voices.clear();
    this.played.clear();
  }
  suspend() {
    this.stop();
    if (this.context?.state === "running")
      void this.context.suspend().catch(() => {});
  }
  dispose() {
    this.disposed = true;
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
  }
}
