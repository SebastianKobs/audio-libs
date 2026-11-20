// ---------- plan/blocks/eq-band: one band of an equalizer, a biquad of its type ----------
// A highpass, a low shelf, a peak or a high shelf, at its frequency, by octaves.
// Its gain a share shown in dB, -24 to +24 (a highpass has none); its resonance the filter's, a Q as a plain ratio, 0.707 flat.
// The filter has no shelves or peak, so this is a block of its own.
// Its type a param, not a setting: Web Audio changes it as it plays, no rebuild.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';
import { RESONANCE } from './filter.ts';

// its params, by their names
export const EQ_BAND_SPECS = {
  type: { name: 'type', choices: ['highpass', 'low shelf', 'peak', 'high shelf'], default: 'peak' },
  frequency: { name: 'frequency', unit: 'Hz', range: [10, 20000, 1], default: 1000, taper: 'octaves' },
  gain: { name: 'gain', range: [-24, 24, 0.1], dB: true, default: 1 },
  resonance: { ...RESONANCE, default: 0.707 },
} as const satisfies ParamSpecs;

const { type, frequency, gain, resonance } = EQ_BAND_SPECS;

export default {
  kind: 'eq band',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [type, frequency, gain, resonance],
  settings: [],
} as const satisfies Block;
