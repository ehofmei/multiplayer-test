export interface LatencySummary {
  current: number;
  median: number;
  p95: number;
  count: number;
}

// A bounded rolling window keeps old spikes from dominating a long session.
export class LatencyWindow {
  private samples: number[] = [];
  add(milliseconds: number) {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return;
    this.samples.push(milliseconds);
    if (this.samples.length > 60) this.samples.shift();
  }
  summary(): LatencySummary | undefined {
    if (!this.samples.length) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return {
      current: this.samples.at(-1)!,
      median:
        sorted.length % 2
          ? sorted[middle]
          : (sorted[middle - 1] + sorted[middle]) / 2,
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
      count: sorted.length,
    };
  }
}
