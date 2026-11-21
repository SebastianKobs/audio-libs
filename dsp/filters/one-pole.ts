// ---------- dsp/filters/one-pole: a first-order lowpass's coefficients, 6 dB an octave ----------
// No biquad type falls 6 dB an octave, so it's an IIRFilterNode's.
// It is the bilinear transform of 1 / (1 + s/ω), its cutoff prewarped so it's -3 dB where asked.
// A cutoff past what the rate holds is kept a little under it: a pole past Nyquist is unstable.

// an IIRFilterNode's coefficients: y[n] = b0·x[n] + b1·x[n-1] - a1·y[n-1]
export interface IirCoefficients {
  readonly feedforward: readonly number[];
  readonly feedback: readonly number[];
}

const TOP = 0.45; // of the sample rate: the highest cutoff kept

export function onePoleLowpass(hz: number, sampleRate: number): IirCoefficients {
  const cutoff = Math.min(hz, TOP * sampleRate);
  const k = Math.tan((Math.PI * cutoff) / sampleRate);
  const b = k / (1 + k);
  return { feedforward: [b, b], feedback: [1, (k - 1) / (k + 1)] };
}
