// ---------- libs/dsp/measures: what a rendered hit or mix is measured by (its entry) ----------
// Its parts:
//   - measures.ts: a hit's onset, level, fall, pitch, band level and share, partial level;
//   - mix-checks.ts: the mono sum's loss, the spectrum's slope, whether two hits differ, and the FFT;
//   - lag.ts: how late a click comes back.
export { bandLevel, bandShare, fallTime, levelAt, onsetOf, partialLevel, pitchAt } from './measures.ts';
export { fft, hitsDiffer, monoLoss, spectralSlope } from './mix-checks.ts';
export { lagOf } from './lag.ts';
