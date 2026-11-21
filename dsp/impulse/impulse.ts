// ---------- dsp/impulse/impulse: a reverb's impulse response, designed rather than recorded ----------
// 1. A pre-delay, then a few early taps.
// 2. Echoes whose rate grows with the square of time until it is dense: velvet noise,
//    single clicks of random sign.
// 3. Three bands that each die at a time of their own.
// 4. Band-limited and scaled to energy 1.
// Run once to fill a convolver's buffer. Every draw comes from the random handed in:
// two, a seed a side, whatever the length.

import { seeded } from '../../base/util/index.ts';
import { runBiquad, type Biquad } from '../filters/index.ts';

export interface ImpulseDesign {
  readonly decay: number; // s, the middle band down 60 dB: a reverb's time as the PCM-60 states it
  readonly preDelay?: number; // s of silence before the first echo
  readonly taps?: number; // early taps a side, 0 none
  readonly early?: readonly [number, number]; // s after the pre-delay that the taps are spread over
  readonly earlyGain?: number; // a tap against a late echo
  readonly density?: number; // echoes a second once dense, 0 none
  readonly dense?: number; // s after the pre-delay by which it is dense
  readonly crossovers?: readonly [number, number]; // Hz between the low, mid and high bands
  readonly decays?: readonly [number, number, number]; // each band's time as a share of decay
  readonly band?: readonly [number, number]; // Hz, the highpass and lowpass the whole is held in
}

interface Layout {
  readonly sampleRate: number;
  readonly longest: number; // s, the slowest band's time
  readonly body: number; // samples after the pre-delay
  readonly earlyFrom: number;
  readonly earlyTo: number;
  readonly mix: number; // s until the echoes are dense
}

export const IMPULSE_DEFAULTS: Required<Omit<ImpulseDesign, 'decay'>> = {
  preDelay: 0.02,
  taps: 8,
  early: [0.005, 0.08],
  earlyGain: 2,
  density: 2000,
  dense: 0.08,
  crossovers: [250, 4000],
  decays: [1, 1, 0.5],
  band: [20, 10000],
};

const BUTTERWORTH_Q = Math.SQRT1_2;
const FOURTH_ORDER_QS = [1 / (2 * Math.cos(Math.PI / 8)), 1 / (2 * Math.cos((3 * Math.PI) / 8))] as const;
const HIGHEST_HZ_SHARE = 0.45; // of the sample rate: the bilinear transform's tan runs away toward Nyquist
const FADE_SECONDS = 0.01;
const SEED_RANGE = 2 ** 32;

// left and right, each its own noise from its own seed; the seeds the only two draws from random
export function designedImpulse(
  design: ImpulseDesign,
  sampleRate: number,
  random: () => number,
): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  refuseUnlessOverZero('decay', 's', design.decay);
  refuseUnlessOverZero('sample rate', 'Hz', sampleRate);
  const whole: Required<ImpulseDesign> = { ...IMPULSE_DEFAULTS, ...design };
  const longest = whole.decay * Math.max(...whole.decays);
  const earlyTo = Math.min(whole.early[1], whole.decay / 4); // a short room's onset isn't half its tail
  const layout: Layout = {
    sampleRate,
    longest,
    body: Math.round(longest * sampleRate),
    earlyFrom: Math.min(whole.early[0], earlyTo),
    earlyTo,
    mix: Math.min(whole.dense, whole.decay / 4),
  };
  const preDelaySamples = Math.round(whole.preDelay * sampleRate);
  const leftSeed = Math.floor(random() * SEED_RANGE);
  const rightSeed = Math.floor(random() * SEED_RANGE);
  return [sideOf(whole, layout, leftSeed, preDelaySamples), sideOf(whole, layout, rightSeed, preDelaySamples)];
}

function refuseUnlessOverZero(what: string, unit: string, value: number): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new Error(`An impulse's ${what} is more than 0 ${unit}, not ${value}`);
  }
}

function sideOf(
  design: Required<ImpulseDesign>,
  layout: Layout,
  seed: number,
  preDelaySamples: number,
): Float32Array<ArrayBuffer> {
  const shaped = shapedInBands(echoesOf(design, layout, seed), design, layout.sampleRate);
  bandLimitedInPlace(shaped, design.band, layout.sampleRate);
  fadedAtEndInPlace(shaped, layout.sampleRate);
  const side = new Float32Array(preDelaySamples + layout.body);
  side.set(scaledToUnitEnergy(shaped), preDelaySamples);
  return side;
}

function echoesOf(design: Required<ImpulseDesign>, layout: Layout, seed: number): Float64Array {
  const random = seeded(seed);
  const echoes = new Float64Array(layout.body);
  addEarlyTaps(echoes, design, layout, random);
  addLateEchoes(echoes, design, layout, random);
  return echoes;
}

function addEarlyTaps(
  echoes: Float64Array,
  { taps, earlyGain }: Required<ImpulseDesign>,
  layout: Layout,
  random: () => number,
): void {
  for (let i = 0; i < taps; i++) {
    const seconds = layout.earlyFrom + ((layout.earlyTo - layout.earlyFrom) * (i + random())) / taps;
    addEcho(echoes, seconds, earlyGain * signOf(random()), layout.sampleRate);
  }
}

// echoes in a side's body: one at t adds its gain at floor(t × rate), where that lands inside
function addEcho(echoes: Float64Array, seconds: number, gain: number, sampleRate: number): void {
  const at = Math.floor(seconds * sampleRate);
  if (at < echoes.length) {
    echoes[at]! += gain;
  }
}

function signOf(draw: number): 1 | -1 {
  return draw < 0.5 ? -1 : 1;
}

// the echoes' rate grows with the square of time until mix, so the k-th lands at cbrt(3·mix²·k/density), then steady
function addLateEchoes(
  echoes: Float64Array,
  { density }: Required<ImpulseDesign>,
  layout: Layout,
  random: () => number,
): void {
  if (density <= 0) {
    return;
  }
  const { mix, longest, sampleRate } = layout;
  const growingEchoes = (density * mix) / 3;
  const timeOf = (k: number): number =>
    k <= growingEchoes ? Math.cbrt((3 * mix * mix * k) / density) : mix + (k - growingEchoes) / density;
  for (let k = 0; timeOf(k) < longest; k++) {
    const from = timeOf(k);
    const seconds = from + random() * (timeOf(k + 1) - from);
    addEcho(echoes, seconds, signOf(random()), sampleRate);
  }
}

// each band dies on its own time: down 60 dB at decay × its share, 10^(−3·t/time)
function shapedInBands(echoes: Float64Array, design: Required<ImpulseDesign>, sampleRate: number): Float64Array {
  const [low, high] = design.crossovers;
  const lowBand = Float64Array.from(echoes);
  linkwitzRileyInPlace(lowBand, 'lowpass', low, sampleRate);
  const midBand = Float64Array.from(echoes);
  linkwitzRileyInPlace(midBand, 'highpass', low, sampleRate);
  linkwitzRileyInPlace(midBand, 'lowpass', high, sampleRate);
  const highBand = Float64Array.from(echoes);
  linkwitzRileyInPlace(highBand, 'highpass', high, sampleRate);
  const bands = [lowBand, midBand, highBand] as const;
  const shaped = new Float64Array(echoes.length);
  for (let band = 0; band < bands.length; band++) {
    const samples = bands[band]!;
    const secondsPerSixtyDB = design.decay * design.decays[band]!;
    for (let i = 0; i < shaped.length; i++) {
      shaped[i]! += samples[i]! * 10 ** ((-3 * i) / (secondsPerSixtyDB * sampleRate));
    }
  }
  return shaped;
}

// Linkwitz-Riley: a second-order Butterworth run twice, 24 dB an octave, the bands sum flat in level
function linkwitzRileyInPlace(
  samples: Float64Array,
  kind: 'lowpass' | 'highpass',
  hz: number,
  sampleRate: number,
): void {
  const biquad = biquadOf(kind, hz, BUTTERWORTH_Q, sampleRate);
  runBiquad(samples, biquad, samples);
  runBiquad(samples, biquad, samples);
}

function biquadOf(kind: 'lowpass' | 'highpass', hz: number, q: number, sampleRate: number): Biquad {
  const k = Math.tan((Math.PI * Math.min(hz, HIGHEST_HZ_SHARE * sampleRate)) / sampleRate);
  const a0 = 1 + k / q + k * k;
  const a1 = (2 * (k * k - 1)) / a0;
  const a2 = (1 - k / q + k * k) / a0;
  if (kind === 'lowpass') {
    return { b0: (k * k) / a0, b1: (2 * k * k) / a0, b2: (k * k) / a0, a1, a2 };
  }
  return { b0: 1 / a0, b1: -2 / a0, b2: 1 / a0, a1, a2 };
}

// the PCM-60's path: a second-order highpass, a fourth-order lowpass
function bandLimitedInPlace(samples: Float64Array, [from, to]: readonly [number, number], sampleRate: number): void {
  runBiquad(samples, biquadOf('highpass', from, BUTTERWORTH_Q, sampleRate), samples);
  for (const q of FOURTH_ORDER_QS) {
    runBiquad(samples, biquadOf('lowpass', to, q, sampleRate), samples);
  }
}

// a raised cosine from 1 to 0 over the last samples: no click where the tail is cut
function fadedAtEndInPlace(samples: Float64Array, sampleRate: number): void {
  const length = Math.min(samples.length, Math.round(FADE_SECONDS * sampleRate));
  const first = samples.length - length;
  for (let j = 0; j < length; j++) {
    samples[first + j]! *= length === 1 ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * j) / (length - 1));
  }
}

// energy 1, so noise comes back as loud as it went in; a side with no echo stays zeros
function scaledToUnitEnergy(samples: Float64Array): Float64Array {
  let energy = 0;
  for (const sample of samples) {
    energy += sample * sample;
  }
  if (energy === 0) {
    return samples;
  }
  const scale = 1 / Math.sqrt(energy);
  for (let i = 0; i < samples.length; i++) {
    samples[i]! *= scale;
  }
  return samples;
}
