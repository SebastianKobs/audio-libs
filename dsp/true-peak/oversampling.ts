// ---------- libs/dsp/true-peak: the points between a channel's samples, as a DAC rebuilds the wave ----------

// samples each side of a point that are read to compute it
export const INTERPOLATION_REACH = 12;
const KAISER_BETA = 8; // a stopband near -70 dB: the error of a point stays far under a hundredth of a dB

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
    peaks[i] = Math.max(Math.abs(channel[i] ?? 0), loudestPointAfter(padded, i, kernels));
  }
  return peaks;
}

// the points at 1/factor ... (factor-1)/factor of the way to the next sample, as a filter each
function interpolationKernels(factor: number): Float64Array[] {
  const kernels: Float64Array[] = [];
  for (let phase = 1; phase < factor; phase++) {
    kernels.push(interpolationKernel(phase / factor));
  }
  return kernels;
}

// taps for the samples i-(reach-1) ... i+reach, a point `fraction` of the way from i to i+1; they add up to 1
function interpolationKernel(fraction: number): Float64Array {
  const kernel = new Float64Array(2 * INTERPOLATION_REACH);
  let total = 0;
  for (let tap = 0; tap < kernel.length; tap++) {
    const distance = fraction - (tap - (INTERPOLATION_REACH - 1));
    const weight = sinc(distance) * kaiser(distance / INTERPOLATION_REACH);
    kernel[tap] = weight;
    total += weight;
  }
  return kernel.map((weight) => weight / total);
}

function loudestPointAfter(padded: Float32Array, sample: number, kernels: readonly Float64Array[]): number {
  let loudest = 0;
  for (const kernel of kernels) {
    loudest = Math.max(loudest, Math.abs(pointOf(padded, sample, kernel)));
  }
  return loudest;
}

// padded holds the channel after INTERPOLATION_REACH zeros, so sample i sits at i + reach
function pointOf(padded: Float32Array, sample: number, kernel: Float64Array): number {
  const first = sample + 1; // sample i - (reach - 1), shifted by the padding
  let point = 0;
  for (let tap = 0; tap < kernel.length; tap++) {
    point += (padded[first + tap] ?? 0) * (kernel[tap] ?? 0);
  }
  return point;
}

function sinc(distance: number): number {
  if (distance === 0) {
    return 1;
  }
  return Math.sin(Math.PI * distance) / (Math.PI * distance);
}

// a window that is 1 at 0 and falls to nearly 0 at ±1
function kaiser(position: number): number {
  return besselI0(KAISER_BETA * Math.sqrt(Math.max(0, 1 - position * position))) / besselI0(KAISER_BETA);
}

// the series Σ ((x/2)^k / k!)² → a loop that adds terms until they stop mattering
function besselI0(value: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; term > 1e-12 * sum; k++) {
    term *= (value / (2 * k)) ** 2;
    sum += term;
  }
  return sum;
}
