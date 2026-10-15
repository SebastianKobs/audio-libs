// Small templates, as a theme or the studio's setup would write them: the planner's tests' data.
//   UTILITY: a gain into a pan, its level and pan macros onto theirs.
//   STRIP: a Utility, then a lowpass, its level a macro onto the Utility's.
//   VOICE, SYNTH: an instrument, a pool of voices, each an oscillator into a gain its envelope moves.
//   LOOP: a delay fed back through a gain, from a mono input.

const PLAIN = { factor: 1, offset: 0 };

export const UTILITY = {
  kind: 'Utility',
  inputs: [{ name: 'in', channels: 2 }],
  outputs: [{ name: 'out', channels: 2 }],
  children: [
    { name: 'gain', kind: 'gain' },
    { name: 'pan', kind: 'pan' },
  ],
  wires: [
    { from: { input: 'in' }, to: { node: 'gain', input: 'in' } },
    { from: { node: 'gain', output: 'out' }, to: { node: 'pan', input: 'in' } },
    { from: { node: 'pan', output: 'out' }, to: { output: 'out' } },
  ],
  macros: [
    {
      spec: { name: 'level', range: [0, 2, 0.01], default: 1 },
      value: 1,
      hint: 'How loud it comes out.',
      maps: [{ to: ['gain', 'gain'], ...PLAIN }],
    },
    { spec: { name: 'pan', range: [-1, 1, 0.01], default: 0 }, value: 0, maps: [{ to: ['pan', 'pan'], ...PLAIN }] },
  ],
};

export const STRIP = {
  kind: 'Strip',
  form: 'channel',
  inputs: [{ name: 'in', channels: 2 }],
  outputs: [{ name: 'out', channels: 2 }],
  children: [
    { name: 'utility', kind: 'Utility', role: 'insert' },
    { name: 'lowpass', kind: 'filter', role: 'insert', values: { frequency: 2400 } },
  ],
  wires: [
    { from: { input: 'in' }, to: { node: 'utility', input: 'in' } },
    { from: { node: 'utility', output: 'out' }, to: { node: 'lowpass', input: 'in' } },
    { from: { node: 'lowpass', output: 'out' }, to: { output: 'out' } },
  ],
  macros: [
    {
      spec: { name: 'volume', range: [0, 2, 0.01], default: 1 },
      value: 0.5,
      maps: [{ to: ['utility', 'level'], ...PLAIN }],
    },
  ],
};

export const VOICE = {
  kind: 'Voice',
  outputs: [{ name: 'out', channels: 1 }],
  children: [
    { name: 'oscillator', kind: 'oscillator', settings: { wave: 'triangle' } },
    { name: 'vca', kind: 'gain', values: { gain: 0 } },
    { name: 'envelope', kind: 'envelope', values: { attack: 0.01, release: 0.3 } },
  ],
  wires: [
    { from: { node: 'oscillator', output: 'out' }, to: { node: 'vca', input: 'in' } },
    { from: { node: 'envelope', output: 'out' }, to: { node: 'vca', param: 'gain' } },
    { from: { node: 'vca', output: 'out' }, to: { output: 'out' } },
  ],
};

export const SYNTH = {
  kind: 'Synth',
  outputs: [{ name: 'out', channels: 1 }],
  pools: [
    {
      child: { name: 'voice', kind: 'Voice' },
      wires: [{ from: { node: 'voice', output: 'out' }, to: { output: 'out' } }],
      note: { pitch: [['oscillator', 'frequency']], velocity: [], gate: [['envelope', 'gate']] },
    },
  ],
};

export const LOOP = {
  kind: 'Loop',
  inputs: [{ name: 'in', channels: 1 }],
  outputs: [{ name: 'out', channels: 1 }],
  children: [
    { name: 'delay', kind: 'delay', settings: { longest: 2 } },
    { name: 'feedback', kind: 'gain', values: { gain: 0.4 } },
  ],
  wires: [
    { from: { input: 'in' }, to: { node: 'delay', input: 'in' } },
    { from: { node: 'delay', output: 'out' }, to: { node: 'feedback', input: 'in' } },
    { from: { node: 'feedback', output: 'out' }, to: { node: 'delay', input: 'in' } },
    { from: { node: 'delay', output: 'out' }, to: { output: 'out' } },
  ],
};
