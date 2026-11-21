// ---------- plan/blocks/germanium-stage: a germanium transistor stage, modeled from its circuit ----------
// The Dallas Rangemaster: one germanium PNP, the OC44, as a common-emitter stage on -9 V, its parts and its
// transistor's measured values (Holmes and van Walstijn, DAFx-16; Holmes, Holters and van Walstijn, DAFx-17).
// Not a curve: its bias shifts with the sound, its clip lopsided, its even harmonics leading at every level.
// Its drive is how many volts a unit of the sound is, in dB (0: a full-scale sine at 1 V peak, a hot guitar);
// its level how many units a volt comes back as. Its voicing the treble booster as built, or full range.
// Its dsp is dsp/circuits/germanium-drive.ts; a builder runs it in a processor, at 4 × the rate.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

// its params, by their names; the voicing's choices in the order the processor reads their indexes
export const GERMANIUM_STAGE_SPECS = {
  drive: { name: 'drive', unit: 'dB', range: [-60, 20, 0.1], default: -10 }, // down to a millivolt a unit: a quiet source
  level: { name: 'level', unit: 'dB', range: [-60, 12, 0.1], default: -20 },
  voicing: { name: 'voicing', choices: ['treble booster', 'full range'], default: 'treble booster' },
} as const satisfies ParamSpecs;

const { drive, level, voicing } = GERMANIUM_STAGE_SPECS;

export default {
  kind: 'germanium stage',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [drive, level, voicing],
  settings: [],
} as const satisfies Block;
