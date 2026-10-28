// ---------- libs/dsp/true-peak: a true-peak meter and limiter on sample arrays (its entry) ----------
// Its parts:
//   - oversampling.ts: the points between the samples, from a windowed-sinc filter;
//   - meter.ts: the true peak of channels;
//   - limiter.ts: a lookahead limiter that leaves no point over its ceiling.
export { measureTruePeak } from './meter.ts';
export { limitTruePeak, type LimitedChannels, type TruePeakSetup } from './limiter.ts';
