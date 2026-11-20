// ---------- plan/blocks/crusher: a bit and sample-rate reducer ----------
// Its bits, the steps each sample is rounded to, fractions between: 16 near clean, 4 a grit.
// Its rate, how often a sample is taken and held, in Hz: the sampler's aliasing, an SP-1200's at 26 kHz, a toy's at 4 kHz.
// Its dsp is libs/dsp/crusher/; a builder runs it in a processor.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

// its params, by their names
export const CRUSHER_SPECS = {
  bits: { name: 'bits', range: [1, 16, 0.1], default: 16 },
  rate: { name: 'rate', unit: 'Hz', range: [200, 48000, 1], default: 48000, taper: 'octaves' },
} as const satisfies ParamSpecs;

const { bits, rate } = CRUSHER_SPECS;

export default {
  kind: 'crusher',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [bits, rate],
  settings: [],
} as const satisfies Block;
