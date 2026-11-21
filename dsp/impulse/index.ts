// ---------- dsp/impulse: a reverb's impulse response, designed rather than recorded (its entry) ----------
// Its parts:
//   - impulse.ts: a pre-delay, early taps and a growing density of echoes, in three bands.
export { designedImpulse, IMPULSE_DEFAULTS, type ImpulseDesign } from './impulse.ts';
