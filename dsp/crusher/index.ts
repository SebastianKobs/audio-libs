// ---------- libs/dsp/crusher: a bit and sample-rate reducer, on sample arrays (its entry) ----------
// Its parts:
//   - crusher.ts: a channel's samples held at a rate and rounded to its bits' steps, and a crusher a channel.
export { Crusher, crushed, type CrusherSettings, type CrusherState } from './crusher.ts';
