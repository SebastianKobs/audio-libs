// ---------- plan/blocks/filter: a filter ----------
// Its frequency, by octaves, wide open to start, and its resonance; its type a setting.
// The three types the themes use; another added when a sound asks for it.
import type { Block } from './block.ts';

// its resonance, its Q
export const RESONANCE = { name: 'resonance', range: [0, 30, 0.001] } as const;

export default {
  kind: 'filter',
  inputs: [{ name: 'in' }],
  outputs: [{ name: 'out' }],
  params: [{ name: 'frequency', unit: 'Hz', range: [20, 24000, 1], default: 24000, taper: 'octaves' }, RESONANCE],
  settings: [{ name: 'type', choices: ['lowpass', 'highpass', 'bandpass'], default: 'lowpass' }],
} as const satisfies Block;
