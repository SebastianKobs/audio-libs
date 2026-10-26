// A note's frequency (mockup/src/libs/music/music-theory/pitch.ts): equal temperament from A4 = 440 Hz
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mtof } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test('a note number as its frequency: A4 is 440 Hz, an octave doubles it, a semitone is the twelfth root of 2', () => {
  assert.equal(mtof(69), 440);
  assert.deepEqual([57, 81].map(mtof), [220, 880], 'an octave down halves, up doubles');
  near(mtof(60), 261.6256, 'middle C', 1e-4);
  near(mtof(70) / mtof(69), 2 ** (1 / 12), 'a semitone up', 1e-12);
});
