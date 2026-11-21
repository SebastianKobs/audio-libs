// ---------- plan/blocks/grains: a granular freeze and smear ----------
// It keeps the last GRAINS_MEMORY seconds of its input and plays short overlapping grains from it:
//   - freeze: on, it stops listening, the grains playing what it held;
//   - position: how far back from now a grain starts; size, its length; density, grains a second;
//   - pitch: a grain's playback, in semitones; spray: how far a grain's start strays from its position, a smear.
// Its output the grains alone: a template mixes them with the dry. A tail: its grains ring on past its input.
// Its dsp is dsp/grains/; a builder runs it in a processor.
import { SWITCH, type ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

export const GRAINS_MEMORY = 2; // s of its input it keeps

// its params, by their names
export const GRAINS_SPECS = {
  freeze: { ...SWITCH, name: 'freeze', default: 0 },
  position: { name: 'position', unit: 's', range: [0.02, 1.5, 0.01], default: 0.25 },
  size: { name: 'size', unit: 's', range: [0.01, 0.4, 0.001], default: 0.08 },
  density: { name: 'density', unit: 'Hz', range: [1, 60, 0.1], default: 12 },
  pitch: { name: 'pitch', unit: 'semitones', range: [-12, 12, 0.01], default: 0 },
  spray: { name: 'spray', unit: 's', range: [0, 0.4, 0.001], default: 0.02 },
} as const satisfies ParamSpecs;

const { freeze, position, size, density, pitch, spray } = GRAINS_SPECS;

export default {
  kind: 'grains',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [freeze, position, size, density, pitch, spray],
  settings: [],
  tail: true,
} as const satisfies Block;
