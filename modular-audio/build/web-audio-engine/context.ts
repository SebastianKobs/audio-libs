// ---------- build/web-audio-engine/context: the audio context a plan is built in, on a clock ----------
// Made at a low latency, as an instrument played live wants it.
// A clock's time put on the context's time, never into its past: a sound due now starts with
// the next chunk the audio renders.
// Its worklets, the processors loaded into it, none until they have: they belong to the context they're loaded into.
// Its shapers' lags, how late an oversampled WaveShaper comes out here, measured offline once: Chromium's until then,
// and where it's handed no offline context.
// It reads no globals: the browser's AudioContext class, and its OfflineAudioContext where it has one, are handed in.
import {
  CHROMIUM_LAGS,
  loadWorklets,
  measuredLags,
  NO_WORKLETS,
  type Lags,
  type OfflineContexts,
  type ProcessorModules,
  type Worklets,
} from '../web-audio/index.ts';

// what a context is made from: the browser's AudioContext class, and its OfflineAudioContext where it has one; a clock's
// time onto the context's, the same where none is given
export interface ClockedContextOptions {
  AudioContext: new (options: { latencyHint?: AudioContextLatencyCategory | number }) => AudioContext;
  OfflineAudioContext?: OfflineContexts | undefined;
  toContext?: (t: number) => number;
}

// An audio context on a clock.
export class ClockedContext {
  readonly audioContext: AudioContext;
  readonly #Offline: OfflineContexts | undefined;
  readonly #toContext: (t: number) => number;
  #worklets: Worklets = NO_WORKLETS; // none until loadProcessors() is kept
  #shaperLags: Lags = CHROMIUM_LAGS; // until measureShaperLags() is kept

  constructor({ AudioContext, OfflineAudioContext, toContext = (t) => t }: ClockedContextOptions) {
    this.audioContext = new AudioContext({ latencyHint: 'interactive' });
    this.#Offline = OfflineAudioContext;
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
  // how late an oversampled WaveShaper comes out in this context, as far as it's been measured
  get shaperLags(): Lags {
    return this.#shaperLags;
  }
  // The shapers' lags measured offline at this context's rate, kept as its shaperLags once they are: a promise.
  // Nothing measured where no offline context was handed in.
  async measureShaperLags(): Promise<void> {
    if (!this.#Offline) {
      return;
    }
    this.#shaperLags = await measuredLags(this.audioContext.sampleRate, this.#Offline);
  }
  // a clock's time on the context's, never in its past
  at(t: number): number {
    return Math.max(this.#toContext(t), this.audioContext.currentTime);
  }
}
