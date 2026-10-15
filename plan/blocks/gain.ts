// ---------- plan/blocks/gain: a level ----------
// Its gain, a share: 1 as it comes, 2 twice as loud.
import type { Block } from './block.ts';

export default {
  kind: 'gain',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [{ name: 'gain', range: [0, 2, 0.01], default: 1 }],
  settings: [],
} as const satisfies Block;
