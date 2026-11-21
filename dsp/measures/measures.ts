// ---------- dsp/measures/measures: what a recipe's numbers are read by ----------
// A hit rendered into a Float32Array, read as a time, a level, a pitch or a share of the spectrum.
// These are the numbers a recipe is held to ("rim 808 starts 50 ms in", "the lead sings G4").
// Times are in s from the buffer's start, levels in dB re full scale; nothing here touches audio.

import { fft } from './mix-checks.ts';

// a span shorter than this is padded up: the bins stay fine enough to tell a band from its neighbor
const MIN_FFT = 1024;

// the time of the first sample at or over the peak less `under` dB; Infinity for silence
export function onsetOf(samples: Float32Array, sampleRate: number, under = 40): number {
  const peak = peakOf(samples);
  if (peak === 0) {
    return Infinity;
  }
  const threshold = peak * 10 ** (-under / 20);
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]!) >= threshold) {
      return i / sampleRate;
    }
  }
  return Infinity;
}

function peakOf(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]!));
  }
  return peak;
}

// the rms over `window` s centered on `at`, clipped to the buffer; -Infinity for silence
export function levelAt(samples: Float32Array, sampleRate: number, at: number, window = 0.01): number {
  const from = Math.max(0, Math.round((at - window / 2) * sampleRate));
  const to = Math.min(samples.length, Math.round((at + window / 2) * sampleRate));
  return decibelsOf(rmsOf(samples, from, to));
}

// dB of an amplitude (rms, or a sine's peak); -Infinity for none
function decibelsOf(amplitude: number): number {
  return 20 * Math.log10(amplitude);
}

function rmsOf(samples: Float32Array, from: number, to: number): number {
  if (to <= from) {
    return 0;
  }
  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += samples[i]! * samples[i]!;
  }
  return Math.sqrt(sum / (to - from));
}

// from the loudest rms window to the first after which every window is more than `drop` dB under it; Infinity for silence
export function fallTime(samples: Float32Array, sampleRate: number, drop = 20, window = 0.005): number {
  const length = Math.max(1, Math.round(window * sampleRate));
  const hop = Math.max(1, Math.round(length / 2));
  const levels: number[] = [];
  for (let from = 0; from + length <= samples.length; from += hop) {
    levels.push(rmsOf(samples, from, from + length));
  }
  // shorter than one window: the whole of it
  if (levels.length === 0) {
    levels.push(rmsOf(samples, 0, samples.length));
  }
  const loudest = levels.indexOf(Math.max(...levels));
  const peak = levels[loudest]!;
  if (peak === 0) {
    return Infinity;
  }
  const under = peak * 10 ** (-drop / 20);
  let last = loudest; // the last window not under: the first after which every one is
  for (let i = loudest + 1; i < levels.length; i++) {
    if (!(levels[i]! < under)) {
      last = i;
    }
  }
  return ((last - loudest) * hop) / sampleRate;
}

// Hz: 1 over the length of the cycle holding `at`, between two rising zero crossings; NaN where no cycle holds it
export function pitchAt(samples: Float32Array, sampleRate: number, at: number, lowpass = 0): number {
  const heard = lowpass > 0 ? lowpassedTwice(samples, sampleRate, lowpass) : samples;
  const position = at * sampleRate;
  const before = crossingBefore(heard, position);
  const after = crossingAfter(heard, position);
  if (Number.isNaN(before) || Number.isNaN(after)) {
    return NaN;
  }
  return sampleRate / (after - before);
}

// y += (1 - e^(-2π·hz/rate))·(x - y), twice: a 12 dB an octave slope that keeps a low pitch from being read in its upper partials
function lowpassedTwice(samples: Float32Array, sampleRate: number, hz: number): Float32Array {
  const coefficient = 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);
  const filtered = new Float32Array(samples.length);
  let first = 0;
  let second = 0;
  for (let i = 0; i < samples.length; i++) {
    first += coefficient * (samples[i]! - first);
    second += coefficient * (first - second);
    filtered[i] = second;
  }
  return filtered;
}

// the last rising crossing at or before a position (as a fractional index); NaN where none
function crossingBefore(samples: Float32Array, position: number): number {
  for (let i = Math.min(Math.floor(position), samples.length - 2); i >= 0; i--) {
    if (risesAt(samples, i) && crossingAt(samples, i) <= position) {
      return crossingAt(samples, i);
    }
  }
  return NaN;
}

// where the rising crossing s[i] <= 0 < s[i+1] falls, as a fractional index on the line between the two samples
function crossingAt(samples: Float32Array, i: number): number {
  return i + (0 - samples[i]!) / (samples[i + 1]! - samples[i]!);
}

// whether the wave crosses zero upward between sample i and the next
function risesAt(samples: Float32Array, i: number): boolean {
  return samples[i]! <= 0 && samples[i + 1]! > 0;
}

// the first rising crossing after a position; NaN where none
function crossingAfter(samples: Float32Array, position: number): number {
  for (let i = Math.max(0, Math.floor(position)); i < samples.length - 1; i++) {
    if (risesAt(samples, i) && crossingAt(samples, i) > position) {
      return crossingAt(samples, i);
    }
  }
  return NaN;
}

// the span's mean square between `low` and `high` Hz, as 10·log10: 2/(L·N) times the sum of |X|² over the band's bins (Parseval, one side)
export function bandLevel(
  samples: Float32Array,
  sampleRate: number,
  low: number,
  high: number,
  from = 0,
  to = Infinity,
): number {
  const span = spanOf(samples, sampleRate, from, to);
  if (span.length === 0) {
    return -Infinity;
  }
  const { power, size } = spectrumOf(span);
  let sum = 0;
  for (const bin of binsBetween(low, high, sampleRate, size)) {
    sum += power[bin]!;
  }
  return 10 * Math.log10((2 * sum) / (span.length * size));
}

// the samples between two times, clipped to the buffer
function spanOf(samples: Float32Array, sampleRate: number, from: number, to: number): Float32Array {
  const start = Math.max(0, Math.round(from * sampleRate));
  const end = Math.min(samples.length, Math.round(to * sampleRate));
  return samples.subarray(start, Math.max(start, end));
}

// the power of bins 0..N/2 of a span copied into the next power of two at or over its length (MIN_FFT at least), zero-padded,
// no window; and the span's length, for scaling
function spectrumOf(span: Float32Array): { power: Float64Array; size: number } {
  let size = MIN_FFT;
  while (size < span.length) {
    size <<= 1;
  }
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);
  real.set(span);
  fft(real, imaginary);
  const power = new Float64Array(size / 2 + 1);
  for (let bin = 0; bin < power.length; bin++) {
    power[bin] = real[bin]! ** 2 + imaginary[bin]! ** 2;
  }
  return { power, size };
}

// the bins between two frequencies, as bin numbers
function binsBetween(low: number, high: number, sampleRate: number, size: number, first = 0): number[] {
  const bins: number[] = [];
  for (let bin = first; bin <= size / 2; bin++) {
    const hz = (bin * sampleRate) / size;
    if (hz >= low && hz <= high) {
      bins.push(bin);
    }
  }
  return bins;
}

// 0 to 1: the band's bins' power over the power of bins 1 to N/2; 0 for silence
export function bandShare(
  samples: Float32Array,
  sampleRate: number,
  low: number,
  high: number,
  from = 0,
  to = Infinity,
): number {
  const { power, size } = spectrumOf(spanOf(samples, sampleRate, from, to));
  let whole = 0;
  for (let bin = 1; bin < power.length; bin++) {
    whole += power[bin]!;
  }
  if (whole === 0) {
    return 0;
  }
  let inBand = 0;
  for (const bin of binsBetween(low, high, sampleRate, size, 1)) {
    inBand += power[bin]!;
  }
  return inBand / whole;
}

// dB: the amplitude of a steady sine at exactly `hz`, from a Hann-windowed sum: 2·|Σ w·x·e^(-j2π·hz·n/rate)| / Σ w
export function partialLevel(samples: Float32Array, sampleRate: number, hz: number, from = 0, to = Infinity): number {
  const span = spanOf(samples, sampleRate, from, to);
  let real = 0;
  let imaginary = 0;
  let windowSum = 0;
  for (let n = 0; n < span.length; n++) {
    const weight = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / span.length);
    const angle = (-2 * Math.PI * hz * n) / sampleRate;
    real += weight * span[n]! * Math.cos(angle);
    imaginary += weight * span[n]! * Math.sin(angle);
    windowSum += weight;
  }
  if (windowSum === 0) {
    return -Infinity;
  }
  return decibelsOf((2 * Math.hypot(real, imaginary)) / windowSum);
}
