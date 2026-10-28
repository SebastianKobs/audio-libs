// ---------- libs/dsp/true-peak: a limiter that leaves no point of the wave over its ceiling ----------
import { betweenSamplePeaks, INTERPOLATION_REACH } from './oversampling.ts';

/** What a limiter is handed: channels (floats, full scale ±1) and their rate; the rest has a default. */
export interface TruePeakSetup {
  channels: readonly Float32Array[];
  sampleRate: number;
  // the highest point allowed, in dB under full scale
  ceilingDb?: number;
  // how far ahead of a peak the gain starts to fall
  lookaheadMs?: number;
  // how long the gain takes to come most of the way back
  releaseMs?: number;
}

/** What it hands back: the limited channels, and the one gain applied to every channel at each sample. */
export interface LimitedChannels {
  channels: Float32Array[];
  gain: Float64Array;
}

const DEFAULT_CEILING_DB = -0.3;
const DEFAULT_LOOKAHEAD_MS = 5;
const DEFAULT_RELEASE_MS = 100;
const OVERSAMPLING = 8;
const MARGIN = 0.999; // a point is brought a hair under the ceiling, so float rounding can't leave it over
const MAX_PASSES = 100;

export function limitTruePeak(setup: TruePeakSetup): LimitedChannels {
  const { channels, sampleRate } = setup;
  const ceiling = 10 ** ((setup.ceilingDb ?? DEFAULT_CEILING_DB) / 20);
  const lookaheadMs = setup.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS;
  const releaseMs = setup.releaseMs ?? DEFAULT_RELEASE_MS;
  const frames = framesOf(channels, sampleRate, lookaheadMs, releaseMs);
  const lookahead = Math.round((lookaheadMs / 1000) * sampleRate);
  const peaks = loudestPoints(channels, frames);
  const wanted = gainWanted(peaks, ceiling * MARGIN);
  const gain = released(attacked(slidingMinimum(wanted, lookahead), lookahead), releaseMs, sampleRate);
  return { channels: pulledDownUntilUnder(channels, gain, ceiling), gain };
}

// the length every channel shares, once the setup is checked
function framesOf(
  channels: readonly Float32Array[],
  sampleRate: number,
  lookaheadMs: number,
  releaseMs: number,
): number {
  const [first] = channels;
  if (!first) {
    throw new Error('A limiter needs at least one channel');
  }
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
    throw new Error(`A limiter's sample rate is a positive whole number, not ${sampleRate}`);
  }
  if (channels.some((channel) => channel.length !== first.length)) {
    throw new Error('Every channel of a limiter has the same length');
  }
  if (!(lookaheadMs >= 0)) {
    throw new Error(`A limiter's lookahead is 0 ms or more, not ${lookaheadMs}`);
  }
  if (!(releaseMs >= 0)) {
    throw new Error(`A limiter's release is 0 ms or more, not ${releaseMs}`);
  }
  return first.length;
}

// at each sample the loudest point of any channel, from it to just before the next sample
function loudestPoints(channels: readonly Float32Array[], frames: number): Float32Array {
  const loudest = new Float32Array(frames);
  for (const channel of channels) {
    const peaks = betweenSamplePeaks(channel, OVERSAMPLING);
    for (let i = 0; i < frames; i++) {
      loudest[i] = Math.max(loudest[i] ?? 0, peaks[i] ?? 0);
    }
  }
  return loudest;
}

// the gain that brings each sample's loudest point to `target`, 1 where it's under
function gainWanted(peaks: Float32Array, target: number): Float64Array {
  return Float64Array.from(peaks, (peak) => (peak > target ? target / peak : 1));
}

// at each sample the lowest gain wanted from it to `ahead` samples later: a sliding-window minimum, with a deque of candidates
function slidingMinimum(wanted: Float64Array, ahead: number): Float64Array {
  const lowest = new Float64Array(wanted.length);
  const candidates = new Int32Array(wanted.length);
  let head = 0;
  let tail = 0; // candidates[head..tail) are indices rising and their gains rising
  for (let i = wanted.length - 1; i >= 0; i--) {
    while (tail > head && valueAt(wanted, valueAt(candidates, tail - 1)) >= valueAt(wanted, i)) {
      tail--;
    }
    candidates[tail++] = i;
    while (valueAt(candidates, head) > i + ahead) {
      head++;
    }
    lowest[i] = valueAt(wanted, valueAt(candidates, head));
  }
  return lowest;
}

// the mean of the last `length + 1` values: a ramp down that ends as the peak arrives, as each of them is under what it wants
function attacked(lowest: Float64Array, length: number): Float64Array {
  const smoothed = new Float64Array(lowest.length);
  const width = length + 1;
  let sum = 0;
  let reduced = 0; // how many values in the window are under 1, so an untouched stretch is exactly 1
  for (let i = 0; i < lowest.length; i++) {
    const entering = lowest[i] ?? 1;
    sum += entering;
    reduced += entering < 1 ? 1 : 0;
    if (i >= width) {
      const leaving = lowest[i - width] ?? 1;
      sum -= leaving;
      reduced -= leaving < 1 ? 1 : 0;
    }
    smoothed[i] = reduced === 0 ? 1 : sum / Math.min(i + 1, width);
  }
  return smoothed;
}

// the gain comes back toward 1 by a fixed share of what's left each sample, never above what the attack allows
function released(attack: Float64Array, releaseMs: number, sampleRate: number): Float64Array {
  const gain = new Float64Array(attack.length);
  const comeBack = releaseMs === 0 ? 1 : 1 - Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  let previous = 1;
  for (let i = 0; i < attack.length; i++) {
    previous = Math.min(attack[i] ?? 1, previous + (1 - previous) * comeBack);
    gain[i] = previous;
  }
  return gain;
}

// the second stage: measure what the gain left, pull the gain down around each point still over, until none is
function pulledDownUntilUnder(channels: readonly Float32Array[], gain: Float64Array, ceiling: number): Float32Array[] {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const limited = channels.map((channel) => applied(channel, gain));
    const peaks = loudestPoints(limited, gain.length);
    if (!peaks.some((peak) => peak > ceiling)) {
      return limited;
    }
    pullDownAround(gain, peaks, ceiling);
  }
  throw new Error(`The limiter left a point over its ceiling after ${MAX_PASSES} passes`);
}

function applied(channel: Float32Array, gain: Float64Array): Float32Array {
  return Float32Array.from(channel, (value, i) => value * (gain[i] ?? 1));
}

// each point over lowers the gain by what it needs, most at its two samples, fading out over the filter's reach
function pullDownAround(gain: Float64Array, peaks: Float32Array, ceiling: number): void {
  const reduction = new Float64Array(gain.length).fill(1);
  for (let i = 0; i < peaks.length; i++) {
    const peak = valueAt(peaks, i);
    if (peak > ceiling) {
      reduceAround(reduction, i, (ceiling / peak) * MARGIN);
    }
  }
  for (let i = 0; i < gain.length; i++) {
    gain[i] = valueAt(gain, i) * valueAt(reduction, i);
  }
}

// the lowest reduction wins where points overlap, so two close ones don't pull down twice
function reduceAround(reduction: Float64Array, sample: number, needed: number): void {
  for (let offset = -INTERPOLATION_REACH; offset <= INTERPOLATION_REACH + 1; offset++) {
    const target = sample + offset;
    if (target >= 0 && target < reduction.length) {
      reduction[target] = Math.min(valueAt(reduction, target), 1 - (1 - needed) * fadeAt(offset));
    }
  }
}

// 1 at the point's two samples, a raised cosine down to 0 past the filter's reach
function fadeAt(offset: number): number {
  const distance = offset < 0 ? -offset : Math.max(0, offset - 1);
  return 0.5 * (1 + Math.cos((Math.PI * distance) / (INTERPOLATION_REACH + 1)));
}

// in bounds by every caller's loop, as the strict index check wants a fallback
function valueAt(values: ArrayLike<number>, index: number): number {
  return values[index] ?? 0;
}
