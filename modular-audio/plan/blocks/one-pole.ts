// ---------- plan/blocks/one-pole: a first-order lowpass, 6 dB an octave ----------
// Gentler than any of the filter's (12 dB an octave at least): a high cut that rolls fizz off as an old desk's tone does.
// Wide open to start.
import type { Block } from './block.ts';

export default {
  kind: 'one pole',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [{ name: 'frequency', unit: 'Hz', range: [20, 24000, 1], default: 24000, taper: 'octaves' }],
  settings: [],
} as const satisfies Block;
