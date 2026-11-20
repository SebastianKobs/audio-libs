// ---------- libs/dsp/filters: filter coefficients worked out from a cutoff, and a filter run (its entry) ----------
// Its parts:
//   - biquad.ts: a second-order filter run over samples;
//   - one-pole.ts: a first-order lowpass, 6 dB an octave.
export { runBiquad, type Biquad } from './biquad.ts';
export { onePoleLowpass, type IirCoefficients } from './one-pole.ts';
