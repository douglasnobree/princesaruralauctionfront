import type { BroadcastState } from "@/lib/broadcast/broadcast-types";

type ApplyState = (state: BroadcastState) => void;

/** Keeps complete snapshots ordered while the configured broadcast delay is applied. */
export class BroadcastStateQueue {
  private appliedVersion = 0;
  private delayMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly pending = new Map<number, BroadcastState>();

  constructor(
    delayMs: number,
    private readonly apply: ApplyState,
  ) {
    this.delayMs = Math.max(0, delayMs);
  }

  get version() {
    return this.appliedVersion;
  }

  setDelay(delayMs: number) {
    this.delayMs = Math.max(0, delayMs);
    if (this.timer && this.pending.size > 0) {
      this.clearTimer();
      this.schedule();
    }
  }

  seed(state: BroadcastState) {
    this.clearTimer();
    this.pending.clear();
    this.appliedVersion = state.version;
    this.apply(state);
  }

  prime(state: BroadcastState) {
    this.clearTimer();
    this.pending.clear();
    this.appliedVersion = state.version;
  }

  replace(state: BroadcastState) {
    const highestPendingVersion = this.pending.size
      ? Math.max(...this.pending.keys())
      : this.appliedVersion;
    if (state.version < highestPendingVersion) return;
    this.seed(state);
  }

  enqueue(state: BroadcastState) {
    if (state.version <= this.appliedVersion) return;
    this.pending.set(state.version, state);
    this.schedule();
  }

  clear() {
    this.clearTimer();
    this.pending.clear();
  }

  private schedule() {
    if (this.timer || this.pending.size === 0) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const nextVersion = Math.min(...this.pending.keys());
      const nextState = this.pending.get(nextVersion);
      if (!nextState) {
        this.schedule();
        return;
      }
      this.pending.delete(nextVersion);
      if (nextVersion > this.appliedVersion) {
        this.appliedVersion = nextVersion;
        this.apply(nextState);
      }
      this.schedule();
    }, this.delayMs);
  }

  private clearTimer() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
