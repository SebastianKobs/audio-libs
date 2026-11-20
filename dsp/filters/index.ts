// ---------- libs/dsp/filters: filter coefficients worked out from a cutoff, and a filter run (its entry) ----------
// Its parts:
//   - biquad.ts: a second-order filter run over samples;
//   - one-pole.ts: a first-order lowpass, 6 dB an octave;
//   - saturating-filter.ts: a ladder or a state-variable filter with a soft clip in its loop, singing from its own noise;
//   - saturating-filter-channels.ts: that filter a channel of a block, let go once told to stop;
//   - windowed-sinc.ts: the tap of an interpolating filter, a sinc under a Kaiser window.
export { runBiquad, type Biquad } from './biquad.ts';
export { onePoleLowpass, type IirCoefficients } from './one-pole.ts';
export { LATENCY, SaturatingFilter, type SaturatingFilterSetup, type SaturatingParams } from './saturating-filter.ts';
export { SaturatingFilterChannels, type SaturatingFilterChannelsSetup } from './saturating-filter-channels.ts';
export { windowedSinc } from './windowed-sinc.ts';
