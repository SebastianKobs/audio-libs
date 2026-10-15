// The planner's unit tests (mockup/src/libs/plan/planner): templates made into plans.
//   - a template planned: its blocks' specs, values and settings as they start, its macros onto its children;
//   - values and settings changed by address, a preset's; a template of templates; a pool's child ready;
//   - a jack's channels as they come, by what's wired into it;
//   - every template checked well-formed as it's handed in, every failure said at once;
//   - each held to its form: its jacks, its roles, how many, in order, the wires it allows, no loops, every way out ending
//     in a role; a macro's spec its target's where it has none;
//   - a template read from data, YAML's, its shape checked first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Planner, templateOf } from '../index.ts';
import { paramAt, settingAt } from '../../format/index.ts';
import { BLOCKS } from '../../blocks/index.ts';
import { UTILITY as UTILITY_PLAN } from '../../format/test/plans.ts';
import { CHANNEL_FORM, DESK, DESK_FORM, LOOP, STRIP, SYNTH, UTILITY, VOICE } from './templates.js';

const planner = new Planner([UTILITY, STRIP, DESK, VOICE, SYNTH, LOOP], [CHANNEL_FORM, DESK_FORM]);

test("a template planned, as the format's tests wrote it out by hand: the Utility, its blocks' specs, values and settings as they start, its jacks' channels, its macros onto its children", () => {
  assert.deepEqual(planner.plan('Utility', { name: 'utility' }), UTILITY_PLAN);
});

test("values and settings changed by address, a preset's: a macro's value onto its targets, a block's own; a value given for a param a macro moves, the macro's", () => {
  const plan = planner.plan('Utility', { values: { pan: -0.5, 'gain/gain': 0.3 }, settings: { 'pan/law': 'pan pot' } });
  assert.equal(paramAt(plan, ['pan', 'pan']).value, -0.5, "the pan macro's");
  assert.equal(settingAt(plan, ['pan', 'law']).value, 'pan pot');
  assert.equal(paramAt(plan, ['gain', 'gain']).value, 1, 'the level macro moves it');
  assert.equal(planner.plan('Utility').node.name, 'Utility', 'named its kind unless asked otherwise');
});

test("a template of templates: a child's template planned into it, its role kept; a value it changes written in the template, or given by its address; a macro onto a child's macro", () => {
  const plan = planner.plan('Strip', { name: 'my tap 1', values: { 'lowpass/resonance': 2 } });
  assert.deepEqual(
    plan.node.inside.children.map(({ name, kind, role }) => [name, kind, role]),
    [
      ['utility', 'Utility', 'insert'],
      ['lowpass', 'filter', 'insert'],
      ['fader', 'gain', 'fader'],
      ['pan', 'pan', 'pan'],
    ],
  );
  assert.equal(plan.node.form, 'channel');
  assert.equal(paramAt(plan, ['lowpass', 'frequency']).value, 2400, "the template's");
  assert.equal(paramAt(plan, ['lowpass', 'resonance']).value, 2, 'given');
  assert.equal(paramAt(plan, ['utility', 'level']).value, 0.5, "the strip's volume onto the Utility's level");
  assert.equal(paramAt(plan, ['utility', 'gain', 'gain']).value, 0.5, 'and on onto its gain');
});

test("a pool's child ready: its template planned, under its name, its wires and its note's addresses kept; a copy's values by its address", () => {
  const plan = planner.plan('Synth');
  const [pool] = plan.node.inside.pools;
  assert.equal(pool.child.name, 'voice');
  assert.deepEqual(pool.note.gate, [['envelope', 'gate']]);
  assert.equal(settingAt(plan, ['voice 2', 'oscillator', 'wave']).value, 'triangle');
  assert.equal(paramAt(plan, ['voice 1', 'envelope', 'release']).value, 0.3);
  assert.equal(paramAt(plan, ['voice 1', 'envelope', 'decay']).value, 0, 'its default');
});

test("a jack's channels as they come, where its block doesn't fix them: those wired into it, a node's outputs its inputs'; through a loop; mono where nothing comes", () => {
  const channels = (plan, name) => {
    const node = plan.node.inside.children.find((child) => child.name === name);
    return [...node.inputs, ...node.outputs].map((jack) => jack.channels);
  };
  const utility = planner.plan('Utility');
  assert.deepEqual(channels(utility, 'gain'), [2, 2], 'from its stereo input');
  assert.deepEqual(channels(utility, 'pan'), [2, 2]);
  const voice = planner.plan('Voice');
  assert.deepEqual(channels(voice, 'vca'), [1, 1], 'from its mono oscillator');
  const loop = planner.plan('Loop');
  assert.deepEqual(channels(loop, 'delay'), [1, 1]);
  assert.deepEqual(channels(loop, 'feedback'), [1, 1]);
});

test('a value a block needs and has no default for refused, naming it; a template not handed in refused', () => {
  const limited = new Planner([{ kind: 'Loud', children: [{ name: 'limiter', kind: 'limiter' }] }]);
  assert.throws(() => limited.plan('Loud'), /limiter\/gain: no value, and no default/);
  assert.equal(
    new Planner([
      {
        kind: 'Loud',
        children: [{ name: 'limiter', kind: 'limiter', values: { gain: 6, ceiling: -1, release: 0.3 } }],
      },
    ]).plan('Loud').node.inside.children[0].params[0].value,
    6,
  );
  assert.throws(() => planner.plan('Choir'), /no template Choir/);
});

test('every template checked well-formed as it is handed in, every failure said at once: its template, its child, its rule', () => {
  const broken = {
    kind: 'Broken',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [
      { name: 'gain', kind: 'gain', values: { cutoff: 100 } },
      { name: 'gain', kind: 'pan' },
      { name: 'choir', kind: 'Choir' },
      { name: 'self', kind: 'Broken' },
    ],
    wires: [
      { from: { input: 'side' }, to: { node: 'gain', input: 'in' } },
      { from: { node: 'gain', output: 'tap' }, to: { node: 'nowhere', input: 'in' } },
      { from: { node: 'gain', output: 'out' }, to: { node: 'gain', param: 'frequency' } },
      { from: { node: 'gain', output: 'out' }, to: { output: 'left' } },
    ],
    macros: [
      {
        name: 'level',
        spec: { range: [0, 2, 0.01] },
        value: 1,
        maps: [{ to: ['gain', 'level'], factor: 1, offset: 0 }],
      },
    ],
  };
  assert.throws(
    () => new Planner([broken]),
    (error) => {
      assert.deepEqual(error.message.split('\n'), [
        'templates not well-formed:',
        'Broken: gain: a name two children have',
        'Broken: gain: no param cutoff to change',
        'Broken: choir: no block or template Choir',
        'Broken: self: holds itself, through Broken',
        'Broken: a wire from in side: no such input',
        'Broken: a wire from gain: no output tap',
        'Broken: a wire into nowhere: no such child',
        'Broken: a wire into gain: no param frequency',
        'Broken: a wire into out left: no such output',
        'Broken: macro level: gain/level is no param',
      ]);
      return true;
    },
  );
});

test("a template that fulfils its form planned: a desk of channels, each of the channel's form, its roles kept", () => {
  const plan = planner.plan('Desk');
  assert.deepEqual(
    plan.node.inside.children.map(({ name, role, form }) => [name, role, form]),
    [
      ['my tap 1', 'channel', 'channel'],
      ['my playing', 'bus', 'channel'],
      ['reverb', 'return', 'channel'],
      ['master', 'master', 'channel'],
    ],
  );
  assert.throws(() => new Planner([{ kind: 'Mixer', form: 'mixer' }]), /Mixer: no form mixer/);
});

// a planner's failures, each a line after its heading
function failuresOf(templates, forms) {
  try {
    new Planner(templates, forms);
  } catch (error) {
    return error.message.split('\n').slice(1);
  }
  return [];
}

test("each template held to its form, every failure said: a child with no role, a role the form hasn't, a kind or form not the role's; too few or too many; out of order", () => {
  const backwards = {
    kind: 'Backwards',
    form: 'channel',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [
      { name: 'pan', kind: 'pan', role: 'pan' },
      { name: 'fader', kind: 'filter', role: 'fader' },
      { name: 'eq', kind: 'filter', role: 'insert' },
      { name: 'loud', kind: 'gain', role: 'fader' },
      { name: 'odd', kind: 'gain' },
      { name: 'side', kind: 'gain', role: 'sidechain' },
    ],
  };
  assert.deepEqual(failuresOf([backwards], [CHANNEL_FORM]), [
    'Backwards: form channel: fader: a filter, not a gain',
    'Backwards: form channel: odd: no role',
    'Backwards: form channel: side: no role sidechain in it',
    'Backwards: form channel: role fader: 2 children, at most 1',
    'Backwards: form channel: fader: its role fader after pan, out of order',
    'Backwards: form channel: eq: its role insert after pan, out of order',
    'Backwards: form channel: loud: its role fader after pan, out of order',
  ]);
});

test("each template held to its form's wires and rules: a wire the form doesn't allow, into an input or a param, a loop, a way out not ending in the master", () => {
  const tangled = {
    kind: 'Tangled',
    form: 'desk',
    outputs: [{ name: 'out', channels: 2 }],
    children: [
      { name: 'a', kind: 'Strip', role: 'channel' },
      { name: 'b', kind: 'Strip', role: 'bus' },
      { name: 'c', kind: 'Strip', role: 'bus' },
      { name: 'stray', kind: 'Strip', role: 'channel' },
      { name: 'master', kind: 'Strip', role: 'master' },
      { name: 'pan', kind: 'pan', role: 'return' },
    ],
    wires: [
      { from: { node: 'a', output: 'out' }, to: { node: 'b', input: 'in' } },
      { from: { node: 'b', output: 'out' }, to: { node: 'c', input: 'in' } },
      { from: { node: 'c', output: 'out' }, to: { node: 'b', input: 'in' } },
      { from: { node: 'a', output: 'reverb' }, to: { node: 'stray', input: 'in' } },
      { from: { node: 'a', output: 'out' }, to: { node: 'b', param: 'volume' } },
      { from: { node: 'master', output: 'out' }, to: { output: 'out' } },
    ],
  };
  assert.deepEqual(failuresOf([UTILITY, STRIP, tangled], [CHANNEL_FORM, DESK_FORM]), [
    'Tangled: form desk: pan: a pan, not of form channel',
    'Tangled: form desk: a wire from a into stray: not allowed',
    'Tangled: form desk: a wire from a into b: not allowed',
    'Tangled: form desk: a loop through b',
    'Tangled: form desk: a loop through c',
    "Tangled: form desk: a: its way out doesn't end in the master",
    "Tangled: form desk: b: its way out doesn't end in the master",
    "Tangled: form desk: c: its way out doesn't end in the master",
    "Tangled: form desk: stray: its way out doesn't end in the master",
    "Tangled: form desk: pan: its way out doesn't end in the master",
  ]);
});

// an effect's form: one input and one output, its children playing no role
const EFFECT_FORM = { name: 'effect', inputs: ['in'], outputs: ['out'] };
// an effect: a gain, its level a macro naming no spec of its own
const LEVEL = {
  kind: 'Level',
  form: 'effect',
  inputs: [{ name: 'in', channels: 2 }],
  outputs: [{ name: 'out', channels: 2 }],
  children: [{ name: 'gain', kind: 'gain' }],
  wires: [
    { from: { input: 'in' }, to: { node: 'gain', input: 'in' } },
    { from: { node: 'gain', output: 'out' }, to: { output: 'out' } },
  ],
  macros: [{ name: 'level', maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }] }],
};

test("a form's jacks: an effect's one input and one output, its children free of roles where it names none; jacks not the form's said", () => {
  assert.doesNotThrow(() => new Planner([LEVEL], [EFFECT_FORM]));
  const sided = { ...LEVEL, kind: 'Sided', inputs: [...LEVEL.inputs, { name: 'side', channels: 1 }] };
  assert.deepEqual(failuresOf([sided], [EFFECT_FORM]), [
    'Sided: form effect: its inputs in, side, where the form has in',
  ]);
});

test("a macro with no spec of its own its first target's, under its name, its value its default unless written; one with no name refused", () => {
  const planned = new Planner([LEVEL], [EFFECT_FORM]).plan('Level');
  const [level] = planned.node.inside.macros;
  assert.deepEqual(
    [level.spec, level.value],
    [{ ...BLOCKS.gain.params[0], name: 'level' }, BLOCKS.gain.params[0].default],
  );
  assert.equal(paramAt(planned, ['level']).spec.name, 'level');
  const nameless = { ...LEVEL, kind: 'Nameless', macros: [{ maps: LEVEL.macros[0].maps }] };
  assert.deepEqual(failuresOf([nameless], [EFFECT_FORM]), ['Nameless: a macro with no name']);
});

test("a template read from data, as YAML's is: its shape checked, each failure said, naming where it was read from", () => {
  assert.equal(templateOf(LEVEL, 'level.yaml'), LEVEL, 'one of the shape, as it is');
  const bent = {
    kind: 3,
    form: ['effect'],
    inputs: { name: 'in' },
    children: [{ name: 'gain' }, 'pan'],
    wires: [{ from: { input: 'in' } }],
    macros: [{ name: 'level' }],
    pools: [{ wires: [] }],
  };
  assert.throws(() => templateOf(bent, 'bent.yaml'), {
    message: [
      'bent.yaml: not of the shape of a template:',
      '  its kind not a word',
      '  its form not a word',
      '  its inputs not a list',
      '  children 1: no kind',
      '  children 2: not an object',
      '  wires 1: no to',
      '  macros 1: no maps',
      '  pools 1: no child',
    ].join('\n'),
  });
  assert.throws(() => templateOf(null, 'empty.yaml'), {
    message: 'empty.yaml: not of the shape of a template:\n  not an object: none',
  });
});

test("a macro onto a choice: its choices the choice's own, as it moves it by position; other choices, or none, refused once every template is well-formed", () => {
  const onto = (to) => [{ to, factor: 1, offset: 0 }];
  const NOTES = BLOCKS.delay.params.find((spec) => spec.name === 'note').choices;
  const pace = {
    kind: 'Pace',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [{ name: 'line', kind: 'delay' }],
    wires: [
      { from: { input: 'in' }, to: { node: 'line', input: 'in' } },
      { from: { node: 'line', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [
      { name: 'note', maps: onto(['line', 'note']) },
      { name: 'pace', spec: { choices: ['slow', 'fast'], default: 'slow' }, maps: onto(['line', 'note']) },
      { name: 'steps', spec: { range: [0, 11, 1], default: 4 }, maps: onto(['line', 'note']) },
    ],
  };
  const held = {
    kind: 'Held',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [{ name: 'pace', kind: 'Pace' }],
    wires: [
      { from: { input: 'in' }, to: { node: 'pace', input: 'in' } },
      { from: { node: 'pace', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [
      { name: 'note', maps: onto(['pace', 'note']) },
      { name: 'speed', spec: { choices: ['slow', 'fast'], default: 'fast' }, maps: onto(['pace', 'note']) },
      { name: 'backwards', spec: { choices: [...NOTES].reverse(), default: '1/8' }, maps: onto(['pace', 'note']) },
    ],
  };
  assert.deepEqual(failuresOf([pace, held]), [
    'Pace: macro pace: its choices not those of line/note, which it moves by position',
    'Pace: macro steps: its choices not those of line/note, which it moves by position',
    'Held: macro speed: its choices not those of pace/note, which it moves by position',
    'Held: macro backwards: its choices not those of pace/note, which it moves by position',
  ]);
  const fine = { ...pace, macros: [pace.macros[0]] };
  assert.doesNotThrow(
    () => new Planner([fine, { ...held, macros: [held.macros[0]] }]),
    'its own, through a template too',
  );
});
