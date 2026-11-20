// The effects' unit tests (mockup/src/libs/modular-audio/plan/effects): each a template, as its YAML writes it.
//   - the eight, each of the effect's form, one input and one output, its label where it has one, planned with no failure;
//     the Tape delay the Delay's;
//   - their params macros by the names a desk keys them, the Utility's level the fader's;
//   - the Delay's note a choice through its macro; the Utility's pan pot a setting; the Reverb's length one;
//   - every macro its hint, the words a device shows;
//   - the Drive planned whole: every node of its chain a block, its macros onto the chain, its steep high cut a 5th-order Butterworth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_FORM } from '../index.ts';
import { EFFECT_TEMPLATES } from '../content.ts';
import { Planner } from '../../planner/index.ts';
import { BLOCKS } from '../../blocks/index.ts';
import { paramAt, settingAt } from '../../format/index.ts';
import { near } from '../../../../base/util/test/near.js';

const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);

// a planned effect's macros by name, each its value
function macrosOf(kind, asked) {
  const { macros } = planner.plan(kind, asked).node;
  return Object.fromEntries(macros.map((macro) => [macro.spec.name, macro.value]));
}

test("the eight effects, each of the effect's form, one input and one output, each planned, its label the name a device shows it by where it isn't its kind; the Tape delay the Delay's, its own label", () => {
  assert.deepEqual(
    EFFECT_TEMPLATES.map(({ kind }) => {
      const { form, label } = planner.plan(kind).node;
      return [kind, form, label];
    }),
    [
      ['Utility', 'effect', undefined],
      ['Filter', 'effect', 'LP filter'],
      ['Limiter', 'effect', undefined],
      ['Lookahead limiter', 'effect', undefined],
      ['Delay', 'effect', undefined],
      ['TapeDelay', 'effect', 'Tape delay'],
      ['Reverb', 'effect', undefined],
      ['Drive', 'effect', undefined],
    ],
  );
  const tape = planner.plan('TapeDelay').node;
  assert.deepEqual(
    tape.children.map((child) => child.name),
    ['line', 'lowpass', 'loop', 'wobble', 'depth'],
    "the Delay's, then its wobble",
  );
  assert.deepEqual(tape.wires.at(-1), { from: { node: 'depth', output: 'out' }, to: { node: 'line', param: 'ms' } });
});

test("their params macros by the names a desk keys them, each at its default as it starts: a desk's keys and its lanes' names kept; the Utility's level the fader's, in dB", () => {
  assert.deepEqual(macrosOf('Utility'), { level: 1, pan: 0 });
  assert.deepEqual(macrosOf('Filter'), { cutoff: 24000, q: 0.707 });
  assert.deepEqual(macrosOf('Limiter'), { gain: 0, ceiling: -0.3, release: 0.3 });
  assert.deepEqual(macrosOf('Lookahead limiter'), { gain: 0, ceiling: -1, release: 0.3, clip: 3 });
  assert.deepEqual(macrosOf('Delay'), { sync: 1, note: '1/8', ms: 417, feedback: 0.45, tone: 2400 });
  assert.deepEqual(macrosOf('TapeDelay'), { ...macrosOf('Delay'), rate: 0.5, depth: 0.004 }, '0.5 Hz, 4 ms either way');
  assert.deepEqual(macrosOf('Reverb'), {}, 'its length a setting');
  assert.deepEqual(macrosOf('Drive'), {
    drive: 1,
    punish: 0,
    style: 'smooth',
    'low cut': 20,
    thump: 0,
    tone: 1,
    'high cut': 20000,
    steep: 0,
    auto: 1,
    mix: 1,
    output: 1,
    oversample: '4x',
  });
  assert.deepEqual(
    paramAt(planner.plan('Utility'), ['level']).spec,
    { ...BLOCKS.gain.params[0], name: 'level' },
    "the fader's, in dB",
  );
});

test("the Delay's note a choice through its macro, onto its line; the Utility's pan pot and the Reverb's length settings", () => {
  const delay = planner.plan('Delay', { values: { note: '1/4', feedback: 0.6 } });
  assert.equal(paramAt(delay, ['line', 'note']).value, '1/4');
  assert.equal(paramAt(delay, ['loop', 'gain']).value, 0.6);
  assert.throws(
    () => planner.plan('Delay', { values: { note: 99 } }),
    { message: 'note: no choice 99' },
    'an index past its choices',
  );
  const utility = planner.plan('Utility', { settings: { 'pan/law': 'pan pot' } });
  assert.equal(settingAt(utility, ['pan', 'law']).value, 'pan pot');
  assert.equal(settingAt(planner.plan('Reverb'), ['length']).value, 3.5);
  assert.equal(
    settingAt(planner.plan('Reverb', { settings: { length: 2 } }), ['room', 'length']).value,
    2,
    "the room's, its own stands for",
  );
});

test("every effect's macros hinted, the words a device shows beside their knobs, from its template: all of an effect's or none yet (the Delay's and the Tape delay's write none)", () => {
  for (const { kind } of EFFECT_TEMPLATES) {
    const { macros } = planner.plan(kind).node;
    for (const { spec, hint } of macros.filter((macro) => macro.hint !== undefined)) {
      assert.ok(hint.length > 20, `${kind}/${spec.name}: its hint says something`);
    }
    const unhinted = macros.filter(({ hint }) => hint === undefined).map(({ spec }) => spec.name);
    if (unhinted.length < macros.length) {
      assert.deepEqual(unhinted, [], `${kind}: no macro without a hint`);
    }
  }
  assert.match(planner.plan('Limiter').node.macros[1].hint, /^The limiter: where it acts, in dBFS/);
  assert.match(planner.plan('Lookahead limiter').node.macros[1].hint, /^The limiter: the true peak it holds/);
});

// a planned effect's param or setting value, by its address
const value = (plan, ...address) => paramAt(plan, address)?.value;
const settingValue = (plan, ...address) => settingAt(plan, address)?.value;

test('the Drive planned whole, every node of its chain a block the libraries declare', () => {
  const { children } = planner.plan('Drive').node;
  assert.deepEqual(
    children.map(({ kind }) => kind),
    [
      'filter',
      'tilt',
      'saturation',
      'one pole',
      'filter',
      'filter',
      'gain',
      'gain',
      'gain',
      'shaper lag',
      'gain',
      'gain',
    ],
  );
  for (const { kind } of children) {
    assert.ok(BLOCKS[kind], `${kind}: a block`);
  }
});

test("the Drive's controls onto its chain: lows cut and tilted before the curve, the fizz cut after, mixed, trimmed", () => {
  const values = {
    drive: 8,
    punish: 1,
    style: 'triode',
    'low cut': 150,
    thump: 1,
    tone: 2,
    'high cut': 9000,
    steep: 1,
    auto: 0.7,
    mix: 0.4,
    output: 0.8,
    oversample: '2x',
  };
  const plan = planner.plan('Drive', { values });
  assert.equal(value(plan, 'saturation', 'drive'), 8);
  assert.equal(value(plan, 'saturation', 'punish'), 1);
  assert.equal(value(plan, 'saturation', 'style'), 'triode');
  assert.equal(value(plan, 'saturation', 'auto'), 0.7);
  assert.equal(value(plan, 'saturation', 'oversample'), '2x');
  assert.equal(value(plan, 'lag', 'oversample'), '2x', 'the dry held back as long as the wet');
  assert.equal(settingValue(plan, 'lows', 'type'), 'highpass');
  assert.equal(value(plan, 'lows', 'frequency'), 150);
  near(value(plan, 'lows', 'resonance'), Math.SQRT2, 'thump: +3 dB at the cut', 0.01);
  assert.equal(value(plan, 'tilt', 'tilt'), 2);
  for (const highs of ['highs', 'steep 1', 'steep 2']) {
    assert.equal(value(plan, highs, 'frequency'), 9000, highs);
  }
  assert.equal(value(plan, 'gentle', 'gain'), 0);
  assert.equal(value(plan, 'steeper', 'gain'), 1, 'steep: 30 dB an octave');
  assert.equal(value(plan, 'wet', 'gain'), 0.4);
  near(value(plan, 'dry', 'gain'), 0.6, 'the dry the rest');
  assert.equal(value(plan, 'trim', 'gain'), 0.8);
  for (const name of ['drive', 'tone', 'output']) {
    assert.equal(paramAt(plan, [name]).spec.dB, true, `${name}: a share shown in dB`);
  }
});

test("the Drive's steep high cut a 5th-order Butterworth: its one pole and two biquads at their Qs", () => {
  const plan = planner.plan('Drive');
  near(value(plan, 'steep 1', 'resonance'), 1 / (2 * Math.cos(Math.PI / 5)), 'the first biquad', 1e-3);
  near(value(plan, 'steep 2', 'resonance'), 1 / (2 * Math.cos((2 * Math.PI) / 5)), 'the second biquad', 1e-3);
});

test('the Drive at its defaults near as it came: no drive, smooth, its level held, open, all wet, at unity, 4x', () => {
  const plan = planner.plan('Drive');
  assert.equal(value(plan, 'saturation', 'drive'), 1);
  assert.equal(value(plan, 'saturation', 'punish'), 0);
  assert.equal(value(plan, 'saturation', 'style'), 'smooth');
  assert.equal(value(plan, 'saturation', 'auto'), 1);
  assert.equal(value(plan, 'saturation', 'oversample'), '4x');
  assert.equal(value(plan, 'lows', 'frequency'), 20);
  near(value(plan, 'lows', 'resonance'), Math.SQRT1_2, 'flat: no thump', 1e-3);
  assert.equal(value(plan, 'tilt', 'tilt'), 1);
  assert.equal(value(plan, 'highs', 'frequency'), 20000);
  assert.equal(value(plan, 'gentle', 'gain'), 1);
  assert.equal(value(plan, 'steeper', 'gain'), 0);
  assert.equal(value(plan, 'wet', 'gain'), 1);
  assert.equal(value(plan, 'trim', 'gain'), 1);
});
