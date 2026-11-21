// ---------- dsp/loudness/loudness: an integrated loudness in LUFS, after ITU-R BS.1770-4 ----------
// K-weighting first: a shelf lifting the highs about 4 dB, then a highpass near 38 Hz, so the number
// follows what's heard. Then the mean square of 400 ms blocks overlapping 75%, gated.
// Each biquad is worked out from its analog values for the sample rate at hand,
// so no table of one rate's coefficients is kept.

import { runBiquad, type Biquad } from '../filters/index.ts';

// the analog shelf and highpass the standard's coefficients come from
const SHELF_HZ = 1681.974450955533;
const SHELF_GAIN_DB = 3.999843853973347;
const SHELF_Q = 0.7071752369554196;
// the shelf's band gain Vb = Vh^this, Vh the shelf's gain as a ratio
const SHELF_BAND_EXPONENT = 0.4996667741545416;
const HIGHPASS_HZ = 38.13547087602444;
const HIGHPASS_Q = 0.5003270373238773;

const BLOCK_SECONDS = 0.4;
const BLOCK_OVERLAP = 0.75;
const OFFSET_LUFS = -0.691; // makes a 1 kHz sine at -23 dBFS in both channels read -23 LUFS
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = 10;

// the samples as heard by the meter: the shelf, then the highpass
export function kWeighted(samples: Float32Array, sampleRate: number): Float32Array {
  return Float32Array.from(kWeightedDoubles(samples, sampleRate));
}

function kWeightedDoubles(samples: Float32Array, sampleRate: number): Float64Array {
  const lifted = runBiquad(samples, shelfBiquad(sampleRate));
  return runBiquad(lifted, highpassBiquad(sampleRate));
}

// bilinear transform of the analog high shelf, its poles prewarped to the shelf's frequency
function shelfBiquad(sampleRate: number): Biquad {
  const k = Math.tan((Math.PI * SHELF_HZ) / sampleRate);
  const highGain = 10 ** (SHELF_GAIN_DB / 20);
  const bandGain = highGain ** SHELF_BAND_EXPONENT;
  const a0 = 1 + k / SHELF_Q + k * k;
  return {
    b0: (highGain + (bandGain * k) / SHELF_Q + k * k) / a0,
    b1: (2 * (k * k - highGain)) / a0,
    b2: (highGain - (bandGain * k) / SHELF_Q + k * k) / a0,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / SHELF_Q + k * k) / a0,
  };
}

// bilinear transform of the analog second-order highpass, unity gain at the top
function highpassBiquad(sampleRate: number): Biquad {
  const k = Math.tan((Math.PI * HIGHPASS_HZ) / sampleRate);
  const a0 = 1 + k / HIGHPASS_Q + k * k;
  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / HIGHPASS_Q + k * k) / a0,
  };
}

// LUFS; -Infinity for silence, or nothing above the gates
export function integratedLoudness(channels: readonly Float32Array[], sampleRate: number): number {
  if (channels.length === 0) {
    return -Infinity;
  }
  const loudEnough = blockPowers(channels, sampleRate).filter((power) => loudnessOf(power) > ABSOLUTE_GATE_LUFS);
  if (loudEnough.length === 0) {
    return -Infinity;
  }
  const relativeGate = loudnessOf(meanOf(loudEnough)) - RELATIVE_GATE_LU;
  const kept = loudEnough.filter((power) => loudnessOf(power) > relativeGate);
  return loudnessOf(meanOf(kept));
}

function loudnessOf(power: number): number {
  return OFFSET_LUFS + 10 * Math.log10(power);
}

function meanOf(powers: readonly number[]): number {
  let sum = 0;
  for (const power of powers) {
    sum += power;
  }
  return sum / powers.length;
}

// every channel weighted 1; the blocks' powers are the sum over channels of their mean squares
function blockPowers(channels: readonly Float32Array[], sampleRate: number): number[] {
  const blockLength = Math.round(BLOCK_SECONDS * sampleRate);
  const step = Math.round(blockLength * (1 - BLOCK_OVERLAP));
  const perChannel = channels.map((channel) =>
    blockMeanSquares(kWeightedDoubles(channel, sampleRate), blockLength, step),
  );
  const blocks = Math.min(...perChannel.map((meanSquares) => meanSquares.length));
  return Array.from({ length: blocks }, (_, block) =>
    perChannel.reduce((sum, meanSquares) => sum + meanSquares[block]!, 0),
  );
}

// one channel's mean square in each block of blockLength samples, a block every step samples
function blockMeanSquares(weighted: Float64Array, blockLength: number, step: number): Float64Array {
  const blocks = weighted.length < blockLength ? 0 : Math.floor((weighted.length - blockLength) / step) + 1;
  const meanSquares = new Float64Array(blocks);
  for (let block = 0; block < blocks; block++) {
    const from = block * step;
    let sum = 0;
    for (let i = from; i < from + blockLength; i++) {
      sum += weighted[i]! * weighted[i]!;
    }
    meanSquares[block] = sum / blockLength;
  }
  return meanSquares;
}
