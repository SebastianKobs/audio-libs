// The planner's unit tests (mockup/src/libs/plan/planner): templates made into plans.
//   - a template planned: its blocks' specs, values and settings as they start, its macros onto its children;
//   - values and settings changed by address, a preset's; a template of templates; a pool's child ready;
//   - a jack's channels as they come, by what's wired into it;
//   - every template checked well-formed as it's handed in, every failure said at once;
//   - each held to its form: its roles, how many, in order, the wires it allows, no loops, every way out ending in a role.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Planner } from '../index.ts';
import { paramAt, settingAt } from '../../format/index.ts';
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
        spec: { name: 'level', range: [0, 2, 0.01] },
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
