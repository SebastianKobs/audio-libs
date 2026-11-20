// ---------- plan/blocks/compressor: a compressor, the browser's, its make-up taken back ----------
// Its threshold in dBFS, its knee in dB, its ratio, its attack and release in s.
// Beside the limiter, which holds at a ceiling as hard as the node goes: this one is set at a gentle ratio and a soft
// knee, for glue.
// Starting values: a ratio of 2, an attack of 10 to 30 ms, a release of 0.1 to 0.3 s; the threshold and the knee are
// estimates, the node's default knee of 30 dB rounds everything off.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

const SPECS = {
  threshold: { name: 'threshold', unit: 'dBFS', range: [-60, 0, 0.1], default: -18 },
  knee: { name: 'knee', unit: 'dB', range: [0, 40, 0.1], default: 6 },
  ratio: { name: 'ratio', range: [1, 20, 0.1], default: 2 },
  attack: { name: 'attack', unit: 's', range: [0.001, 1, 0.001], default: 0.02 },
  release: { name: 'release', unit: 's', range: [0.01, 1, 0.01], default: 0.2 },
} as const satisfies ParamSpecs;

const { threshold, knee, ratio, attack, release } = SPECS;

export default {
  kind: 'compressor',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [threshold, knee, ratio, attack, release],
  settings: [],
} as const satisfies Block;
