// The planner's unit tests (mockup/src/libs/modular-audio/plan/planner): templates made into plans.
//   - a template planned: its blocks' specs, values and settings as they start, its macros onto its children;
//   - values and settings changed by address, a preset's; a template of templates; a pool's child ready;
//   - a jack's channels as they come, by what's wired into it;
//   - every template checked well-formed as it's handed in, every failure said at once;
//   - each held to its form: its jacks, its roles, how many, in order, the wires it allows, no loops, every way out ending
//     in a role; a macro's spec its target's where it has none;
//   - a template read from data, YAML's, its shape checked first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Planner, presetsOf, templateOf } from '../index.ts';
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
    plan.node.children.map(({ name, kind, role }) => [name, kind, role]),
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

test("a child's words, its label and its short label, the names a view shows it by, the short one in little room: carried into its node where its template writes one, a pool's child's too; none where it writes none", () => {
  const labelled = new Planner(
    [
      {
        kind: 'Pair',
        children: [
          { name: 'first', kind: 'gain', label: 'the first', short: '1st' },
          { name: 'second', kind: 'gain' },
        ],
        pools: [{ child: { name: 'copy', kind: 'gain', label: 'a copy' }, wires: [] }],
      },
    ],
    [],
  );
  const { node } = labelled.plan('Pair');
  assert.equal(node.children[0].label, 'the first');
  assert.equal('label' in node.children[1], false, 'none where it writes none');
  assert.equal(node.pools[0].child.label, 'a copy');
  assert.equal(node.children[0].short, '1st');
  assert.equal('short' in node.children[1], false, 'no short one where it writes none');
});

test("a template's own label, the name a view shows what's made of it by: its node's, a child's own label over it", () => {
  const labelled = new Planner(
    [
      { kind: 'Lowpass', label: 'LP filter', children: [{ name: 'filter', kind: 'filter' }] },
      {
        kind: 'Two',
        children: [
          { name: 'air', kind: 'Lowpass' },
          { name: 'dull', kind: 'Lowpass', label: 'dullness' },
        ],
      },
    ],
    [],
  );
  assert.equal(labelled.plan('Lowpass').node.label, 'LP filter');
  assert.deepEqual(
    labelled.plan('Two').node.children.map(({ label }) => label),
    ['LP filter', 'dullness'],
  );
});

test("a pool's child ready: its template planned, under its name, its wires and its note's addresses kept; its values by the pool's name, a copy's under it by its number", () => {
  const plan = planner.plan('Synth');
  const [pool] = plan.node.pools;
  assert.equal(pool.child.name, 'voice');
  assert.deepEqual(pool.note.gate, [['envelope', 'gate']]);
  assert.equal(settingAt(plan, ['voice', 'oscillator', 'wave']).value, 'triangle', "the pool's child");
  assert.equal(settingAt(plan, ['voice', '2', 'oscillator', 'wave']).value, 'triangle', 'a copy, built from it');
  assert.equal(paramAt(plan, ['voice', '1', 'envelope', 'release']).value, 0.3);
  assert.equal(paramAt(plan, ['voice', '1', 'envelope', 'decay']).value, 0, 'its default');
});

test("a drum rack's pools, each played by its key, as a pad; a note's addresses by its sources' names, whatever the instrument names them; one into no param refused", () => {
  const pad = (key) => ({
    child: { name: `pad ${key}`, kind: 'Voice' },
    key,
    wires: [{ from: { node: `pad ${key}`, output: 'out' }, to: { output: 'out' } }],
    note: { gate: [['envelope', 'gate']], 'vibrato depth': [] },
  });
  const drums = { kind: 'Drums', outputs: [{ name: 'out', channels: 1 }], pools: [pad(38), pad(40)] };
  const plan = new Planner([VOICE, drums]).plan('Drums');
  assert.deepEqual(
    plan.node.pools.map(({ child, key }) => [child.name, key]),
    [
      ['pad 38', 38],
      ['pad 40', 40],
    ],
  );
  assert.deepEqual(plan.node.pools[0].note['vibrato depth'], [], 'a source of its own name');
  const astray = { ...drums, kind: 'Astray', pools: [{ ...pad(38), note: { breath: [['envelope', 'breath']] } }] };
  assert.throws(() => new Planner([VOICE, astray]), /pool pad 38: its note's breath into envelope\/breath, no param/);
});

test("a jack's channels as they come, where its block doesn't fix them: those wired into it, a node's outputs its inputs'; through a loop; mono where nothing comes", () => {
  const channels = (plan, name) => {
    const node = plan.node.children.find((child) => child.name === name);
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
  const unfed = new Planner([{ kind: 'Unfed', children: [{ name: 'gain', kind: 'gain' }] }], []).plan('Unfed');
  assert.deepEqual(channels(unfed, 'gain'), [1, 1], 'mono where nothing comes');
  const stage = { kind: 'Stage', inputs: [{ name: 'in' }], outputs: [{ name: 'out' }], children: [] };
  const through = (source) =>
    new Planner(
      [
        stage,
        {
          kind: 'Chain',
          inputs: [{ name: 'in', channels: source }],
          outputs: [{ name: 'out', channels: source }],
          children: [{ name: 'stage', kind: 'Stage' }],
          wires: [
            { from: { input: 'in' }, to: { node: 'stage', input: 'in' } },
            { from: { node: 'stage', output: 'out' }, to: { output: 'out' } },
          ],
        },
      ],
      [],
    ).plan('Chain');
  assert.deepEqual(
    channels(through(1), 'stage'),
    [1, 1],
    'a template child written without channels: mono where mono comes',
  );
  assert.deepEqual(channels(through(2), 'stage'), [2, 2], 'stereo where a stereo source feeds it');
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
    ]).plan('Loud').node.children[0].params[0].value,
    6,
  );
  assert.throws(() => planner.plan('Choir'), /no block or template Choir/);
});

test('a block planned alone, by its kind: as it is as a child of its own, its jacks mono where it fixes none; asked what it has not, refused', () => {
  const alone = new Planner([]).plan('oscillator', { values: { frequency: 220 } });
  const solo = new Planner([
    {
      kind: 'Solo',
      outputs: [{ name: 'out', channels: 1 }],
      children: [{ name: 'oscillator', kind: 'oscillator', values: { frequency: 220 } }],
      wires: [{ from: { node: 'oscillator', output: 'out' }, to: { output: 'out' } }],
    },
  ]).plan('Solo');
  assert.deepEqual(alone.node, solo.node.children[0]);
  assert.deepEqual(new Planner([]).plan('gain').node.inputs, [{ name: 'in', channels: 1 }]);
  assert.throws(() => new Planner([]).plan('oscillator', { values: { pitch: 1 } }), /no param pitch/);
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
      { name: '3', kind: 'gain' },
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
        "Broken: 3: a number alone, a name only a pool's copy has",
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
    plan.node.children.map(({ name, role, form }) => [name, role, form]),
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

test('no loops but through the wires the rule names: two returns sending into each other held, a loop through a bus still said', () => {
  const sendsBetween = {
    ...DESK_FORM,
    wires: [
      ...DESK_FORM.wires,
      { from: { role: 'return', output: 'tap' }, to: { role: 'return' } },
      { from: { role: 'return', output: 'out' }, to: { role: 'bus' } },
    ],
    rules: [
      { rule: 'no loops', but: { from: 'return', to: 'return' } },
      { rule: 'ends in', role: 'master' },
    ],
  };
  const echoing = {
    kind: 'Echoing',
    form: 'desk',
    outputs: [{ name: 'out', channels: 2 }],
    children: [
      { name: 'bus', kind: 'Strip', role: 'bus' },
      { name: 'rev 1', kind: 'Strip', role: 'return' },
      { name: 'rev 2', kind: 'Strip', role: 'return' },
      { name: 'a', kind: 'Strip', role: 'channel' },
      { name: 'master', kind: 'Strip', role: 'master' },
    ],
    wires: [
      { from: { node: 'bus', output: 'out' }, to: { node: 'master', input: 'in' } },
      { from: { node: 'bus', output: 'reverb' }, to: { node: 'rev 1', input: 'in' } },
      { from: { node: 'rev 1', output: 'out' }, to: { node: 'bus', input: 'in' } },
      { from: { node: 'rev 1', output: 'reverb' }, to: { node: 'rev 2', input: 'in' } },
      { from: { node: 'rev 2', output: 'reverb' }, to: { node: 'rev 1', input: 'in' } },
      { from: { node: 'rev 2', output: 'out' }, to: { node: 'master', input: 'in' } },
      { from: { node: 'a', output: 'out' }, to: { node: 'master', input: 'in' } },
      { from: { node: 'master', output: 'out' }, to: { output: 'out' } },
    ],
  };
  assert.deepEqual(failuresOf([UTILITY, STRIP, echoing], [CHANNEL_FORM, sendsBetween]), [
    'Echoing: form desk: a loop through bus',
    'Echoing: form desk: a loop through rev 1',
  ]);
  const anyLoop = { ...sendsBetween, rules: [{ rule: 'no loops' }] };
  assert.deepEqual(
    failuresOf([UTILITY, STRIP, echoing], [CHANNEL_FORM, anyLoop]),
    [
      'Echoing: form desk: a loop through bus',
      'Echoing: form desk: a loop through rev 1',
      'Echoing: form desk: a loop through rev 2',
    ],
    'with none named: the loop between the returns said too',
  );
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
  const [level] = planned.node.macros;
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
      '  children 1: no kind or preset',
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

test('a sound into a macro refused where a map on its way holds it to a range, which holds a value, not a sound; through a macro onto a macro too; once every template is well-formed', () => {
  const onto = (to, range = {}) => [{ to, factor: 1, offset: 0, ...range }];
  const clamped = {
    kind: 'Clamped',
    inputs: [{ name: 'in', channels: 1 }],
    outputs: [{ name: 'out', channels: 1 }],
    children: [{ name: 'amp', kind: 'gain' }],
    wires: [
      { from: { input: 'in' }, to: { node: 'amp', input: 'in' } },
      { from: { node: 'amp', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [
      { name: 'held', maps: onto(['amp', 'gain'], { high: 1 }) },
      { name: 'open', maps: onto(['amp', 'gain']) },
    ],
  };
  const wrapped = {
    ...clamped,
    kind: 'Wrapped',
    children: [{ name: 'inner', kind: 'Clamped' }],
    wires: [
      { from: { input: 'in' }, to: { node: 'inner', input: 'in' } },
      { from: { node: 'inner', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [
      { name: 'deep', maps: onto(['inner', 'held']) },
      { name: 'open', maps: onto(['inner', 'open']) },
    ],
  };
  const moved = {
    kind: 'Moved',
    outputs: [{ name: 'out', channels: 1 }],
    children: [
      { name: 'lfo', kind: 'oscillator' },
      { name: 'tone', kind: 'oscillator' },
      { name: 'vca', kind: 'Clamped' },
      { name: 'wrap', kind: 'Wrapped' },
    ],
    wires: [
      { from: { node: 'tone', output: 'out' }, to: { node: 'vca', input: 'in' } },
      { from: { node: 'vca', output: 'out' }, to: { node: 'wrap', input: 'in' } },
      { from: { node: 'wrap', output: 'out' }, to: { output: 'out' } },
      { from: { node: 'lfo', output: 'out' }, to: { node: 'vca', param: 'held' } },
      { from: { node: 'lfo', output: 'out' }, to: { node: 'vca', param: 'open' } },
      { from: { node: 'lfo', output: 'out' }, to: { node: 'wrap', param: 'deep' } },
      { from: { node: 'lfo', output: 'out' }, to: { node: 'wrap', param: 'open' } },
    ],
  };
  assert.deepEqual(failuresOf([clamped, wrapped, moved]), [
    'Moved: a sound into vca/held: on its way, vca/amp/gain held to a range, which holds a value, not a sound',
    'Moved: a sound into wrap/deep: on its way, wrap/inner/amp/gain held to a range, which holds a value, not a sound',
  ]);
});

test("a template built on another: its base's jacks, form, children, wires, macros and pools, then its own; planned flat, checked as one", () => {
  const wobbled = {
    kind: 'Wobbled',
    extends: 'Level',
    children: [{ name: 'wobble', kind: 'oscillator', values: { frequency: 0.5 } }],
    wires: [{ from: { node: 'wobble', output: 'out' }, to: { node: 'gain', param: 'gain' } }],
    macros: [
      {
        name: 'rate',
        spec: { unit: 'Hz', range: [0.01, 20, 0.01], default: 0.5 },
        maps: [{ to: ['wobble', 'frequency'], factor: 1, offset: 0 }],
      },
    ],
  };
  const plan = new Planner([LEVEL, wobbled], [EFFECT_FORM]).plan('Wobbled');
  const { node } = plan;
  assert.deepEqual(
    [node.kind, node.form, node.inputs, node.outputs],
    ['Wobbled', 'effect', LEVEL.inputs, LEVEL.outputs],
  );
  assert.deepEqual(
    node.children.map((child) => child.name),
    ['gain', 'wobble'],
    "its base's first",
  );
  assert.equal(node.wires.length, 3);
  assert.deepEqual(
    node.macros.map((macro) => macro.spec.name),
    ['level', 'rate'],
  );
  assert.equal(paramAt(plan, ['wobble', 'frequency']).value, 0.5);
  const twice = { ...wobbled, kind: 'Twice', macros: [{ name: 'level', maps: LEVEL.macros[0].maps }] };
  assert.deepEqual(failuresOf([LEVEL, twice], [EFFECT_FORM]), ['Twice: macro level: a name two macros have']);
});

test('a template built on one not handed in, or on a block, said; extensions in a loop said; its own kind as a word', () => {
  const on = (kind, base) => ({ kind, extends: base, outputs: [{ name: 'out', channels: 1 }] });
  assert.deepEqual(failuresOf([on('Lost', 'Nowhere'), on('Blocky', 'gain')]), [
    'Lost: extends Nowhere, no template handed in',
    'Blocky: extends gain, no template handed in',
  ]);
  assert.deepEqual(failuresOf([on('First', 'Second'), on('Second', 'First')]), [
    'First: extends Second, which extends First: a loop',
    'Second: extends First, which extends Second: a loop',
  ]);
  assert.throws(() => templateOf({ kind: 'Bent', extends: 3 }, 'bent.yaml'), /its extends not a word/);
});

test("a value or a setting asked for at an address the template doesn't have, refused, every one said", () => {
  assert.throws(
    () => planner.plan('Utility', { values: { volume: 1, 'gain/gian': 0.5 }, settings: { 'pan/lwa': 'pan pot' } }),
    {
      message: [
        'Utility: asked for what it has not:',
        '  no param volume',
        '  no param gain/gian',
        '  no setting pan/lwa',
      ].join('\n'),
    },
  );
});

test("presets read from data, as a theme's YAML writes them: each by a name of its own, what it's on by that thing's word (an effect, a desk), made a template's kind; its values and settings by address; their shape checked", () => {
  const written = {
    delay: { effect: 'Delay', values: { feedback: 0.45 } },
    rtlprnf: { effect: 'Reverb', settings: { length: 3.5 } },
  };
  assert.deepEqual(presetsOf(written, 'effects.yaml', 'effect'), {
    delay: { kind: 'Delay', values: { feedback: 0.45 } },
    rtlprnf: { kind: 'Reverb', settings: { length: 3.5 } },
  });
  assert.deepEqual(presetsOf({ studio: { desk: 'Studio' } }, 'desk.yaml', 'desk'), { studio: { kind: 'Studio' } });
  assert.throws(() => presetsOf({ delay: { kind: 'Delay', values: [] }, room: 'Reverb' }, 'bent.yaml', 'effect'), {
    message: [
      'bent.yaml: not of the shape of presets:',
      '  delay: no effect',
      '  delay: its values not an object',
      '  room: not an object',
    ].join('\n'),
  });
});

// a rack of one child, written with a preset, wired between the rack's input and output
function rackWith(child) {
  return {
    kind: 'Rack',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [child],
    wires: [
      { from: { input: 'in' }, to: { node: child.name, input: 'in' } },
      { from: { node: child.name, output: 'out' }, to: { output: 'out' } },
    ],
  };
}

test("a child written with a preset: its kind the preset's, the preset's values and settings, its own over them; a preset not handed in said", () => {
  const presets = {
    quiet: { kind: 'Utility', values: { level: 0.25, pan: -0.5 }, settings: { 'pan/law': 'pan pot' } },
  };
  const planned = new Planner(
    [UTILITY, rackWith({ name: 'side', preset: 'quiet', values: { pan: 0.5 } })],
    [],
    presets,
  );
  const plan = planned.plan('Rack');
  const [side] = plan.node.children;
  assert.equal(side.kind, 'Utility', "its kind the preset's");
  assert.deepEqual(
    [paramAt(plan, ['side', 'level']).value, paramAt(plan, ['side', 'pan']).value],
    [0.25, 0.5],
    "the preset's level, its own pan over the preset's",
  );
  assert.equal(settingAt(plan, ['side', 'pan', 'law']).value, 'pan pot', "the preset's setting");
  assert.deepEqual(failuresOf([UTILITY, rackWith({ name: 'side', preset: 'loud' })], []), [
    'Rack: side: no preset loud',
  ]);
  assert.equal(
    templateOf(rackWith({ name: 'side', preset: 'quiet' }), 'rack.yaml').children[0].preset,
    'quiet',
    'read from data: a child by its name and its preset',
  );
  assert.throws(() => templateOf(rackWith({ name: 'side' }), 'rack.yaml'), /children 1: no kind or preset/);
});

test("a form's counts and rules over its pools too: a pool counting as one of its role; its wires held to the rules, a way out not ending in the master said", () => {
  const pooled = {
    ...DESK,
    kind: 'Pooled',
    children: DESK.children.filter((child) => child.role !== 'channel'),
    wires: DESK.wires.filter(({ from }) => from.node !== 'my tap 1'),
    pools: [
      {
        child: { name: 'my tap', kind: 'Strip', role: 'channel' },
        wires: [{ from: { node: 'my tap', output: 'out' }, to: { node: 'my playing', input: 'in' } }],
      },
    ],
  };
  assert.deepEqual(
    failuresOf([UTILITY, STRIP, pooled], [CHANNEL_FORM, DESK_FORM]),
    [],
    'a pool of channels: a channel',
  );
  const astray = {
    ...pooled,
    kind: 'Astray',
    pools: [{ child: { name: 'stray', kind: 'Strip', role: 'channel' }, wires: [] }],
  };
  assert.deepEqual(failuresOf([UTILITY, STRIP, astray], [CHANNEL_FORM, DESK_FORM]), [
    "Astray: form desk: stray: its way out doesn't end in the master",
  ]);
  const two = {
    ...pooled,
    kind: 'Two',
    pools: [...pooled.pools, { child: { name: 'mains', kind: 'Strip', role: 'master' }, wires: [] }],
  };
  assert.ok(
    failuresOf([UTILITY, STRIP, two], [CHANNEL_FORM, DESK_FORM]).includes(
      'Two: form desk: role master: 2 children, at most 1',
    ),
    'a pool of masters: one more master',
  );
});

test("a synced time's free value worked out where none is given, as planned at a beat: where its note is then, a block's or a macro's onto its targets; one given, or free, kept; none worked out with no beat", () => {
  const onto = (to) => [{ to, factor: 1, offset: 0 }];
  const echo = {
    kind: 'Echo',
    inputs: [{ name: 'in', channels: 1 }],
    outputs: [{ name: 'out', channels: 1 }],
    children: [{ name: 'line', kind: 'delay' }],
    wires: [
      { from: { input: 'in' }, to: { node: 'line', input: 'in' } },
      { from: { node: 'line', output: 'out' }, to: { output: 'out' } },
    ],
    macros: ['sync', 'note', 'ms'].map((name) => ({ name, maps: onto(['line', name]) })),
  };
  const timed = new Planner([LOOP, echo]);
  const beat = 60 / 72;
  const ms = (plan) => [paramAt(plan, ['ms']).value, paramAt(plan, ['line', 'ms']).value];
  assert.equal(paramAt(timed.plan('Loop', { beat: 0.5 }), ['delay', 'ms']).value, 250, "a block's: its 8th at 120 BPM");
  assert.deepEqual(
    ms(timed.plan('Echo', { beat, values: { note: '1/8.' } })),
    [625, 625],
    "a macro's: a dotted 8th at 72",
  );
  assert.deepEqual(ms(timed.plan('Echo', { beat, values: { note: '1/4', ms: 300 } })), [300, 300], 'one given kept');
  assert.deepEqual(ms(timed.plan('Echo', { beat: 0.5, values: { sync: 0 } })), [417, 417], 'free: its default kept');
  assert.deepEqual(ms(timed.plan('Echo', { values: { note: '1/4' } })), [417, 417], 'no beat: none worked out');
});

test("a template's own setting, as a macro is a param: its spec the child's setting's under its name; its value given by its name, or the child's as written, onto the child's; one onto no setting refused", () => {
  const roomOf = (settings) => ({
    kind: 'Room',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    children: [{ name: 'room', kind: 'reverb', settings: { length: 2 } }],
    wires: [
      { from: { input: 'in' }, to: { node: 'room', input: 'in' } },
      { from: { node: 'room', output: 'out' }, to: { output: 'out' } },
    ],
    settings,
  });
  const rooms = new Planner([roomOf([{ name: 'length', to: ['room', 'length'] }])]);
  const lengths = (plan) => [settingAt(plan, ['length']), settingAt(plan, ['room', 'length']).value];
  const [own, child] = lengths(rooms.plan('Room'));
  assert.deepEqual(
    [own.spec, own.value, own.to, child],
    [BLOCKS.reverb.settings[0], 2, ['room', 'length'], 2],
    'as written',
  );
  assert.deepEqual(
    lengths(rooms.plan('Room', { settings: { length: 5 } })).map((each) => each.value ?? each),
    [5, 5],
  );
  assert.throws(
    () => new Planner([roomOf([{ name: 'length', to: ['room', 'width'] }])]),
    /setting length: room\/width is no setting/,
  );
});
