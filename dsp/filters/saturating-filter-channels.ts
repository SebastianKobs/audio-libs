// ---------- libs/dsp/filters/saturating-filter-channels: a saturating filter a channel, let go once told to stop ----------
import { SaturatingFilter, type SaturatingParams } from './saturating-filter.ts';

/** What the channels are made with. */
export interface SaturatingFilterChannelsSetup {
  sampleRate: number;
  /** The random a channel's noise is drawn from, by its number; `Math.random` unless given. */
  randomOf?: (channel: number) => () => number;
}

/**
 * A saturating filter for each channel of a block, made as its channel first comes, each on a random of its own.
 * Told `{ stop }` in the context's seconds it writes zeros from there and asks to be let go,
 * so a voice's filter is dropped with its voice; never told, it asks to be kept, as a desk's insert is.
 */
export class SaturatingFilterChannels {
  readonly #sampleRate: number;
  readonly #randomOf: (channel: number) => () => number;
  readonly #filters: SaturatingFilter[] = [];
  #stop = Infinity; // s, the context's

  constructor({ sampleRate, randomOf = () => Math.random }: SaturatingFilterChannelsSetup) {
    this.#sampleRate = sampleRate;
    this.#randomOf = randomOf;
  }

  /** A message from the page: `{ stop }` sets the stop, never taken back; anything else is left out: it comes from another thread. */
  told(message: unknown): void {
    const { stop } = (message ?? {}) as { stop?: unknown };
    if (typeof stop === 'number' && !Number.isNaN(stop)) {
      this.#stop = Math.min(this.#stop, stop);
    }
  }

  /**
   * One block: each channel through its filter, a missing input silence (it may be singing); from its stop zeros.
   * `currentTime` is the context's at the block's first frame. False once stopped within or before the block.
   */
  process(
    inputs: readonly (ArrayLike<number> | undefined)[],
    outputs: readonly Float32Array[],
    params: SaturatingParams,
    currentTime: number,
  ): boolean {
    const frames = outputs[0]?.length;
    if (!frames) {
      return currentTime < this.#stop;
    }
    const to = Math.min(frames, Math.max(0, Math.round((this.#stop - currentTime) * this.#sampleRate)));
    outputs.forEach((output, channel) => {
      output.fill(0);
      if (to === 0) {
        return;
      }
      const filter = (this.#filters[channel] ??= new SaturatingFilter({
        sampleRate: this.#sampleRate,
        random: this.#randomOf(channel),
      }));
      filter.render(inputs[channel], output, 0, to, params);
    });
    return to >= frames;
  }
}
