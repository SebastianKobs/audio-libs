// ---------- dsp/true-peak: the points between a channel's samples, as a DAC rebuilds the wave ----------
import { windowedSinc } from '../filters/index.ts';

// samples each side of a point that are read to compute it
export const INTERPOLATION_REACH = 12;

/**
 * For each sample, the loudest of it and the points between it and the next sample,
 * found on a copy upsampled `factor` times (a windowed-sinc filter, the samples past either end counted as 0).
 */
export function betweenSamplePeaks(channel: Float32Array, factor: number): Float32Array {
  const kernels = interpolationKernels(factor);
  const padded = new Float32Array(channel.length + 2 * INTERPOLATION_REACH);
  padded.set(channel, INTERPOLATION_REACH);
  const peaks = new Float32Array(channel.length);
  for (let i = 0; i < channel.length; i++) {
    // padded puts sample i at i + reach, so the window for the points after it starts at i + 1
    peaks[i] = Math.max(Math.abs(channel[i] ?? 0), loudestPointIn(padded, i + 1, kernels));
  }
  return peaks;
}

/**
 * The points at 1/factor ... (factor-1)/factor of the way to the next sample, as a filter each,
 * each as long as the window of samples it reads: 2 * INTERPOLATION_REACH.
 */
export function interpolationKernels(factor: number): Float64Array[] {
  const kernels: Float64Array[] = [];
  for (let phase = 1; phase < factor; phase++) {
    kernels.push(interpolationKernel(phase / factor));
  }
  return kernels;
}

/**
 * The loudest of the points between two samples, read from the window of samples that makes them:
 * `start` is where the window begins, at sample i - (reach - 1) for the points after sample i.
 */
export function loudestPointIn(samples: ArrayLike<number>, start: number, kernels: readonly Float64Array[]): number {
  let loudest = 0;
  for (const kernel of kernels) {
    loudest = Math.max(loudest, Math.abs(pointOf(samples, start, kernel)));
  }
  return loudest;
}

// taps for the samples i-(reach-1) ... i+reach, a point `fraction` of the way from i to i+1; they add up to 1
function interpolationKernel(fraction: number): Float64Array {
  const kernel = new Float64Array(2 * INTERPOLATION_REACH);
  let total = 0;
  for (let tap = 0; tap < kernel.length; tap++) {
    const distance = fraction - (tap - (INTERPOLATION_REACH - 1));
    const weight = windowedSinc(distance, INTERPOLATION_REACH);
    kernel[tap] = weight;
    total += weight;
  }
  return kernel.map((weight) => weight / total);
}

function pointOf(samples: ArrayLike<number>, start: number, kernel: Float64Array): number {
  let point = 0;
  for (let tap = 0; tap < kernel.length; tap++) {
    point += (samples[start + tap] ?? 0) * (kernel[tap] ?? 0);
  }
  return point;
}
