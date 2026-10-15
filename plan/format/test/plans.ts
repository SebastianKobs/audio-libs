// Plans written out, as a planner would hand them out: the format's examples, its tests' data.
// Typed as plans, so the type check holds them to the format.
//   UTILITY: an effect, a gain into a pan; its level and pan macros onto theirs.
//   SYNTH: an instrument, a pool of voices; a voice an oscillator into a gain its envelope moves.
import type { Node, Plan } from '../index.ts';

const STEREO = 2;
const MONO = 1;

// a gain into a pan, as the Utility is: its level and its pan, macros onto the two's
export const UTILITY: Plan = {
  version: 1,
  node: {
    name: 'utility',
    kind: 'Utility',
    inputs: [{ name: 'in', channels: STEREO }],
    outputs: [{ name: 'out', channels: STEREO }],
    params: [],
    settings: [],
    inside: {
      children: [
        {
          name: 'gain',
          kind: 'gain',
          inputs: [{ name: 'in', channels: STEREO }],
          outputs: [{ name: 'out', channels: STEREO }],
          params: [{ spec: { name: 'gain', range: [0, 4, 0.01], default: 1 }, value: 1 }],
          settings: [],
        },
        {
          name: 'pan',
          kind: 'pan',
          inputs: [{ name: 'in', channels: STEREO }],
          outputs: [{ name: 'out', channels: STEREO }],
          params: [{ spec: { name: 'pan', range: [-1, 1, 0.01], default: 0 }, value: 0 }],
          settings: [{ spec: { name: 'law', choices: ['stereo', 'pan pot'] }, value: 'stereo' }],
        },
      ],
      wires: [
        { from: { input: 'in' }, to: { node: 'gain', input: 'in' } },
        { from: { node: 'gain', output: 'out' }, to: { node: 'pan', input: 'in' } },
        { from: { node: 'pan', output: 'out' }, to: { output: 'out' } },
      ],
      macros: [
        {
          spec: { name: 'level', range: [0, 4, 0.01], default: 1 },
          value: 1,
          hint: 'How loud it comes out.',
          maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }],
        },
        {
          spec: { name: 'pan', range: [-1, 1, 0.01], default: 0 },
          value: 0,
          maps: [{ to: ['pan', 'pan'], factor: 1, offset: 0 }],
        },
      ],
      pools: [],
    },
  },
};

// a voice: an oscillator into a gain, its envelope's signal wired into the gain's own level
const VOICE: Node = {
  name: 'voice',
  kind: 'voice',
  inputs: [],
  outputs: [{ name: 'out', channels: MONO }],
  params: [],
  settings: [],
  inside: {
    children: [
      {
        name: 'oscillator',
        kind: 'oscillator',
        inputs: [],
        outputs: [{ name: 'out', channels: MONO }],
        params: [{ spec: { name: 'frequency', unit: 'Hz', range: [20, 20000, 1], taper: 'octaves' }, value: 440 }],
        settings: [{ spec: { name: 'wave', choices: ['sine', 'triangle', 'square', 'sawtooth'] }, value: 'sine' }],
      },
      {
        name: 'vca',
        kind: 'gain',
        inputs: [{ name: 'in', channels: MONO }],
        outputs: [{ name: 'out', channels: MONO }],
        params: [{ spec: { name: 'gain', range: [0, 1, 0.01] }, value: 0 }],
        settings: [],
      },
      {
        name: 'envelope',
        kind: 'envelope',
        inputs: [],
        outputs: [{ name: 'out', channels: MONO }],
        params: [
          { spec: { name: 'gate', range: [0, 1, 1] }, value: 0 },
          { spec: { name: 'attack', unit: 's', range: [0, 10, 0.001] }, value: 0.01 },
          { spec: { name: 'release', unit: 's', range: [0, 10, 0.001] }, value: 0.3 },
        ],
        settings: [],
      },
    ],
    wires: [
      { from: { node: 'oscillator', output: 'out' }, to: { node: 'vca', input: 'in' } },
      { from: { node: 'envelope', output: 'out' }, to: { node: 'vca', param: 'gain' } },
      { from: { node: 'vca', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [],
    pools: [],
  },
};

// an instrument: no voice of its own until a note comes, its pool's voice ready, each copy into its output
export const SYNTH: Plan = {
  version: 1,
  node: {
    name: 'synth',
    kind: 'instrument',
    inputs: [],
    outputs: [{ name: 'out', channels: MONO }],
    params: [],
    settings: [],
    inside: {
      children: [],
      wires: [],
      macros: [],
      pools: [
        {
          child: VOICE,
          wires: [{ from: { node: 'voice', output: 'out' }, to: { output: 'out' } }],
          note: { pitch: [['oscillator', 'frequency']], velocity: [], gate: [['envelope', 'gate']] },
        },
      ],
    },
  },
};
