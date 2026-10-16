// The desk's unit tests (mockup/src/libs/plan/desk): a desk written short made into templates of its forms.
//   - a channel of the channel's form: its inserts, mute, fader, pan and sends, wired in that order; its own params;
//   - the master: its inserts and its fader alone;
//   - a send for each return before a channel, none that feeds it, its tap post unless said;
//   - the desk of the desk's form: its inputs, each way out and send, its pools;
//   - a channel built on another; a desk written wrong refused, every failure said;
//   - silenced(): which channels a mute or a solo silences, as Ableton's, over a plan's wires.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DESK_FORMS, channelOf, deskOf, deskTemplates, silenced } from '../index.ts';
import { SEND_PARAM, STRIP_PARAMS } from '../../../params/index.ts';
import { Planner } from '../../planner/index.ts';
import { EFFECT_FORM, EFFECT_TEMPLATES } from '../../effects/index.ts';
import { copyOf, nodeAt, paramAt, settingAt } from '../../format/index.ts';
import { PRESETS, REPLAY, STUDIO, TOWER } from './desks.js';

// a desk written short, planned with the effects, the forms and the presets
function planned(desk = STUDIO) {
  const templates = [...EFFECT_TEMPLATES, ...deskTemplates(desk, [REPLAY, TOWER])];
  return new Planner(templates, [EFFECT_FORM, ...DESK_FORMS], PRESETS).plan(desk.kind);
}
// a param or a macro by its spec and value alone
function specAndValue({ spec, value }) {
  return { spec, value };
}
// a wire as text: each end a child and its jack, or the parent's own; 'in' and 'out' left out where they're the main ones
function wireText({ from, to }) {
  return `${endText(from)} → ${endText(to)}`;
}
function endText(end) {
  if ('node' in end) {
    const jack = end.output ?? end.input ?? end.param;
    return jack === 'in' || jack === 'out' ? end.node : `${end.node} ${jack}`;
  }
  const own = 'input' in end ? 'in' : 'out';
  const jack = end.input ?? end.output;
  return jack === own ? own : `${own} ${jack}`;
}

test("a channel of the channel's form: its inserts in their order, then its mute, its fader, its pan and its sends; its volume, pan, mute and solo its own params, as a strip's", () => {
  const plan = planned();
  const tap = nodeAt(plan, ['tap']);
  assert.equal(tap.form, 'channel');
  assert.deepEqual(
    tap.children.map(({ name, role }) => [name, role]),
    [
      ['utility', 'insert'],
      ['cut', 'mute'],
      ['fader', 'fader'],
      ['pan', 'pan'],
      ['send', 'sends'],
    ],
  );
  assert.deepEqual(
    ['volume', 'pan', 'mute', 'solo'].map((name) => specAndValue(paramAt(plan, ['tap', name]))),
    ['volume', 'pan', 'mute', 'solo'].map((name) => ({ spec: STRIP_PARAMS[name], value: STRIP_PARAMS[name].default })),
    "a strip's own params, at their starts",
  );
  assert.deepEqual(
    tap.macros.filter(({ spec }) => spec.name === 'mute' || spec.name === 'solo').map(({ maps }) => maps),
    [[], []],
    "mute and solo wired to nothing: what they silence the desk's rule's (silenced())",
  );
  assert.equal(paramAt(plan, ['tap', 'utility', 'level']).value, 0.7, "an insert's values, by today's keys");
});

test("a channel's wires: in through its inserts into its mute, its fader, its pan and out; its sends taken after its mute (pre) and after its pan (post)", () => {
  assert.deepEqual(nodeAt(planned(), ['tap']).wires.map(wireText), [
    'in → utility',
    'utility → cut',
    'cut → fader',
    'fader → pan',
    'pan → out',
    'cut → send pre',
    'pan → send post',
    'send reverb → out reverb',
    'send delay 1 → out delay 1',
  ]);
  assert.deepEqual(
    nodeAt(planned(), ['my tap']).wires.map(wireText).slice(4, 6),
    ['fader → out', 'cut → send pre'],
    'no pan: out of its fader, its post sends too',
  );
});

test("the master: its inserts and its fader alone, its volume the Output's (master/volume); no pan, mute, solo or sends", () => {
  const plan = planned();
  const master = nodeAt(plan, ['master']);
  assert.deepEqual(
    master.children.map(({ name, role }) => [name, role]),
    [
      ['limiter', 'insert'],
      ['fader', 'fader'],
    ],
  );
  assert.deepEqual(
    master.macros.map(({ spec }) => spec.name),
    ['volume'],
  );
  assert.deepEqual(master.wires.map(wireText), ['in → limiter', 'limiter → fader', 'fader → out']);
  assert.deepEqual(
    master.outputs.map(({ name }) => name),
    ['out'],
  );
});

test("a send on every channel for each return before it on the desk, none that feeds it; a pool's for every return; each at 0, today's key; its tap post unless its channel or the desk says pre", () => {
  const plan = planned();
  const sendsOf = (name) => nodeAt(plan, [name, 'send'])?.macros.map(({ spec }) => spec.name) ?? [];
  assert.deepEqual(
    Object.fromEntries(
      ['reverb', 'sings', 'delay 1', 'you', 'tap', 'my tap', 'replay tower'].map((name) => [name, sendsOf(name)]),
    ),
    {
      reverb: [],
      sings: ['reverb'],
      'delay 1': ['reverb'],
      you: ['reverb', 'delay 1'],
      tap: ['reverb', 'delay 1'],
      'my tap': ['reverb', 'delay 1'],
      'replay tower': ['reverb', 'delay 1'],
    },
  );
  assert.equal(nodeAt(plan, ['reverb', 'send']), undefined, 'none before the first return: no sends');
  assert.deepEqual(
    specAndValue(paramAt(plan, ['you', 'send', 'reverb'])),
    { spec: { ...SEND_PARAM, name: 'reverb' }, value: 0 },
    "a send's amount by today's key, at 0 until turned up",
  );
  const tapOf = (name, to) => settingAt(plan, [name, 'send', `${to} tap`, 'input']).value;
  assert.deepEqual(
    [
      tapOf('tap', 'reverb'),
      tapOf('my tap', 'reverb'),
      tapOf('replay tower', 'reverb'),
      tapOf('replay tower', 'delay 1'),
    ],
    ['a', 'b', 'b', 'a'],
    "post (a) to start; pre (b), its channel's; post again where the desk says",
  );
  const ahead = {
    ...STUDIO,
    channels: [STUDIO.channels[0], STUDIO.channels[2], STUDIO.channels[1], ...STUDIO.channels.slice(3)],
  };
  assert.deepEqual(
    nodeAt(planned(ahead), ['sings', 'send']).macros.map(({ spec }) => spec.name),
    ['reverb'],
    'a return before a bus it goes into: no send to it, that would be a loop',
  );
});

test("the desk of the desk's form: its own inputs into its channels and buses, each way out into a bus or the master, each send into its return, the master its output; a pool's channels wired by its rule", () => {
  const desk = planned().node;
  assert.equal(desk.form, 'desk');
  assert.deepEqual(
    desk.inputs.map(({ name }) => name),
    ['sings', 'you', 'tap'],
  );
  assert.deepEqual(
    desk.children.map(({ name, role }) => [name, role]),
    [
      ['reverb', 'return'],
      ['sings', 'bus'],
      ['delay 1', 'return'],
      ['you', 'bus'],
      ['tap', 'bus'],
      ['master', 'master'],
    ],
  );
  assert.deepEqual(desk.wires.map(wireText), [
    'reverb → master',
    'in sings → sings',
    'sings → master',
    'sings reverb → reverb',
    'delay 1 → sings',
    'delay 1 reverb → reverb',
    'in you → you',
    'you → master',
    'you reverb → reverb',
    'you delay 1 → delay 1',
    'in tap → tap',
    'tap → you',
    'tap reverb → reverb',
    'tap delay 1 → delay 1',
    'master → out',
  ]);
  assert.deepEqual(
    desk.pools.map(({ child, wires }) => [child.name, child.role, wires.map(wireText)]),
    [
      ['my tap', 'channel', ['my tap → tap', 'my tap reverb → reverb', 'my tap delay 1 → delay 1']],
      [
        'replay tower',
        'channel',
        ['replay tower → sings', 'replay tower reverb → reverb', 'replay tower delay 1 → delay 1'],
      ],
    ],
  );
});

test("a channel built on another: its base's inserts, then its own; its pan, volume and tap its own where it writes them, else its base's; a pool's own over its channel's", () => {
  const plan = planned();
  assert.deepEqual(
    nodeAt(plan, ['replay tower']).children.map(({ name }) => name),
    ['air', 'utility', 'dull', 'cut', 'fader', 'send'],
    "the Replay's inserts, then the Tower's; no pan, the Replay's",
  );
  assert.deepEqual(
    [
      paramAt(plan, ['replay tower', 'volume']).value,
      paramAt(plan, ['my tap', 'volume']).value,
      paramAt(plan, ['replay tower', 'dull', 'cutoff']).value,
      settingAt(plan, ['replay tower', 'utility', 'pan', 'law']).value,
    ],
    [0, 1, 350, 'pan pot'],
  );
});

test("a channel's words on a desk, its label, the name a view shows it by: on its node, a pool's on its child; read from data, its shape checked", () => {
  const labelled = {
    ...STUDIO,
    channels: STUDIO.channels.map((channel) =>
      channel.name === 'you' ? { ...channel, label: 'my playing' } : channel,
    ),
    pools: [{ ...STUDIO.pools[0], label: 'my taps' }, STUDIO.pools[1]],
  };
  const plan = planned(labelled);
  assert.deepEqual(
    [nodeAt(plan, ['you']).label, nodeAt(plan, ['my tap']).label, nodeAt(plan, ['tap']).label],
    ['my playing', 'my taps', undefined],
  );
  assert.equal(deskOf(labelled, 'desks.js').channels[3].label, 'my playing');
  assert.throws(
    () => deskOf({ kind: 'Studio', channels: [{ name: 'you', role: 'bus', label: 3 }] }, 'desks.js'),
    /label/,
  );
});

test("a channel's short label on a desk, the name a view shows it by in little room (a send's knob): on its node; read from data, its shape checked", () => {
  const shortened = {
    ...STUDIO,
    channels: STUDIO.channels.map((channel) => (channel.name === 'reverb' ? { ...channel, short: 'rev' } : channel)),
  };
  const plan = planned(shortened);
  assert.deepEqual([nodeAt(plan, ['reverb']).short, nodeAt(plan, ['you']).short], ['rev', undefined]);
  assert.throws(
    () => deskOf({ kind: 'Studio', channels: [{ name: 'reverb', role: 'return', short: 3 }] }, 'desks.js'),
    /short/,
  );
});

test('a desk written short refused where it is wrong, every failure said: a channel not handed in, or built in a loop; a way out into no bus on the desk; a tap for a return it has no send to', () => {
  const bent = {
    kind: 'Bent',
    channels: [
      { name: 'a', role: 'bus', channel: 'Missing' },
      { name: 'b', role: 'bus', out: 'nowhere', taps: { reverb: 'pre' } },
      { name: 'reverb', role: 'return' },
      { name: 'c', role: 'bus', channel: 'X' },
      { name: 'master', role: 'master' },
    ],
  };
  const looped = [
    { kind: 'X', extends: 'Y' },
    { kind: 'Y', extends: 'X' },
  ];
  assert.throws(() => deskTemplates(bent, looped), {
    message: [
      'desk Bent, written short, not well-formed:',
      '  a: no channel Missing',
      '  c: channel X built on Y, which is built on X: a loop',
      '  b: its way out into nowhere, no bus on the desk',
      '  b: a tap for reverb, no send to it',
    ].join('\n'),
  });
});

// a desk of the old routing's tests (libs/mixer/, gone in LAY11c3), each track a channel of its own
const ROUTED = {
  kind: 'Routed',
  channels: [
    { name: 'reverb', role: 'return' },
    { name: 'sings', role: 'bus' },
    { name: 'you', role: 'bus' },
    { name: 'tap', role: 'channel', out: 'you' },
    { name: 'replay tap 1', role: 'channel', out: 'sings' },
    { name: 'replay vine 1', role: 'channel', out: 'sings' },
    { name: 'ambient', role: 'bus' },
    { name: 'background 1', role: 'channel', out: 'ambient' },
    { name: 'master', role: 'master' },
  ],
  pools: [{ name: 'my tap', out: 'you' }],
};

test("silenced(): which channels a mute or a solo silences, as Ableton's, over a desk plan's wires: a soloed one's way out and what feeds it heard; a return never silenced by a solo, the master never", () => {
  const desk = planned(ROUTED).node;
  const quiet = (muted = [], soloed = []) =>
    [...silenced(desk, { muted: new Set(muted), soloed: new Set(soloed) })].sort();
  assert.deepEqual(quiet(), [], 'nothing muted, nothing soloed');
  assert.deepEqual(quiet(['tap']), ['tap'], 'a mute, alone');
  assert.deepEqual(
    quiet([], ['replay tap 1']),
    ['ambient', 'background 1', 'replay vine 1', 'tap', 'you'],
    "a replay track soloed: its bus stays, so it's heard; the reverb stays",
  );
  assert.deepEqual(
    quiet([], ['sings']),
    ['ambient', 'background 1', 'tap', 'you'],
    'a bus soloed: what feeds it stays',
  );
  assert.deepEqual(quiet([], ['replay tap 1', 'background 1']), ['replay vine 1', 'tap', 'you'], 'two soloed');
  assert.deepEqual(
    quiet(['sings'], ['replay tap 1']),
    ['ambient', 'background 1', 'replay vine 1', 'sings', 'tap', 'you'],
    "a mute wins over a solo's way out",
  );
  assert.deepEqual(quiet(['master'], ['master']), [], 'the master: neither muted nor soloed');
  const copy = copyOf(desk.pools[0], 1);
  // the copy keyed by its address, as a desk's routing keys it
  const withCopy = {
    children: [...desk.children, { ...copy.node, name: 'my tap/1' }],
    wires: [...desk.wires, ...copy.wires],
  };
  assert.deepEqual(
    [...silenced(withCopy, { muted: new Set(), soloed: new Set(['you']) })].sort(),
    ['ambient', 'background 1', 'replay tap 1', 'replay vine 1', 'sings'],
    "a pool's copy, wired by its pool's rule: feeding a soloed bus, heard",
  );
});

test("a desk and a channel read from data, as YAML's are: their shape checked, each failure said, naming where they were read from", () => {
  assert.equal(deskOf(STUDIO, 'studio.yaml'), STUDIO, 'one of the shape, as it is');
  assert.equal(channelOf(TOWER, 'tower.yaml'), TOWER);
  const bent = {
    kind: 3,
    channels: [
      { name: 'a' },
      { name: 'b', role: 'bass', taps: { reverb: 'early' } },
      { name: 'c', role: 'bus', inserts: [{ name: 'eq' }], pan: 'yes' },
    ],
    pools: [{ out: 'a' }],
  };
  assert.throws(() => deskOf(bent, 'bent.yaml'), {
    message: [
      'bent.yaml: not of the shape of a desk:',
      '  its kind not a word',
      '  channels 1: no role',
      '  channels 2: its role bass, not channel, bus, return or master',
      '  channels 2: its taps reverb early, not pre or post',
      '  channels 3 inserts 1: no kind or preset',
      '  channels 3: its pan not true or false',
      '  pools 1: no name',
    ].join('\n'),
  });
  assert.throws(() => deskOf({ kind: 'Empty' }, 'empty.yaml'), {
    message: 'empty.yaml: not of the shape of a desk:\n  no channels',
  });
  assert.throws(() => channelOf({ kind: 'Odd', volume: 'loud', tap: 'late' }, 'odd.yaml'), {
    message: [
      'odd.yaml: not of the shape of a channel:',
      '  its volume not a number',
      '  its tap late, not pre or post',
    ].join('\n'),
  });
});
