// ---------- plan/blocks/envelope: an envelope generator ----------
// As a modular's: no input, its signal out, wired into the params it moves.
// Its gate, opened and closed by the note; its stages' times; its sustain; its amount.
import { SWITCH, type ParamSpecs } from '../../params/index.ts';
import type { Block } from './block.ts';

// Its stages' knobs, by their names; the synth's envelopes too.
//   amount: in its target's units, so a wide range.
//   sustain: a share of its amount.
//   release: none, it rings on.
export const ENVELOPE_SPECS = {
  amount: { name: 'amount', range: [-48, 48, 0.01], default: 1 },
  delay: { name: 'delay', unit: 's', range: [0, 10, 0.001], default: 0 },
  attack: { name: 'attack', unit: 's', range: [0, 10, 0.001], default: 0 },
  hold: { name: 'hold', unit: 's', range: [0, 10, 0.001], default: 0 },
  decay: { name: 'decay', unit: 's', range: [0, 10, 0.001], default: 0 },
  sustain: { name: 'sustain', range: [0, 1, 0.01], default: 1 },
  release: { name: 'release', unit: 's', range: [0, 10, 0.001] },
} as const satisfies ParamSpecs;

const { amount, delay, attack, hold, decay, sustain, release } = ENVELOPE_SPECS;

export default {
  kind: 'envelope',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [{ ...SWITCH, name: 'gate', default: 0 }, delay, attack, hold, decay, sustain, release, amount],
  settings: [],
} as const satisfies Block;
