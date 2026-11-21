// ---------- dsp/true-peak: a limiter that leaves no point of the wave over its ceiling, on whole channels ----------
import { LookaheadLimiter, MOST_LOOKAHEAD } from './lookahead-limiter.ts';
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

/**
 * The channels run through one `LookaheadLimiter`, at no make-up and no clip, read aligned with their input,
 * then measured and pulled down further wherever a point is still over, so none is left over.
 */
export function limitTruePeak(setup: TruePeakSetup): LimitedChannels {
  const { channels, sampleRate } = setup;
  const lookaheadMs = setup.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS;
  const releaseMs = setup.releaseMs ?? DEFAULT_RELEASE_MS;
  const frames = framesOf(channels, sampleRate, lookaheadMs, releaseMs);
  const limiter = new LookaheadLimiter({ sampleRate, lookahead: lookaheadMs / 1000 });
  const length = frames + limiter.latency; // silence fed after the end, so the last samples come out
  const heard = channels.map(() => new Float32Array(length)); // not kept: the gain on the input makes it again
  const gains = new Float64Array(length);
  const params = {
    gain: 0,
    ceiling: setup.ceilingDb ?? DEFAULT_CEILING_DB,
    release: releaseMs / 1000,
    clip: Infinity, // an export mustn't clip
  };
  limiter.render(channels, heard, length, params, gains);
  // the first `latency` samples out are the limiter filling, so the gain is read that many samples on
  const gain = gains.slice(limiter.latency);
  return { channels: pulledDownUntilUnder(channels, gain, 10 ** (params.ceiling / 20)), gain };
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
  if (!(lookaheadMs >= 0 && lookaheadMs <= MOST_LOOKAHEAD * 1000)) {
    throw new Error(`A limiter's lookahead is 0 to ${MOST_LOOKAHEAD * 1000} ms, not ${lookaheadMs}`);
  }
  if (!(releaseMs >= 0)) {
    throw new Error(`A limiter's release is 0 ms or more, not ${releaseMs}`);
  }
  return first.length;
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
