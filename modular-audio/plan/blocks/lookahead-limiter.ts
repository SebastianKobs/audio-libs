// ---------- plan/blocks/lookahead-limiter: a limiter that looks ahead and holds the true peak ----------
// A soft clip, then the gain brought down ahead of what would go over the ceiling, as dsp/true-peak plans it, run in the stream.
// Its gain into it in dB, its ceiling in dBTP: the true peak, between the samples too, held under it; its release in s; its clip in dB,
// how far over the ceiling the soft clip lets a peak go before the gain takes the rest.
// The lookahead is each builder's own, 5 ms, not a param. The limiter (limiter.ts) holds a ceiling in dBFS.
import type { ParamSpecs } from '../../../base/params/index.ts';
import type { Block } from './block.ts';

// its params, by their names
export const LOOKAHEAD_LIMITER_SPECS = {
  gain: { name: 'gain', unit: 'dB', range: [-12, 24, 0.1], default: 0 },
  ceiling: { name: 'ceiling', unit: 'dBTP', range: [-12, 0, 0.1], default: -1 },
  release: { name: 'release', unit: 's', range: [0.01, 1, 0.01], default: 0.1 },
  clip: { name: 'clip', unit: 'dB', range: [0, 24, 0.1], default: 3 },
} as const satisfies ParamSpecs;

const { gain, ceiling, release, clip } = LOOKAHEAD_LIMITER_SPECS;

export default {
  kind: 'lookahead limiter',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [gain, ceiling, release, clip],
  settings: [],
} as const satisfies Block;
