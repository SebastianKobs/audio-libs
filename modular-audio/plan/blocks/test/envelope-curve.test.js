// An envelope's curve (mockup/src/libs/modular-audio/plan/blocks/envelope-curve.ts), on numbers, as an ARP's:
//   - its stages from its gate opening: after its delay up over its attack, held, down to its sustain;
//   - its attack charging toward 1.3 times its peak, cut there at its time;
//   - its decay and its release approaching where they go, done at their time, within the floor of silence, never set there;
//   - its release from its gate closing: from where its stages have it then, down to 0;
//   - its whole curve from its gate opening at a time, released where it has closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envelopeCurve, envelopeRelease, envelopeStages } from '../index.ts';
import { levelAt } from '../../../../base/automation/index.ts';
import { SILENCE } from '../../../../base/params/index.ts';
import { near } from '../../../../base/util/test/near.js';

const NONE = { delay: 0, attack: 0, hold: 0, decay: 0, sustain: 1 };
// the attack's time constant, a time over it: an RC charging toward 1.3, at 1 after the attack's time
const CHARGED = Math.log(1.3 / (1.3 - 1));
// a decay's and a release's, a time over it: within the floor of silence of where it goes, at its time
const DONE = Math.log(1 / SILENCE);

test('its stages: after its delay up over its attack, toward 1.3 times its peak, cut there; held over its hold; down to its sustain over its decay, approaching it', () => {
  const times = { delay: 0.5, attack: 0.25, hold: 0.25, decay: 0.5, sustain: 0.5 };
  const stages = envelopeStages(times, 2, false);
  assert.deepEqual(stages, [
    ['set', 0, 0],
    ['target', 2.6, 0.5, 0.25 / CHARGED],
    ['set', 2, 0.75],
    ['target', 1, 1, 0.5 / DONE],
  ]);
});

test('its attack an RC charging past its peak, cut there at its time: faster at first, slowing to a quarter at the top', () => {
  const stages = envelopeStages({ ...NONE, attack: 1 }, 1, false);
  near(levelAt(stages.slice(0, 2), 1), 1, 'at its peak at its time');
  near(levelAt(stages, 0.5), 1.3 * (1 - Math.sqrt(0.3 / 1.3)), 'halfway, past half');
  const slope = (t) => (levelAt(stages, t + 1e-6) - levelAt(stages, t)) / 1e-6;
  near(slope(0.999) / slope(0), 0.3 / 1.3, 'its speed at the top', 0.001);
});

test('its decay and its release done at their time: within the floor of silence of where they go', () => {
  const stages = envelopeStages({ ...NONE, decay: 1, sustain: 0.25 }, 1, false);
  near(levelAt(stages, 1), 0.25 + 0.75 * SILENCE, 'its decay at its time');
  const { automation } = envelopeRelease(2, { from: 3, stages });
  near(levelAt(automation, 5), 0.25 * SILENCE, 'its release at its time');
});

test('its stages, the short ways: no delay and no attack, at its top at once; no decay and a full sustain, nothing more; a stage with no time set at its start; one that runs on, its first a value', () => {
  assert.deepEqual(envelopeStages(NONE, 1, false), [['set', 1, 0]]);
  assert.deepEqual(envelopeStages({ ...NONE, delay: 0.25 }, 1, false), [
    ['set', 0, 0],
    ['set', 1, 0.25],
  ]);
  assert.deepEqual(envelopeStages({ ...NONE, sustain: 0.5 }, 1, false), [
    ['set', 1, 0],
    ['set', 0.5, 0],
  ]);
  assert.deepEqual(envelopeStages({ ...NONE, attack: 0.25 }, 1, true)[0], ['value', 0]);
});

test('its release from its gate closing: from where its stages have it, a stage running then cut there; down to 0; when it has faded', () => {
  const stages = envelopeStages({ ...NONE, attack: 1, decay: 1, sustain: 0.5 }, 1, false);
  const { automation, faded } = envelopeRelease(0.5, { from: 0.25, stages });
  assert.deepEqual(
    automation.map(([kind, , at]) => [kind, at]),
    [
      ['set', 0.25],
      ['target', 0.25],
    ],
  );
  near(automation[0][1], 1.3 * (1 - Math.exp(-0.25 * CHARGED)), 'cut where its attack has it');
  assert.deepEqual(automation[1], ['target', 0, 0.25, 0.5 / DONE]);
  assert.equal(faded, 0.75);
  const [held] = envelopeRelease(0.5, { from: 4, stages }).automation;
  assert.deepEqual([held[0], held[2]], ['set', 4], 'at its sustain');
  near(held[1], 0.5 + 0.5 * Math.exp(-3 * DONE), 'within the floor of silence of it');
  const { automation: cut, faded: at } = envelopeRelease(0, { from: 4, stages });
  assert.deepEqual([cut[1], at], [['set', 0, 4], 4], 'no release: at nothing at once');
});

test("its amount below 0, a pitch's sweep down: every point its share of it, its attack toward 1.3 times it", () => {
  assert.deepEqual(envelopeStages({ ...NONE, attack: 0.5, decay: 0.5, sustain: 0 }, -0.4, false), [
    ['set', 0, 0],
    ['target', -0.52, 0, 0.5 / CHARGED],
    ['set', -0.4, 0.5],
    ['target', 0, 0.5, 0.5 / DONE],
  ]);
});

test('its whole curve from its gate opening at a time: its stages from then; released where its gate has closed, from where they have it then', () => {
  const times = { ...NONE, attack: 1, decay: 1, sustain: 0.5 };
  assert.deepEqual(envelopeCurve(times, 1, { opened: 10, release: 0.5 }), [
    ['set', 0, 10],
    ['target', 1.3, 10, 1 / CHARGED],
    ['set', 1, 11],
    ['target', 0.5, 11, 1 / DONE],
  ]);
  const released = envelopeCurve(times, 1, { opened: 10, closed: 10.25, release: 0.5 });
  assert.deepEqual(
    released.map(([kind, , at]) => [kind, at]),
    [
      ['set', 10],
      ['target', 10],
      ['set', 10.25],
      ['target', 10.25],
    ],
  );
});
