// ---------- plan/blocks/operators: four phase-modulation operators, a source ----------
// A DX's way: each operator a wave at a ratio of the note.
// A modulator shifts a carrier's phase, so the pitch holds as the brightness moves; one operator feeds itself.
// The carriers summed are the sound.
// A modulator's level is its index in radians, a carrier's its loudness:
// a card cables an envelope into each level (libs/dsp/operator-levels/ turns a DX's 0 to 99 into radians).
// Its wave is one of the TX81Z's eight, by its index.
// The algorithm (which operators modulate which, which are heard) and the start phase are read once, as a voice is made:
// they are params, and told later they hold the value and move nothing.
// A source: no input. Its stop as an oscillator's.
import type { ParamSpecs } from '../../../base/params/index.ts';
import { STOP, type Block } from './block.ts';

const WAVES = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'] as const;

// its params, by their names
export const OPERATORS_SPECS = {
  frequency: { name: 'frequency', unit: 'Hz', range: [0.01, 20000, 0.01], default: 440, taper: 'octaves' },
  detune: { name: 'detune', unit: 'cents', range: [-4800, 4800, 1], default: 0 },
  feedback: { name: 'feedback', range: [0, 4, 0.001], default: 0 },
  ratio1: { name: 'ratio1', range: [0, 32, 0.01], default: 1 },
  detune1: { name: 'detune1', unit: 'cents', range: [-1200, 1200, 0.1], default: 0 },
  level1: { name: 'level1', range: [0, 40, 0.001], default: 1 },
  wave1: { name: 'wave1', choices: WAVES, default: 'W1' },
  ratio2: { name: 'ratio2', range: [0, 32, 0.01], default: 1 },
  detune2: { name: 'detune2', unit: 'cents', range: [-1200, 1200, 0.1], default: 0 },
  level2: { name: 'level2', range: [0, 40, 0.001], default: 0 },
  wave2: { name: 'wave2', choices: WAVES, default: 'W1' },
  ratio3: { name: 'ratio3', range: [0, 32, 0.01], default: 1 },
  detune3: { name: 'detune3', unit: 'cents', range: [-1200, 1200, 0.1], default: 0 },
  level3: { name: 'level3', range: [0, 40, 0.001], default: 0 },
  wave3: { name: 'wave3', choices: WAVES, default: 'W1' },
  ratio4: { name: 'ratio4', range: [0, 32, 0.01], default: 1 },
  detune4: { name: 'detune4', unit: 'cents', range: [-1200, 1200, 0.1], default: 0 },
  level4: { name: 'level4', range: [0, 40, 0.001], default: 0 },
  wave4: { name: 'wave4', choices: WAVES, default: 'W1' },
  algorithm: { name: 'algorithm', range: [1, 8, 1], default: 1 },
  phase: { name: 'phase', choices: ['reset', 'free'], default: 'reset' },
} as const satisfies ParamSpecs;

export default {
  kind: 'operators',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [...Object.values(OPERATORS_SPECS), STOP], // in the order above: a voice's note, then each operator, then how they meet
  settings: [],
} as const satisfies Block;
