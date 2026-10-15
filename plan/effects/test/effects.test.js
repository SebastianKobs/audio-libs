// The effects' unit tests (mockup/src/libs/plan/effects): each a template, as its YAML writes it.
//   - the five, each of the effect's form, one input and one output, planned with no failure;
//   - their params macros by today's names, a desk's keys; a macro's spec its target's where it writes none;
//   - the Delay's note a choice through its macro; the Utility's pan pot a setting; the Reverb's length one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_FORM, EFFECT_TEMPLATES } from '../index.ts';
import { Planner } from '../../planner/index.ts';
import { BLOCKS } from '../../blocks/index.ts';
import { paramAt, settingAt } from '../../format/index.ts';

const planner = new Planner(EFFECT_TEMPLATES, [EFFECT_FORM]);

// a planned effect's macros by name, each its value
function macrosOf(kind, asked) {
  const { macros } = planner.plan(kind, asked).node.inside;
  return Object.fromEntries(macros.map((macro) => [macro.spec.name, macro.value]));
}

test("the five effects, each of the effect's form, one input and one output, each planned", () => {
  assert.deepEqual(
    EFFECT_TEMPLATES.map((template) => [template.kind, template.form]),
    [
      ['Utility', 'effect'],
      ['Filter', 'effect'],
      ['Limiter', 'effect'],
      ['Delay', 'effect'],
      ['Reverb', 'effect'],
    ],
  );
  assert.deepEqual(EFFECT_FORM, { name: 'effect', inputs: ['in'], outputs: ['out'] });
  for (const { kind } of EFFECT_TEMPLATES) {
    assert.equal(planner.plan(kind).node.kind, kind);
  }
});

test("their params macros by today's names, at today's values as each starts: a desk's keys and its lanes' names kept", () => {
  assert.deepEqual(macrosOf('Utility'), { level: 1, pan: 0 });
  assert.deepEqual(macrosOf('Filter'), { cutoff: 24000, q: 1.085 });
  assert.deepEqual(macrosOf('Limiter'), { gain: 16, ceiling: -0.3, release: 0.3 });
  assert.deepEqual(macrosOf('Delay'), { sync: 1, note: '1/8', ms: 417, feedback: 0.45, tone: 2400 });
  assert.deepEqual(macrosOf('Reverb'), {}, 'its length a setting');
});

test("a macro's spec its target's, under its name, where it writes none; the Delay's feedback and tone its own", () => {
  const utility = planner.plan('Utility');
  assert.deepEqual(paramAt(utility, ['level']).spec, { ...BLOCKS.gain.params[0], name: 'level' }, "the fader's, in dB");
  const delay = planner.plan('Delay');
  assert.deepEqual(paramAt(delay, ['note']).spec, BLOCKS.delay.params[1]);
  assert.deepEqual(paramAt(delay, ['feedback']).spec, { name: 'feedback', range: [0, 0.95, 0.01], default: 0.45 });
  assert.deepEqual(paramAt(delay, ['tone']).spec, { name: 'tone', unit: 'Hz', range: [100, 12000, 10], default: 2400 });
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
  assert.equal(settingAt(planner.plan('Reverb'), ['room', 'length']).value, 3.5);
});
