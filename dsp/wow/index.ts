// ---------- dsp/wow: a tape's wow, slow drift that loops (its entry) ----------
// Its parts:
//   - wow.ts: noise lowpassed at about 1 Hz, as a curve of an rms of 1.
export { wowCurve } from './wow.ts';
