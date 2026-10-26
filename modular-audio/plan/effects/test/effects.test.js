// The effects' unit tests (mockup/src/libs/modular-audio/plan/effects): each a template, as its YAML writes it.
//   - the six, each of the effect's form, one input and one output, its label where it has one, planned with no failure;
//     the Tape delay the Delay's;
//   - their params macros by the names a desk keys them, the Utility's level the fader's;
//   - the Delay's note a choice through its macro; the Utility's pan pot a setting; the Reverb's length one;
//   - every macro its hint, the words a device shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_FORM } from '../index.ts';
import { EFFECT_TEMPLATES } from '../content.ts';
import { Planner } from '../../planner/index.ts';
import { BLOCKS } from '../../blocks/index.ts';
import { paramAt, settingAt } from '../../format/index.ts';

const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);

// a planned effect's macros by name, each its value
function macrosOf(kind, asked) {
  const { macros } = planner.plan(kind, asked).node;
  return Object.fromEntries(macros.map((macro) => [macro.spec.name, macro.value]));
}

test("the six effects, each of the effect's form, one input and one output, each planned, its label the name a device shows it by where it isn't its kind; the Tape delay the Delay's, its own label", () => {
  assert.deepEqual(
    EFFECT_TEMPLATES.map(({ kind }) => {
      const { form, label } = planner.plan(kind).node;
      return [kind, form, label];
    }),
    [
      ['Utility', 'effect', undefined],
      ['Filter', 'effect', 'LP filter'],
      ['Limiter', 'effect', undefined],
      ['Delay', 'effect', undefined],
      ['TapeDelay', 'effect', 'Tape delay'],
      ['Reverb', 'effect', undefined],
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
  assert.deepEqual(macrosOf('Delay'), { sync: 1, note: '1/8', ms: 417, feedback: 0.45, tone: 2400 });
  assert.deepEqual(macrosOf('TapeDelay'), { ...macrosOf('Delay'), rate: 0.5, depth: 0.004 }, '0.5 Hz, 4 ms either way');
  assert.deepEqual(macrosOf('Reverb'), {}, 'its length a setting');
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
});
