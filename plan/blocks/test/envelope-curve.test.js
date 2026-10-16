// An envelope's curve (mockup/src/libs/plan/blocks/envelope-curve.ts), on numbers:
//   - its stages from its gate opening: after its delay up over its attack, held, down to its sustain;
//   - its release from its gate closing: from where its stages have it then, down to 0;
//   - its curve's three shapes, exponential, to its target, in a line;
//   - its whole curve from its gate opening at a time, released where it has closed.
// On a target that takes a point as it is, its attack straight, its decay and release exponential.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeCurve, envelopeRelease, envelopeStages, envelopeTarget } from '../index.ts';
import { SILENCE } from '../../../params/index.ts';
import { near } from '../../../util/test/near.js';

const TARGET = { valueAt: (point) => point, rampOf: (stage) => (stage === 'attack' ? 'linear' : 'exp') };
const NONE = { delay: 0, attack: 0, hold: 0, decay: 0, sustain: 1 };

test('its stages: after its delay up over its attack, held over its hold, down to its sustain over its decay; each level held until its stage starts', () => {
  const times = { delay: 0.5, attack: 0.25, hold: 0.25, decay: 0.5, sustain: 0.5 };
  assert.deepEqual(envelopeStages(times, TARGET, false), [
    ['set', 0, 0],
    ['set', 0, 0.5],
    ['linear', 1, 0.75],
    ['set', 1, 1],
    ['exp', 0.5, 1.5],
  ]);
});

test('its stages, the short ways: no delay and no attack, at its top at once; no decay and a full sustain, nothing more; a stage with no time set at its start; one that runs on, its first a value', () => {
  assert.deepEqual(envelopeStages(NONE, TARGET, false), [['set', 1, 0]]);
  assert.deepEqual(envelopeStages({ ...NONE, attack: 0.25 }, TARGET, false), [
    ['set', 0, 0],
    ['linear', 1, 0.25],
  ]);
  assert.deepEqual(envelopeStages({ ...NONE, sustain: 0.5 }, TARGET, false), [
    ['set', 1, 0],
    ['set', 0.5, 0],
  ]);
  assert.deepEqual(envelopeStages({ ...NONE, attack: 0.25 }, TARGET, true)[0], ['value', 0]);
});

test('its release from its gate closing: from where its stages have it, a ramp running then cut there; down to 0 over its release; when it has faded', () => {
  const stages = envelopeStages({ ...NONE, attack: 1, decay: 1, sustain: 0.5 }, TARGET, false);
  assert.deepEqual(envelopeRelease(0.5, TARGET, { from: 0.25, stages }), {
    automation: [
      ['linear', 0.25, 0.25],
      ['exp', 0, 0.75],
    ],
    faded: 0.75,
  });
  assert.deepEqual(envelopeRelease(0.5, TARGET, { from: 4, stages }).automation[0], ['set', 0.5, 4], 'at its sustain');
  assert.deepEqual(envelopeRelease(0, TARGET, { from: 4, stages }), {
    automation: [
      ['set', 0.5, 4],
      ['set', 0, 4],
    ],
    faded: 4,
  });
});

test("its curve's three shapes: exponential, up in a line, down straight in dB, never past the floor of silence; to its target, each stage approaching its point by its time as a time constant; in a line", () => {
  const exponential = envelopeTarget('exponential', 0.8);
  assert.deepEqual([exponential.valueAt(1), exponential.valueAt(0.5), exponential.valueAt(0)], [0.8, 0.4, SILENCE]);
  assert.deepEqual(['attack', 'decay', 'release'].map(exponential.rampOf), ['linear', 'exp', 'exp']);
  assert.equal(envelopeTarget('exponential', -2).valueAt(0), -SILENCE, 'below 0, its floor below it');
  const target = envelopeTarget('target', 2);
  assert.deepEqual([target.valueAt(0), target.valueAt(1)], [0, 2]);
  assert.deepEqual(['attack', 'decay', 'release'].map(target.rampOf), ['target', 'target', 'target']);
  const linear = envelopeTarget('linear', -0.6);
  near(linear.valueAt(0), 0);
  near(linear.valueAt(1), -0.6);
  assert.deepEqual(['attack', 'decay', 'release'].map(linear.rampOf), ['linear', 'linear', 'linear']);
});

test('its stages to their target: each approached from its start by its time, no level held before it; an LFO fading in after its delay', () => {
  const fade = { ...NONE, delay: 0.4, attack: 0.25 };
  assert.deepEqual(envelopeStages(fade, envelopeTarget('target', 2), false), [
    ['set', 0, 0],
    ['target', 2, 0.4, 0.25],
  ]);
  const stages = envelopeStages({ ...NONE, decay: 0.5, sustain: 0.5 }, envelopeTarget('target', 1), false);
  assert.deepEqual(stages, [
    ['set', 1, 0],
    ['target', 0.5, 0, 0.5],
  ]);
  const [cut, release] = envelopeRelease(0.3, envelopeTarget('target', 1), { from: 2, stages }).automation;
  assert.deepEqual([cut[0], cut[2]], ['set', 2], 'set where it is, four time constants down');
  near(cut[1], 0.5 + 0.5 * Math.exp(-4));
  assert.deepEqual(release, ['target', 0, 2, 0.3]);
});

test('its whole curve from its gate opening at a time: its stages from then; released where its gate has closed, from where they have it then', () => {
  const times = { ...NONE, attack: 1, decay: 1, sustain: 0.5 };
  assert.deepEqual(envelopeCurve(times, TARGET, { opened: 10, release: 0.5 }), [
    ['set', 0, 10],
    ['linear', 1, 11],
    ['exp', 0.5, 12],
  ]);
  assert.deepEqual(envelopeCurve(times, TARGET, { opened: 10, closed: 10.25, release: 0.5 }), [
    ['set', 0, 10],
    ['linear', 0.25, 10.25],
    ['exp', 0, 10.75],
  ]);
});
