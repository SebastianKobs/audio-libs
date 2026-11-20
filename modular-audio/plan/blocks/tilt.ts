// ---------- plan/blocks/tilt: a tilt EQ, an AM radio's tone control ----------
// Its tilt a share shown in dB, -12 to +12: the highs up by half of it and the lows down by half of it, about its pivot;
// below 1 the other way, darker. The filter has no shelves, so it's a block of its own.
import type { Block } from './block.ts';

export default {
  kind: 'tilt',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [
    { name: 'tilt', range: [-12, 12, 0.1], dB: true, default: 1 },
    { name: 'frequency', unit: 'Hz', range: [100, 5000, 1], default: 800, taper: 'octaves' },
  ],
  settings: [],
} as const satisfies Block;
