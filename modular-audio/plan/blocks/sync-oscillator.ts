// ---------- plan/blocks/sync-oscillator: an oscillator hard-synced to another ----------
// As a synth's VCO 2 synced to VCO 1: a master at its frequency, the note's, unheard.
// A slave sync semitones above it is heard, its phase reset at each turn of the master's,
// so its pitch stays the master's and its sync is its timbre. Swept, it is the classic sync lead's tearing.
// Its wave is the slave's, sawtooth or square, a param: changed as it plays.
// A source: no input. Its detune and stop as an oscillator's.
import type { ParamSpecs } from '../../../base/params/index.ts';
import { STOP, type Block } from './block.ts';

// its params, by their names
export const SYNC_OSCILLATOR_SPECS = {
  frequency: { name: 'frequency', unit: 'Hz', range: [0.01, 20000, 0.01], default: 440, taper: 'octaves' },
  detune: { name: 'detune', unit: 'cents', range: [-4800, 4800, 1], default: 0 },
  sync: { name: 'sync', unit: 'semitones', range: [0, 48, 0.01], default: 0 },
  wave: { name: 'wave', choices: ['sawtooth', 'square'], default: 'sawtooth' },
} as const satisfies ParamSpecs;

const { frequency, detune, sync, wave } = SYNC_OSCILLATOR_SPECS;

export default {
  kind: 'sync oscillator',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [frequency, detune, sync, wave, STOP],
  settings: [],
} as const satisfies Block;
