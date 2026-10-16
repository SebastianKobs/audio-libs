// ---------- plan/blocks/lfo: a low-frequency oscillator ----------
// A modulator: no input, its wave out, wired into the params it moves.
// Its rate a time with a sync switch, as the delay's: synced, a note value at the tempo, one
// turn each; free, in Hz. Each builder turns a synced note into a rate by the tempo.
// Its wave a setting, an oscillator's.
// Its start a setting: with the note, from its phase's start; or free, running on the clock.
// Its depth isn't its own: a gain after it, as a modular's attenuator.
import { timeSpecs } from '../../params/index.ts';
import type { Block } from './block.ts';
import { WAVE } from './oscillator.ts';

// its rate's three params: free to start, as every rate the themes have
export const LFO_RATE = timeSpecs({
  unit: 'Hz',
  range: [0.01, 20, 0.01],
  start: { sync: false, note: '1/4', free: 1 },
});

export default {
  kind: 'lfo',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [LFO_RATE.sync, LFO_RATE.note, LFO_RATE.hz],
  settings: [WAVE, { name: 'start', choices: ['note', 'free'], default: 'note' }],
} as const satisfies Block;
