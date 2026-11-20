// ---------- build/web-audio-engine/context: the audio context a plan is built in, on a clock ----------
// Made at a low latency, as an instrument played live wants it.
// A clock's time put on the context's time, never into its past: a sound due now starts with
// the next chunk the audio renders.
// Its worklets, the processors loaded into it, none until they have: they belong to the context they're loaded into.
// It reads no globals: the browser's AudioContext class is handed in.
import { loadWorklets, NO_WORKLETS, type ProcessorModules, type Worklets } from '../web-audio/index.ts';

// what a context is made from: the browser's AudioContext class; a clock's time onto the
// context's, the same where none is given
export interface ClockedContextOptions {
  AudioContext: new (options: { latencyHint?: AudioContextLatencyCategory | number }) => AudioContext;
  toContext?: (t: number) => number;
}

// An audio context on a clock.
export class ClockedContext {
  readonly audioContext: AudioContext;
  readonly #toContext: (t: number) => number;
  #worklets: Worklets = NO_WORKLETS; // none until loadProcessors() is kept

  constructor({ AudioContext, toContext = (t) => t }: ClockedContextOptions) {
    this.audioContext = new AudioContext({ latencyHint: 'interactive' });
    this.#toContext = toContext;
  }
  // the processors loaded into this context, as far as they've loaded
  get worklets(): Worklets {
    return this.#worklets;
  }
  // The processors' modules added to the context, kept as its worklets once they're loaded: a promise.
  async loadProcessors(modules: ProcessorModules): Promise<void> {
    this.#worklets = await loadWorklets(this.audioContext, modules);
  }
  // a clock's time on the context's, never in its past
  at(t: number): number {
    return Math.max(this.#toContext(t), this.audioContext.currentTime);
  }
}
