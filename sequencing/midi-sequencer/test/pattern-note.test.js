// pattern-note's unit tests (mockup/src/libs/sequencing/midi-sequencer/pattern-note.ts): a record's whole phrases, or a slice of it
// where a note isn't in a phrase; the tests' own draws
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phrases } from '../index.ts';
import { STEP } from '../../clock/index.ts';

const draws = (...xs) => {
  let i = 0;
  return () => xs[i++];
}; // rand() giving these, in order

test('phrases: whole phrases, 1 up to all of them; a record not all in phrases is sliced', () => {
  const r = [0, 0, 1, 1, 1, 2].map((phrase, k) => ({ start: k * STEP, phrase }));
  assert.deepEqual(phrases(r, 'start', draws(0)), [0, 2], 'the first phrase');
  assert.deepEqual(phrases(r, 'start', draws(0.5)), [0, 5], 'two phrases');
  assert.deepEqual(phrases(r, 'random', draws(0, 0.99)), [5, 1], 'the last phrase alone');
  assert.deepEqual(phrases([{ start: 0, phrase: 0 }, { start: 24 }], 'start', draws(0.99)), [0, 2]);
});
