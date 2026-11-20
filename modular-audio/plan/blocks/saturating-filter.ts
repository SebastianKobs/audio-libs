// ---------- plan/blocks/saturating-filter: a filter that saturates and sings ----------
// A ladder (24 dB) or a state-variable (12 dB: lowpass, bandpass, highpass) with a tanh where its input meets its feedback
// (its dsp is libs/dsp/filters/saturating-filter.ts, run by a builder in a processor).
// Its resonance 0 to 1, not the library filter's Q: past 0.909 it sings out of nothing, a sine at its cutoff,
// its level held by the clip. Its drive pushes the sound into the clip and takes it back,
// its compensation gives the ladder's thinned lows back as the resonance rises.
// Its frequency and detune as the filter block's (a cutoff following the keys, an envelope sweeping it in cents);
// its mode a param, changed as it plays: its index is the processor's.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

// its params, by their names; the choices of its mode in the order the processor reads their indexes
export const SATURATING_FILTER_SPECS = {
  frequency: { name: 'frequency', unit: 'Hz', range: [20, 24000, 1], default: 24000, taper: 'octaves' },
  detune: { name: 'detune', unit: 'cents', range: [-9600, 9600, 1], default: 0 },
  resonance: { name: 'resonance', range: [0, 1, 0.001], default: 0 },
  drive: { name: 'drive', range: [0.1, 10, 0.01], default: 1, taper: 'octaves' },
  compensation: { name: 'compensation', range: [0, 1, 0.01], default: 0 },
  mode: { name: 'mode', choices: ['ladder', 'lowpass', 'bandpass', 'highpass'], default: 'ladder' },
} as const satisfies ParamSpecs;

const { frequency, detune, resonance, drive, compensation, mode } = SATURATING_FILTER_SPECS;

export default {
  kind: 'saturating filter',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [frequency, detune, resonance, drive, compensation, mode],
  settings: [],
} as const satisfies Block;
