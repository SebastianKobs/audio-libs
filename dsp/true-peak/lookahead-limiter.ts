// ---------- dsp/true-peak: a soft clip into a limiter that looks ahead, run in the stream ----------
import { INTERPOLATION_REACH, interpolationKernels, loudestPointIn } from './oversampling.ts';

/** What a lookahead limiter is made with. */
export interface LookaheadSetup {
  sampleRate: number;
  // seconds the gain starts to fall ahead of a peak, 0.005 unless set, at most 0.02
  lookahead?: number;
}

/** What `render()` is handed with each block. */
export interface LookaheadParams {
  // make-up before the clip, in dB
  gain: number;
  // the highest point allowed, in dB under full scale
  ceiling: number;
  // seconds the gain takes to come most of the way back
  release: number;
  // dB the soft clip may bend above the ceiling before the limiter takes the rest; Infinity: no clip
  clip: number;
}

const OVERSAMPLING = 8; // points a sample the detector looks at: the 7 between a sample and the next
const TAPS = 2 * INTERPOLATION_REACH;
const MARGIN = 0.999; // a point is brought a hair under the ceiling, so float rounding can't leave it over
const BEHIND = INTERPOLATION_REACH - 1; // samples before the sample under the detector that its points are made from
const WINDOW_MORE = 2 * INTERPOLATION_REACH + 1; // the gain's window is L + this, flat across every sample a point is made from
const DEFAULT_LOOKAHEAD = 0.005; // s

/** The most lookahead it holds, in seconds. */
export const MOST_LOOKAHEAD = 0.02;

// the points between a sample and the next, a filter each
const KERNELS: readonly Float64Array[] = interpolationKernels(OVERSAMPLING);

/** x straight up to the threshold, then a tanh bending to the limit: the slope is 1 where it starts, so there's no kink. */
export function softClipped(x: number, threshold: number, limit: number): number {
  const size = Math.abs(x);
  if (size <= threshold || limit === Infinity) {
    return x;
  }
  const sign = x < 0 ? -1 : 1;
  if (limit <= threshold) {
    return sign * threshold;
  }
  return sign * (threshold + (limit - threshold) * Math.tanh((size - threshold) / (limit - threshold)));
}

/**
 * A limiter that plans its gain as a sample arrives: the lowest gain wanted over the window ahead,
 * a moving average as the attack, a release, one gain for every channel. Each channel goes through the soft clip first,
 * so the limiter has only what the clip leaves over the ceiling to take. A sample in and a sample out,
 * `latency` samples late, so it runs live as it does on a whole file.
 */
export class LookaheadLimiter {
  // samples the output sits behind the input
  readonly latency: number;
  readonly #sampleRate: number;
  readonly #ahead: number; // L
  readonly #rings: Float64Array[] = []; // a channel's clipped samples, latency + 1 each, made as its channel first comes
  readonly #recent = new Float64Array(TAPS); // scratch: the samples the detector reads
  readonly #deckValues: Float64Array; // the window's candidates for the lowest gain wanted, rising
  readonly #deckFrames: Float64Array;
  readonly #windowLength: number;
  readonly #lowests: Float64Array; // the last L + 1 lowest
  #write = 0; // where the next sample goes in a ring
  #frame = 0; // frames rendered, the deque's index
  #deckHead = 0;
  #deckSize = 0;
  #lowestAt = 0;
  #lowestSum: number;
  #lowestUnderOne = 0;
  #gain = 1;
  #deepest = 1; // the least gain since reduced() was asked

  constructor({ sampleRate, lookahead = DEFAULT_LOOKAHEAD }: LookaheadSetup) {
    this.#sampleRate = sampleRate;
    this.#ahead = Math.round(Math.min(MOST_LOOKAHEAD, Math.max(0, lookahead)) * sampleRate);
    this.latency = this.#ahead + TAPS;
    this.#windowLength = this.#ahead + WINDOW_MORE;
    this.#deckValues = new Float64Array(this.#windowLength + 1);
    this.#deckFrames = new Float64Array(this.#windowLength + 1);
    this.#lowests = new Float64Array(this.#ahead + 1).fill(1);
    this.#lowestSum = this.#ahead + 1;
  }

  /**
   * `frames` of every output channel rendered from the inputs (a channel missing: silence) at the params;
   * `gains`, where handed, takes the gain at each frame.
   */
  render(
    inputs: readonly ArrayLike<number>[],
    outputs: readonly Float32Array[],
    frames: number,
    { gain, ceiling, release, clip }: LookaheadParams,
    gains?: Float64Array,
  ): void {
    const makeUp = 10 ** (gain / 20);
    const target = 10 ** (ceiling / 20) * MARGIN;
    const limit = target * 10 ** (clip / 20);
    const comeBack = 1 - Math.exp(-1 / (release * this.#sampleRate));
    for (let i = 0; i < frames; i++) {
      this.#keep(inputs, outputs.length, i, makeUp, target, limit);
      const attacked = this.#attacked(this.#lowest(this.#wanted(outputs.length, target)));
      this.#gain = Math.min(attacked, this.#gain + (1 - this.#gain) * comeBack);
      this.#deepest = Math.min(this.#deepest, this.#gain);
      if (gains) {
        gains[i] = this.#gain;
      }
      this.#sound(outputs, i);
      this.#write = (this.#write + 1) % (this.latency + 1);
      this.#frame++;
    }
  }

  /** The most it took off since last asked, in dB, 0 none. */
  reduced(): number {
    const taken = -20 * Math.log10(this.#deepest);
    this.#deepest = 1;
    return taken;
  }

  // 1: each channel's sample, made up and soft-clipped, into its ring
  #keep(
    inputs: readonly ArrayLike<number>[],
    channels: number,
    i: number,
    makeUp: number,
    target: number,
    limit: number,
  ): void {
    for (let channel = 0; channel < channels; channel++) {
      const ring = (this.#rings[channel] ??= new Float64Array(this.latency + 1));
      const sample = inputs[channel]?.[i] ?? 0;
      ring[this.#write] = softClipped(sample * makeUp, target, limit);
    }
  }

  // 2 and 3: the loudest point over the channels, and the gain that brings it to the target, 1 where it's under
  #wanted(channels: number, target: number): number {
    const size = this.latency + 1;
    let loudest = 0;
    for (let channel = 0; channel < channels; channel++) {
      const ring = this.#rings[channel];
      for (let tap = 0; tap < TAPS; tap++) {
        this.#recent[tap] = ring?.[(this.#write - (TAPS - 1) + tap + size) % size] ?? 0;
      }
      loudest = Math.max(loudest, loudestAround(this.#recent, 0));
    }
    return loudest > target ? target / loudest : 1;
  }

  // 4: the least of the last L + 25 wanted, a deque of candidates whose gains rise from the oldest to the newest
  #lowest(wanted: number): number {
    const size = this.#deckValues.length;
    while (this.#deckSize > 0 && (this.#deckValues[(this.#deckHead + this.#deckSize - 1) % size] ?? 0) >= wanted) {
      this.#deckSize--;
    }
    const tail = (this.#deckHead + this.#deckSize) % size;
    this.#deckValues[tail] = wanted;
    this.#deckFrames[tail] = this.#frame;
    this.#deckSize++;
    while ((this.#deckFrames[this.#deckHead] ?? 0) <= this.#frame - this.#windowLength) {
      this.#deckHead = (this.#deckHead + 1) % size;
      this.#deckSize--;
    }
    return this.#deckValues[this.#deckHead] ?? 1;
  }

  // 5: the mean of the last L + 1 lowest, exactly 1 while none in it is under 1
  #attacked(lowest: number): number {
    const leaving = this.#lowests[this.#lowestAt] ?? 1;
    this.#lowests[this.#lowestAt] = lowest;
    this.#lowestAt = (this.#lowestAt + 1) % this.#lowests.length;
    this.#lowestSum += lowest - leaving;
    this.#lowestUnderOne += (lowest < 1 ? 1 : 0) - (leaving < 1 ? 1 : 0);
    if (this.#lowestUnderOne > 0) {
      return this.#lowestSum / this.#lowests.length;
    }
    this.#lowestSum = this.#lowests.length; // set back: no float error carried into an untouched stretch
    return 1;
  }

  // 7: each channel's sample of `latency` frames ago, at the gain
  #sound(outputs: readonly Float32Array[], i: number): void {
    const oldest = (this.#write + 1) % (this.latency + 1);
    for (let channel = 0; channel < outputs.length; channel++) {
      const heard = outputs[channel];
      if (heard) {
        heard[i] = (this.#rings[channel]?.[oldest] ?? 0) * this.#gain;
      }
    }
  }
}

// the loudest of the sample at `start + BEHIND` and the points between it and the next
function loudestAround(samples: ArrayLike<number>, start: number): number {
  const sample = Math.abs(samples[start + BEHIND] ?? 0);
  return Math.max(sample, loudestPointIn(samples, start, KERNELS));
}
