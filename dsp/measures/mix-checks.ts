// ---------- libs/dsp/measures/mix-checks: what "not cheap" is measured by ----------
// Three numbers a render is held to: what a mono sum loses, the spectrum's slope,
// and whether two hits of one drum differ.
// Fed Float32Arrays, they return a dB figure or a boolean; nothing here touches audio.

const BLOCK_LENGTH = 4096; // a power of two: the radix-2 FFT splits blocks of that length only
const SILENT_POWER = 1e-30; // a bin with no energy would read -Infinity dB and wreck the fit

// dB; 0 for two equal channels, about -3 for unrelated noise, -Infinity for one the other's inverse
export function monoLoss(left: Float32Array, right: Float32Array): number {
  const length = Math.min(left.length, right.length);
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    mono[i] = (left[i]! + right[i]!) / 2;
  }
  const meanChannelPower = (powerOf(left, length) + powerOf(right, length)) / 2;
  return 10 * Math.log10(powerOf(mono) / meanChannelPower);
}

function powerOf(samples: Float32Array, length = samples.length): number {
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += samples[i]! * samples[i]!;
  }
  return length === 0 ? 0 : sum / length;
}

// in place, radix-2 decimation in time: the bit-reversed order first, then butterflies of doubling span
export function fft(real: Float64Array, imaginary: Float64Array): void {
  const size = real.length;
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i >= j) {
      continue;
    }
    [real[i], real[j]] = [real[j]!, real[i]!];
    [imaginary[i], imaginary[j]] = [imaginary[j]!, imaginary[i]!];
  }
  for (let span = 2; span <= size; span <<= 1) {
    const angle = (-2 * Math.PI) / span;
    for (let start = 0; start < size; start += span) {
      for (let k = 0; k < span / 2; k++) {
        const cos = Math.cos(angle * k);
        const sin = Math.sin(angle * k);
        const a = start + k;
        const b = a + span / 2;
        const tr = real[b]! * cos - imaginary[b]! * sin;
        const ti = real[b]! * sin + imaginary[b]! * cos;
        real[b] = real[a]! - tr;
        imaginary[b] = imaginary[a]! - ti;
        real[a] = real[a]! + tr;
        imaginary[a] = imaginary[a]! + ti;
      }
    }
  }
}

// dB an octave: a least-squares line through the spectrum's level in dB against log2 of the frequency
export function spectralSlope(samples: Float32Array, sampleRate: number, from = 100, to = 4000): number {
  const power = averagedPowerSpectrum(samples);
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let bin = 1; bin < power.length; bin++) {
    const hz = (bin * sampleRate) / BLOCK_LENGTH;
    if (hz < from || hz > to) {
      continue;
    }
    const octaves = Math.log2(hz);
    const level = 10 * Math.log10(power[bin]! + SILENT_POWER);
    count++;
    sumX += octaves;
    sumY += level;
    sumXY += octaves * level;
    sumXX += octaves * octaves;
  }
  const spread = count * sumXX - sumX * sumX;
  if (count < 2 || spread === 0) {
    return 0;
  } // no band to fit a line through
  return (count * sumXY - sumX * sumY) / spread;
}

// bins 0..N/2 of the Hann-windowed blocks, half overlapping, their powers averaged
function averagedPowerSpectrum(samples: Float32Array): Float64Array {
  const bins = new Float64Array(BLOCK_LENGTH / 2 + 1);
  const hann = Float64Array.from(
    { length: BLOCK_LENGTH },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / BLOCK_LENGTH),
  );
  const step = BLOCK_LENGTH / 2;
  let blocks = 0;
  for (let from = 0; from + BLOCK_LENGTH <= samples.length; from += step) {
    const real = new Float64Array(BLOCK_LENGTH);
    const imaginary = new Float64Array(BLOCK_LENGTH);
    for (let i = 0; i < BLOCK_LENGTH; i++) {
      real[i] = samples[from + i]! * hann[i]!;
    }
    fft(real, imaginary);
    for (let bin = 0; bin < bins.length; bin++) {
      bins[bin]! += real[bin]! ** 2 + imaginary[bin]! ** 2;
    }
    blocks++;
  }
  if (blocks === 0) {
    return bins;
  }
  for (let bin = 0; bin < bins.length; bin++) {
    bins[bin] = bins[bin]! / blocks;
  }
  return bins;
}

// whether the difference, over the shorter hit, is louder than floor dB under the first hit's level
export function hitsDiffer(a: Float32Array, b: Float32Array, floor = -60): boolean {
  const length = Math.min(a.length, b.length);
  const difference = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    difference[i] = a[i]! - b[i]!;
  }
  const differenceRms = Math.sqrt(powerOf(difference));
  return differenceRms > Math.sqrt(powerOf(a)) * 10 ** (floor / 20);
}
