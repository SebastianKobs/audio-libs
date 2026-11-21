// ---------- dsp/true-peak: a true-peak meter and limiter on sample arrays (its entry) ----------
// Its parts:
//   - oversampling.ts: the points between the samples, from a windowed-sinc filter;
//   - meter.ts: the true peak of channels;
//   - lookahead-limiter.ts: a soft clip into a limiter that looks ahead, run in the stream;
//   - limiter.ts: that limiter on whole channels, leaving no point over its ceiling.
export { measureTruePeak } from './meter.ts';
export { limitTruePeak, type LimitedChannels, type TruePeakSetup } from './limiter.ts';
export { LookaheadLimiter, softClipped, type LookaheadParams, type LookaheadSetup } from './lookahead-limiter.ts';
