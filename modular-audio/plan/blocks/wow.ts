// ---------- plan/blocks/wow: a tape's wow, slow drift as a signal ----------
// A source: no input, one channel out, an rms of 1 that wanders at about its frequency in Hz, never repeating inside 64 s
// (dsp/wow/).
// Beside the noise block, whose buffer is 2 s on a loop: its wobble would repeat every 2 s.
// Scaled by a gain it moves a delay line's time.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

const SPECS = {
  frequency: { name: 'frequency', unit: 'Hz', range: [0.1, 10, 0.01], default: 1, taper: 'octaves' },
} as const satisfies ParamSpecs;

export default {
  kind: 'wow',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [SPECS.frequency],
  settings: [],
} as const satisfies Block;
