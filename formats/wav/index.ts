// ---------- libs/formats/wav: a WAV file's bytes from float channels, 16-bit PCM, dithered (its entry) ----------
// Its parts:
//   - wav.ts: the encoder, a RIFF header and the interleaved samples.
export { encodeWav, type WavSetup } from './wav.ts';
