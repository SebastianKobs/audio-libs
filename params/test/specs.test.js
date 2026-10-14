// The params every module shares (mockup/src/libs/params/, DRY3): a gain in dB and back, the silence floor, and the specs a desk's strips,
// the FX modules and the synth's blocks each name as their own
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dBOf, FADER_GAIN, gainOf, PAN, positionOf, SILENCE, SWITCH, valueAt } from '../index.ts';
import { near } from '../../util/test/near.js';

test('a gain in dB and back: 0 dB unity, -6 about half, +6 about twice; the silence floor -80 dB', () => {
  assert.equal(gainOf(0), 1);
  near(gainOf(-6), 0.501187233627);
  near(dBOf(2), 6.020599913279624);
  near(dBOf(gainOf(-23.5)), -23.5, 'there and back');
  near(dBOf(SILENCE), -80, 'the floor');
});

test("the specs shared: a fader's gain, -60 to +6 dB by the fader law; a pan, -1 to 1 in a line; a switch, off or on", () => {
  assert.deepEqual(FADER_GAIN, { name: 'gain', range: [-60, 6, 0.1], dB: true, taper: 'fader' });
  assert.equal(positionOf(FADER_GAIN, 1), 2 / 3, 'unity two thirds up');
  assert.deepEqual([positionOf(PAN, -1), positionOf(PAN, 0), positionOf(PAN, 1)], [0, 0.5, 1]);
  assert.deepEqual([valueAt(SWITCH, 0.4), valueAt(SWITCH, 0.6)], [0, 1]);
  assert.ok(Object.isFrozen(FADER_GAIN) && Object.isFrozen(PAN.range), 'frozen: each module names its own copy');
});
