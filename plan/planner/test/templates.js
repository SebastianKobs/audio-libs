// Small templates, as a theme or the studio's setup would write them: the planner's tests' data.
//   UTILITY: a gain into a pan, its level and pan macros onto theirs.
//   STRIP: a channel: a Utility and a lowpass its inserts, then its fader and its pan, a tap off its fader;
//     its volume a macro onto the Utility's level.
//   DESK: a desk of strips: your tap's channel into your bus and, by its tap, into the reverb, all into the master.
//   CHANNEL_FORM, DESK_FORM: a channel's and a desk's forms, small.
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
  outputs: [
    { name: 'out', channels: 2 },
    { name: 'reverb', channels: 2 },
  ],
  children: [
    { name: 'utility', kind: 'Utility', role: 'insert' },
    { name: 'lowpass', kind: 'filter', role: 'insert', values: { frequency: 2400 } },
    { name: 'fader', kind: 'gain', role: 'fader' },
    { name: 'pan', kind: 'pan', role: 'pan' },
  ],
  wires: [
    { from: { input: 'in' }, to: { node: 'utility', input: 'in' } },
    { from: { node: 'utility', output: 'out' }, to: { node: 'lowpass', input: 'in' } },
    { from: { node: 'lowpass', output: 'out' }, to: { node: 'fader', input: 'in' } },
    { from: { node: 'fader', output: 'out' }, to: { node: 'pan', input: 'in' } },
    { from: { node: 'fader', output: 'out' }, to: { output: 'reverb' } },
    { from: { node: 'pan', output: 'out' }, to: { output: 'out' } },
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

export const DESK = {
  kind: 'Desk',
  form: 'desk',
  outputs: [{ name: 'out', channels: 2 }],
  children: [
    { name: 'my tap 1', kind: 'Strip', role: 'channel' },
    { name: 'my playing', kind: 'Strip', role: 'bus' },
    { name: 'reverb', kind: 'Strip', role: 'return' },
    { name: 'master', kind: 'Strip', role: 'master' },
  ],
  wires: [
    { from: { node: 'my tap 1', output: 'out' }, to: { node: 'my playing', input: 'in' } },
    { from: { node: 'my tap 1', output: 'reverb' }, to: { node: 'reverb', input: 'in' } },
    { from: { node: 'my playing', output: 'out' }, to: { node: 'master', input: 'in' } },
    { from: { node: 'reverb', output: 'out' }, to: { node: 'master', input: 'in' } },
    { from: { node: 'master', output: 'out' }, to: { output: 'out' } },
  ],
};

// a channel's form: its inserts in their order, any number, then one fader, a gain, then one pan; wired in
// that order, a tap off its fader; no loops
export const CHANNEL_FORM = {
  name: 'channel',
  ordered: true,
  roles: [
    { role: 'insert' },
    { role: 'fader', kind: 'gain', least: 1, most: 1 },
    { role: 'pan', kind: 'pan', least: 1, most: 1 },
  ],
  wires: [
    { from: { parent: 'in' }, to: { role: 'insert' } },
    { from: { parent: 'in' }, to: { role: 'fader' } },
    { from: { role: 'insert', output: 'out' }, to: { role: 'insert' } },
    { from: { role: 'insert', output: 'out' }, to: { role: 'fader' } },
    { from: { role: 'fader', output: 'out' }, to: { role: 'pan' } },
    { from: { role: 'fader', output: 'out' }, to: { parent: 'out' } },
    { from: { role: 'pan', output: 'out' }, to: { parent: 'out' } },
  ],
  rules: [{ rule: 'no loops' }],
};

// a desk's form: channels, buses and returns, each a channel, and exactly one master; a way out into a bus
// or the master, a tap into a return; no loops; every way out ending in the master
export const DESK_FORM = {
  name: 'desk',
  roles: [
    { role: 'channel', form: 'channel', least: 1 },
    { role: 'bus', form: 'channel' },
    { role: 'return', form: 'channel' },
    { role: 'master', form: 'channel', least: 1, most: 1 },
  ],
  wires: [
    { from: { role: 'channel', output: 'out' }, to: { role: 'bus' } },
    { from: { role: 'channel', output: 'out' }, to: { role: 'master' } },
    { from: { role: 'bus', output: 'out' }, to: { role: 'bus' } },
    { from: { role: 'bus', output: 'out' }, to: { role: 'master' } },
    { from: { role: 'return', output: 'out' }, to: { role: 'master' } },
    { from: { role: 'channel', output: 'tap' }, to: { role: 'return' } },
    { from: { role: 'bus', output: 'tap' }, to: { role: 'return' } },
    { from: { role: 'master', output: 'out' }, to: { parent: 'out' } },
  ],
  rules: [{ rule: 'no loops' }, { rule: 'ends in', role: 'master' }],
};
