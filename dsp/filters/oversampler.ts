// ---------- dsp/filters/oversampler: a shape run at a multiple of the rate, between two windowed-sinc filters ----------
// Up: each sample becomes `factor` points of the band-limited wave through it, each phase its own filter.
// Down: the shape's output filtered at the rate's Nyquist, one point in `factor` kept, so what the shape makes
// past it is taken off before it folds back. Both filters a sinc under a Kaiser window, `reach` samples each side.
// The down filter is read on each sample's first phase, so the latency is a whole number of samples.
import { RingWindow } from './ring-window.ts';
import { windowedSinc } from './windowed-sinc.ts';

/** A shape that is run at a multiple of the rate. */
export type Shape = (value: number) => number;

const DEFAULT_REACH = 16; // samples each side: flat within a tenth of a dB to 15 kHz at 48 kHz, folds under -60 dB

/** A shape run `factor` times as fast as the sound around it; `latency` samples late. */
export class Oversampler {
  /** Samples at the outer rate the sound comes out late: the up filter's reach and the down filter's. */
  readonly latency: number;
  readonly #factor: number;
  readonly #phases: Float64Array[]; // the up filter, a kernel a phase, over the last 2·reach samples
  readonly #down: Float64Array; // the down filter, over the last 2·reach·factor + 1 points
  readonly #input: RingWindow;
  readonly #shaped: RingWindow;

  constructor(factor: number, reach = DEFAULT_REACH) {
    this.latency = 2 * reach;
    this.#factor = factor;
    this.#phases = Array.from({ length: factor }, (_, phase) =>
      Float64Array.from({ length: 2 * reach }, (_, i) => windowedSinc(reach - 1 - i + phase / factor, reach)),
    );
    const span = reach * factor;
    this.#down = Float64Array.from(
      { length: 2 * span + 1 },
      (_, i) => windowedSinc((i - span) / factor, reach) / factor,
    );
    this.#input = new RingWindow(2 * reach);
    this.#shaped = new RingWindow(2 * span + 1);
  }

  /** The next sample out, `input` taken in and run through `shape` at the multiple rate. */
  process(input: number, shape: Shape): number {
    this.#input.push(input);
    let output = 0;
    for (let phase = 0; phase < this.#factor; phase++) {
      this.#shaped.push(shape(this.#input.dot(this.#phases[phase]!)));
      if (phase === 0) {
        output = this.#shaped.dot(this.#down); // on the first phase: a whole number of samples late
      }
    }
    return output;
  }
}
