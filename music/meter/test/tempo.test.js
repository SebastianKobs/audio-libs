// Beats and milliseconds at a tempo (music/meter/tempo.ts): a beat a quarter note, bpm quarters a minute
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beatsToMs, msToBeats } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test('a beat at 120 bpm is 500 ms; 4 at 60, 4000; and back', () => {
  assert.equal(beatsToMs(1, 120), 500);
  assert.equal(beatsToMs(4, 60), 4000);
  assert.equal(msToBeats(250, 120), 0.5);
  near(msToBeats(beatsToMs(3.37, 97), 97), 3.37);
});
