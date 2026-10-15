// An envelope's curve (mockup/src/libs/plan/blocks/envelope-curve.ts), on numbers:
//   - its stages from its gate opening: after its delay up over its attack, held, down to its sustain;
//   - its release from its gate closing: from where its stages have it then, down to 0.
// On a target that takes a point as it is, its attack straight, its decay and release exponential.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeRelease, envelopeStages } from '../index.ts';

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
