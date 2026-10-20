// The effects' unit tests (mockup/src/libs/plan/effects): each a template, as its YAML writes it.
//   - the six, each of the effect's form, one input and one output, planned with no failure; the Tape delay the Delay's;
//   - their params macros by today's names, a desk's keys; a macro's spec its target's where it writes none;
//   - the Delay's note a choice through its macro; the Utility's pan pot a setting; the Reverb's length one.
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

test("the six effects, each of the effect's form, one input and one output, each planned; the Tape delay the Delay's", () => {
  assert.deepEqual(
    EFFECT_TEMPLATES.map(({ kind }) => [kind, planner.plan(kind).node.form]),
    [
      ['Utility', 'effect'],
      ['Filter', 'effect'],
      ['Limiter', 'effect'],
      ['Delay', 'effect'],
      ['TapeDelay', 'effect'],
      ['Reverb', 'effect'],
    ],
  );
  assert.deepEqual(EFFECT_FORM, { name: 'effect', inputs: ['in'], outputs: ['out'] });
  const tape = planner.plan('TapeDelay').node;
  assert.deepEqual(
    tape.children.map((child) => child.name),
    ['line', 'lowpass', 'loop', 'wobble', 'depth'],
    "the Delay's, then its wobble",
  );
  assert.deepEqual(tape.wires.at(-1), { from: { node: 'depth', output: 'out' }, to: { node: 'line', param: 'ms' } });
});

test("their params macros by the names a desk keys them, each at its default as it starts: a desk's keys and its lanes' names kept", () => {
  assert.deepEqual(macrosOf('Utility'), { level: 1, pan: 0 });
  assert.deepEqual(macrosOf('Filter'), { cutoff: 24000, q: 0.707 });
  assert.deepEqual(macrosOf('Limiter'), { gain: 0, ceiling: -0.3, release: 0.3 });
  assert.deepEqual(macrosOf('Delay'), { sync: 1, note: '1/8', ms: 417, feedback: 0.45, tone: 2400 });
  assert.deepEqual(macrosOf('TapeDelay'), { ...macrosOf('Delay'), rate: 0.5, depth: 0.004 }, '0.5 Hz, 4 ms either way');
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
  assert.equal(settingAt(planner.plan('Reverb'), ['length']).value, 3.5);
  assert.equal(
    settingAt(planner.plan('Reverb', { settings: { length: 2 } }), ['room', 'length']).value,
    2,
    "the room's, its own stands for",
  );
});

test("each effect's label, the name a device shows it by, where it isn't its kind: the Filter a lowpass, the Tape delay its own over the Delay's none (LAY12d1)", () => {
  assert.deepEqual(
    ['Utility', 'Filter', 'Limiter', 'Delay', 'TapeDelay', 'Reverb'].map((kind) => planner.plan(kind).node.label),
    [undefined, 'LP filter', undefined, undefined, 'Tape delay', undefined],
  );
});

test("each insert's macros carry their words, the hints a device shows, from its template: the Utility's, the Filter's, the Limiter's (LAY12e1)", () => {
  const hints = (kind) =>
    planner.plan(kind).node.macros.map(({ spec, hint }) => [spec.name, typeof hint === 'string' && hint.length > 20]);
  assert.deepEqual(hints('Utility'), [
    ['level', true],
    ['pan', true],
  ]);
  assert.deepEqual(hints('Filter'), [
    ['cutoff', true],
    ['q', true],
  ]);
  assert.deepEqual(hints('Limiter'), [
    ['gain', true],
    ['ceiling', true],
    ['release', true],
  ]);
  assert.match(planner.plan('Limiter').node.macros[1].hint, /^The limiter: where it acts, in dBFS/);
});
