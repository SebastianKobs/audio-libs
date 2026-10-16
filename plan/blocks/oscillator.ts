// ---------- plan/blocks/oscillator: a tone ----------
// A source: no input, its wave out. Its frequency and detune; its wave a setting.
// Its detune wide enough for a voice card's tune, four octaves either way: a ratio to the note
// is a tune in semitones, as pitch adds where ratios multiply.
// Its stop, where it has one.
import { STOP, type Block } from './block.ts';

// its wave, chosen as it's built
export const WAVE = { name: 'wave', choices: ['sine', 'triangle', 'square', 'sawtooth'], default: 'sine' } as const;
// its detune, in cents: what a vibrato or FM moves
export const DETUNE = { name: 'detune', unit: 'cents', range: [-100, 100, 1] } as const;
// a block's detune wide enough for a voice card's tune, four octaves either way: an
// oscillator's, a filter's
export const TUNE_DETUNE = { ...DETUNE, range: [-4800, 4800, 1], default: 0 } as const;

export default {
  kind: 'oscillator',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [{ name: 'frequency', unit: 'Hz', range: [20, 20000, 1], default: 440, taper: 'octaves' }, TUNE_DETUNE, STOP],
  settings: [WAVE],
} as const satisfies Block;
