// ---------- build/web-audio/blocks/source: a source's start and stop ----------
// A source started at its time: its copy's, as its note starts, or as it's built.
// Stopped its stop after it starts, where it has one; at 0 none, playing until it's let go.
// A stop changed once it's started moves it, never taking one back.
import type { Automatable } from '../param-units.ts';
import { toldParam } from '../param-units.ts';

export class SourceTimes {
  readonly #source: AudioScheduledSourceNode;
  readonly #now: () => number;
  #stop: number;
  #started: number | undefined;

  constructor(source: AudioScheduledSourceNode, { stop, now }: { stop: number; now: () => number }) {
    this.#source = source;
    this.#stop = stop;
    this.#now = now;
  }
  // Started at a time, now unless given; a buffer's from an offset into it, where it has one.
  // Started now, it's told no time, as Web Audio starts a source told none.
  start(at: number | undefined, offset = 0): void {
    this.#started = at ?? this.#now();
    if (offset > 0) {
      (this.#source as AudioBufferSourceNode).start(this.#started, offset); // only a buffer has one
    } else if (at === undefined) {
      this.#source.start();
    } else {
      this.#source.start(at);
    }
    this.#stopped();
  }
  // its stop, as a param is automated
  stopParam(): Automatable {
    return toldParam(
      () => this.#stop,
      (value) => {
        this.#stop = value;
        this.#stopped();
      },
    );
  }

  // stopped its stop after it started, where it has one
  #stopped(): void {
    if (this.#started === undefined || this.#stop <= 0) {
      return;
    }
    this.#source.stop(this.#started + this.#stop);
  }
}
