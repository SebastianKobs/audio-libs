// A small desk written out as a plan, as the desk's planner would hand it out: the strips' and the
// mixer's tests' data.
//   reverb: a return, its Utility at 0.6, a Utility a level and a pan, its pan's law a setting.
//   you: a bus, shown as my playing, a send to the reverb; tap: a bus into it, shown as my tap.
//   ambient: a bus, shown as background; the master, its limiter, its volume alone.
//   my tap: a pool of channels into tap, each a send to the reverb.
const STEREO = [{ name: 'in', channels: 2 }];
const OUT = [{ name: 'out', channels: 2 }];
const GAIN = { range: [-60, 6, 0.1], dB: true, taper: 'fader' };
const SWITCH = { range: [0, 1, 1] };

// a block with its params at their values
function block(name, kind, params = [], role) {
  return {
    name,
    kind,
    ...(role && { role }),
    inputs: STEREO,
    outputs: OUT,
    params: params.map(([spec, value]) => ({ spec, value })),
    settings: [],
  };
}
// a composite: its children, its macros
function composite(name, kind, { role, label, children = [], macros = [], wires = [], pools = [] } = {}) {
  return {
    name,
    kind,
    ...(role && { role }),
    ...(label && { label }),
    inputs: STEREO,
    outputs: OUT,
    params: [],
    settings: [],
    children,
    wires,
    macros: macros.map(([spec, value, hint]) => ({ spec, value, ...(hint && { hint }), maps: [] })),
    pools,
  };
}
// a Utility insert, its level and its pan, its pan's law a setting
function utility(level) {
  const pan = block('pan', 'pan', [[{ name: 'pan', range: [-1, 1, 0.01] }, 0]]);
  return composite('utility', 'Utility', {
    role: 'insert',
    children: [
      block('gain', 'gain', [[{ ...GAIN, name: 'gain' }, level]]),
      { ...pan, settings: [{ spec: { name: 'law', choices: ['stereo', 'pan pot'] }, value: 'stereo' }] },
    ],
    macros: [
      [{ ...GAIN, name: 'level' }, level, 'How loud it comes out.'],
      [{ name: 'pan', range: [-1, 1, 0.01] }, 0],
    ],
  });
}
// A channel of the channel's form: its inserts, its cut, its fader, its pan, its sends; its
// volume, pan, mute and solo; the master its inserts, its fader and its volume alone.
function channel(name, { role, label, inserts = [], sends = [], master = false } = {}) {
  const children = [
    ...inserts,
    ...(master ? [] : [block('cut', 'gain', [[{ ...GAIN, name: 'gain' }, 1]], 'mute')]),
    block('fader', 'gain', [[{ ...GAIN, name: 'gain' }, 1]], 'fader'),
    ...(master ? [] : [block('pan', 'pan', [[{ name: 'pan', range: [-1, 1, 0.01] }, 0]], 'pan')]),
    ...(sends.length ?
      [composite('send', `${name} sends`, { role: 'sends', macros: sends.map((to) => [{ ...GAIN, name: to }, 0]) })]
    : []),
  ];
  const macros = [
    [{ ...GAIN, name: 'volume' }, 1],
    ...(master ?
      []
    : [
        [{ name: 'pan', range: [-1, 1, 0.01] }, 0],
        [{ ...SWITCH, name: 'mute' }, 0],
        [{ ...SWITCH, name: 'solo' }, 0],
      ]),
  ];
  return composite(name, `Studio: ${name}`, { role, label, children, macros });
}
// a wire from a channel's way out into another's way in
function into(from, to) {
  return { from: { node: from, output: 'out' }, to: { node: to, input: 'in' } };
}

export const STUDIO = {
  version: 1,
  node: composite('studio', 'Studio', {
    children: [
      channel('reverb', { role: 'return', inserts: [utility(0.6)] }),
      channel('you', { role: 'bus', label: 'my playing', sends: ['reverb'] }),
      channel('tap', { role: 'bus', label: 'my tap', inserts: [utility(0.7)], sends: ['reverb'] }),
      channel('ambient', { role: 'bus', label: 'background' }),
      channel('master', {
        role: 'master',
        inserts: [composite('limiter', 'Limiter', { role: 'insert' })],
        master: true,
      }),
    ],
    wires: [
      into('reverb', 'master'),
      into('you', 'master'),
      { from: { node: 'you', output: 'reverb' }, to: { node: 'reverb', input: 'in' } },
      into('tap', 'you'),
      into('ambient', 'master'),
      { from: { node: 'master', output: 'out' }, to: { output: 'out' } },
    ],
    pools: [{ child: channel('my tap', { role: 'channel', sends: ['reverb'] }), wires: [into('my tap', 'tap')] }],
  }),
};
