// ---------- libs/dsp/wow/wow: a tape's wow, slow drift that loops ----------
// Noise lowpassed at a cutoff of about 1 Hz, as a curve of an rms of 1.
// Scaled by a depth in seconds, it moves a delay line's time: a tape's speed wandering.
// It runs twice round the same draws and keeps the second round,
// so its end meets its start and the curve loops without a seam.
// Pure: every draw from the `random` handed in.

// `frames` samples of drift at `cutoff` Hz, a mean of 0 and an rms of 1; all zeros where the draws give no drift
export function wowCurve(frames: number, sampleRate: number, random: () => number, cutoff = 1): Float32Array {
  const draws = Float64Array.from({ length: frames }, () => random() * 2 - 1);
  const { b0, b1, a1, a2 } = butterworthLowpass(cutoff, sampleRate);
  const drift = new Float64Array(frames);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let round = 0; round < 2; round++) {
    for (let n = 0; n < frames; n++) {
      const x = draws[n]!;
      const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; // direct form I
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      drift[n] = y; // the second round's overwrite the first's
    }
  }
  const mean = drift.reduce((sum, y) => sum + y, 0) / frames;
  let squares = 0;
  for (let n = 0; n < frames; n++) {
    squares += (drift[n]! - mean) ** 2;
  }
  const rms = Math.sqrt(squares / frames);
  if (rms < 1e-12) {
    return new Float32Array(frames);
  }
  return Float32Array.from(drift, (y) => (y - mean) / rms);
}

// a second-order Butterworth lowpass (a biquad at Q = 1/√2), its coefficients divided by a0
function butterworthLowpass(cutoff: number, sampleRate: number): { b0: number; b1: number; a1: number; a2: number } {
  const turn = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(turn) / (2 * Math.SQRT1_2);
  const cosine = Math.cos(turn);
  const a0 = 1 + alpha;
  return { b0: (1 - cosine) / 2 / a0, b1: (1 - cosine) / a0, a1: (-2 * cosine) / a0, a2: (1 - alpha) / a0 };
}
