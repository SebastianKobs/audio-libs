// ---------- dsp/dynamics: what a compressor does to a steady level (its entry) ----------
// Its parts:
//   - compressor-curve.ts: the level a browser's compressor brings a sound to, and its make-up gain.
export { compressedLevel, compressorMakeup, type CompressorSettings } from './compressor-curve.ts';
