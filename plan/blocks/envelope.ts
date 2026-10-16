// ---------- plan/blocks/envelope: an envelope generator ----------
// As a modular's: no input, its signal out, wired into the params it moves.
// Its gate, opened and closed by the note; its stages' times; its sustain; its amount.
// Its curve a setting:
//   - exponential: up in a line, down straight in dB, as a level falls;
//   - target: each stage approaching its point by its time, as an analog's;
//   - linear: every stage in a line, as a pitch in semitones moves.
// Its mode a setting, as Ableton's: the gate's, released as the note ends; or a trigger's,
// running on past the note-off, a struck sound ringing out.
import { SWITCH, type ParamSpecs } from '../../params/index.ts';
import type { Block } from './block.ts';

// an envelope's curve, one of its setting's choices
export type EnvelopeCurve = (typeof CURVES)[number];

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
// an envelope's release to start, its mode the gate's: short, no click
const RELEASE = 0.1;
// its curve's choices, the first to start: most envelopes move a level
const CURVES = ['exponential', 'target', 'linear'] as const;

export default {
  kind: 'envelope',
  inputs: [],
  outputs: [{ name: 'out', channels: 1 }],
  params: [
    { ...SWITCH, name: 'gate', default: 0 },
    delay,
    attack,
    hold,
    decay,
    sustain,
    { ...release, default: RELEASE },
    amount,
  ],
  settings: [
    { name: 'curve', choices: CURVES, default: CURVES[0] },
    { name: 'mode', choices: ['gate', 'trigger'], default: 'gate' },
  ],
} as const satisfies Block;
