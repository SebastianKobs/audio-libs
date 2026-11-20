// ---------- libs/dsp/filters/saturating-filter: a filter that saturates and sings ----------
import { windowedSinc } from './windowed-sinc.ts';

/** What a block is rendered at: each param a number for the block, or an array a sample each (a-rate). */
export type SaturatingParams = Readonly<Record<string, number | ArrayLike<number>>>;

/** What a saturating filter is made with. */
export interface SaturatingFilterSetup {
  sampleRate: number;
  /** A random 0 to 1 its own noise is drawn from; `Math.random` unless given. */
  random?: () => number;
}

/** Samples at the context's rate the half-bands delay the sound by, up and down. */
export const LATENCY = 15;

const LOOP = 4.4; // the ladder's loop gain at resonance 1, a tenth over where it sings (4) [est.]
const RING = 2.2; // the state-variable's, a tenth over its damping of 2, where it sings [est.]
const NOISE = 1e-6; // a circuit's own noise: what it sings out of, and starts again from whenever the resonance comes back
const HALF = 8; // a half-band's taps each side that are neither 0 nor its middle
const LADDER_STEPS = 2; // Newton's: the loop's b stays small, so two are exact
const RING_STEPS = 3;
const LOWEST = 1; // Hz, the cutoff's
const HIGHEST = 0.45; // of the rate, the cutoff's
const LADDER = 0; // the mode's: 0 the ladder, 1 the state-variable's lowpass, 2 its bandpass, 3 its highpass
const BANDPASS = 2;
const HIGHPASS = 3;

// the half-band's taps, c[j] at ±(j + 1/2) samples of the input's rate: a windowed sinc, half each side
const TAPS = halfBandTaps();

/**
 * A ladder (24 dB) or a state-variable (12 dB: lowpass, bandpass, highpass) with a tanh where the input meets the feedback,
 * solved within the sample (zero-delay feedback, after Zavalishin), so the loop turns at the cutoff exactly.
 * Run at twice the rate between two half-bands, so the clip's partials don't fold.
 * A circuit's breath of noise goes in: past its threshold it sings out of nothing, a sine at its cutoff, its level held by the clip.
 * One channel; `LATENCY` samples late.
 */
export class SaturatingFilter {
  readonly #sampleRate: number;
  readonly #random: () => number;
  readonly #input = new Float64Array(2 * HALF); // what came in, the newest last
  readonly #filtered = new Float64Array(4 * HALF - 1); // the step's results at twice the rate, the newest last
  readonly #ladder = new Float64Array(4); // its four one-poles' states
  readonly #ring = new Float64Array(2); // the state-variable's two
  #cutoff = Number.NaN;
  #g = 0;

  constructor({ sampleRate, random = Math.random }: SaturatingFilterSetup) {
    this.#sampleRate = sampleRate;
    this.#random = random;
  }

  /**
   * Frames `from` to `to` of `output` rendered from `input` (none: silence, it may be singing) at its params:
   * `frequency`, `detune` (cents), `resonance` 0 to 1, `drive`, `compensation` 0 to 1 and `mode` 0 to 3.
   */
  render(
    input: ArrayLike<number> | undefined,
    output: Float32Array,
    from: number,
    to: number,
    params: SaturatingParams,
  ): void {
    for (let i = from; i < to; i++) {
      this.#tune(paramAt(params, 'frequency', i) * 2 ** (paramAt(params, 'detune', i) / 1200));
      const drive = paramAt(params, 'drive', i);
      const mode = Math.round(paramAt(params, 'mode', i));
      const resonance = paramAt(params, 'resonance', i);
      const noise = (this.#random() * 2 - 1) * NOISE;
      const x = input?.[i] ?? 0;
      if (mode === LADDER) {
        const k = LOOP * resonance;
        const pushed = drive * (1 + paramAt(params, 'compensation', i) * k) * x + noise;
        output[i] = this.#oversampled(pushed, (into) => this.#ladderStep(into, k)) / drive;
        continue;
      }
      const kr = RING * resonance;
      output[i] = this.#oversampled(drive * x + noise, (into) => this.#stateVariableStep(into, kr, mode)) / drive;
    }
  }

  // g, the cutoff prewarped at twice the rate; worked out again only where the cutoff has moved
  #tune(frequency: number): void {
    const cutoff = Math.min(HIGHEST * this.#sampleRate, Math.max(LOWEST, frequency));
    if (cutoff === this.#cutoff) {
      return;
    }
    this.#cutoff = cutoff;
    this.#g = Math.tan((Math.PI * cutoff) / (2 * this.#sampleRate));
  }
  // A sample up to twice the rate (the half-band's point between the two before the middle, then the middle),
  // each through the step, and back down: the half-band again, read between the two.
  #oversampled(sample: number, step: (into: number) => number): number {
    const h = this.#input;
    h.copyWithin(0, 1);
    h[2 * HALF - 1] = sample;
    let mid = 0;
    for (let j = 0; j < HALF; j++) {
      mid += TAPS[j]! * (h[HALF + j]! + h[HALF - 1 - j]!); // j is inside both
    }
    this.#keep(step(mid));
    const d = this.#filtered;
    const middle = 2 * HALF - 1;
    let sides = 0;
    for (let j = 0; j < HALF; j++) {
      sides += TAPS[j]! * (d[middle + 1 + 2 * j]! + d[middle - 1 - 2 * j]!); // j is inside both
    }
    const y = 0.5 * d[middle]! + 0.5 * sides;
    this.#keep(step(h[HALF]!));
    return y;
  }
  #keep(sample: number): void {
    const d = this.#filtered;
    d.copyWithin(0, 1);
    d[d.length - 1] = sample;
  }
  // The ladder at twice the rate: the soft clip where the input meets the feedback, u = tanh(a − b·u), solved by Newton
  // from tanh(a); then four one-poles in a row, the first fed u.
  #ladderStep(sample: number, k: number): number {
    const s = this.#ladder;
    const G = this.#g / (1 + this.#g);
    const S = (1 - G) * (G * G * G * s[0]! + G * G * s[1]! + G * s[2]! + s[3]!);
    const a = sample - k * S;
    const b = k * G ** 4;
    let u = Math.tanh(a);
    for (let n = 0; n < LADDER_STEPS; n++) {
      const t = Math.tanh(a - b * u);
      u -= (u - t) / (1 + b * (1 - t * t));
    }
    let y = u;
    for (let pole = 0; pole < 4; pole++) {
      const v = (y - s[pole]!) * G;
      y = v + s[pole]!;
      s[pole] = y + v;
    }
    return y;
  }
  // The state-variable at twice the rate: its input clipped, its damping fixed at 2, its resonance a feedback of
  // kr·tanh(bp) against it, so the ring is what the clip holds: bp·D = c + g·kr·tanh(bp), solved by Newton.
  #stateVariableStep(sample: number, kr: number, mode: number): number {
    const s = this.#ring;
    const g = this.#g;
    const xs = Math.tanh(sample);
    const c = g * (xs - s[1]!) + s[0]!;
    const D = (1 + g) ** 2;
    let bp = c / (D - g * kr);
    for (let n = 0; n < RING_STEPS; n++) {
      const t = Math.tanh(bp);
      bp -= (bp * D - c - g * kr * t) / (D - g * kr * (1 - t * t));
    }
    const lp = g * bp + s[1]!;
    const hp = (bp - s[0]!) / g;
    s[0] = 2 * bp - s[0]!;
    s[1] = 2 * lp - s[1]!;
    if (mode === BANDPASS) {
      return bp;
    }
    if (mode === HIGHPASS) {
      return hp;
    }
    return lp;
  }
}

// the taps of one side, scaled so the two sides and the middle add up to 1
function halfBandTaps(): Float64Array {
  const raw = Array.from({ length: HALF }, (_, j) => windowedSinc(j + 0.5, HALF));
  const total = raw.reduce((sum, tap) => sum + tap, 0);
  return Float64Array.from(raw, (tap) => tap / (2 * total));
}

// a param's value at a sample: a-rate, one per sample; else one for the block
function paramAt(params: SaturatingParams, name: string, i: number): number {
  const value = params[name];
  if (typeof value === 'number') {
    return value;
  }
  if (!value || value.length === 0) {
    return 0;
  }
  return (value.length > 1 ? value[i] : value[0]) ?? 0;
}
