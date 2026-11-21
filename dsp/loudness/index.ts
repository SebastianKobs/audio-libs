// ---------- dsp/loudness: an integrated loudness in LUFS, after ITU-R BS.1770-4 (its entry) ----------
// Its parts:
//   - loudness.ts: K-weighting, then the gated mean square of 400 ms blocks.
export { integratedLoudness, kWeighted } from './loudness.ts';
