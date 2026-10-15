// ---------- plan/blocks/noise: noise, as a source ----------
// No input, its noise out. Its colour a setting: noise, or a short breath.
import type { Block } from './block.ts';

export default {
  kind: 'noise',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [],
  settings: [{ name: 'colour', choices: ['noise', 'breath'], default: 'noise' }],
} as const satisfies Block;
