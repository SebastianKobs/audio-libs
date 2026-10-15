// ---------- plan/blocks/oscillator: a tone ----------
// A source: no input, its wave out. Its frequency and detune; its wave a setting.
import type { Block } from './block.ts';

// its wave, chosen as it's built
export const WAVE = { name: 'wave', choices: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' } as const;
// its detune, in cents: what a vibrato or FM moves
export const DETUNE = { name: 'detune', unit: 'cents', range: [-100, 100, 1] } as const;

export default {
  kind: 'oscillator',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [{ name: 'frequency', unit: 'Hz', range: [20, 20000, 1], default: 440, taper: 'octaves' }, DETUNE],
  settings: [WAVE],
} as const satisfies Block;
