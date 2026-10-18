// A note value in beats, and a time with a sync switch in seconds by a beat's length
// (mockup/src/libs/params/note-values.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeAt, NOTE_VALUES, noteValueBeats, timeSeconds } from '../index.ts';
import { near } from '../../util/test/near.js';

test('a note value in beats, as written: a quarter one, dotted half as long again, a triplet two thirds; none where it is not one', () => {
  assert.deepEqual(['1/4', '1/8', '1/8.', '1/2', '1/16t'].map(noteValueBeats), [1, 0.5, 0.75, 2, 1 / 6]);
  assert.deepEqual(['0.5', 'beat', '1/4x'].map(noteValueBeats), [undefined, undefined, undefined]);
});

test("a time's seconds: synced, its note value at the beat; free, its milliseconds, or a rate's turn; the other value kept, not heard", () => {
  const beat = 60 / 72;
  const synced = { sync: true, note: '1/8', free: 250, unit: 'ms' };
  near(timeSeconds(synced, beat), beat / 2, 'an 8th at 72 BPM');
  near(timeSeconds({ ...synced, note: '1/8.' }, beat), (beat / 2) * 1.5, 'dotted');
  near(timeSeconds({ ...synced, note: '1/8t' }, beat), (beat / 2) * (2 / 3), 'a triplet');
  near(timeSeconds({ ...synced, sync: false }, beat), 0.25, 'free: 250 ms');
  near(
    timeSeconds({ sync: false, note: '1/8', free: 4, unit: 'Hz' }, beat),
    0.25,
    'a rate of 4 Hz: a turn a quarter second',
  );
  near(timeSeconds({ sync: true, note: '1/4', free: 4, unit: 'Hz' }, beat), beat, 'a rate synced: a turn a beat');
});

test('the note values a synced time steps through: each longer than the last', () => {
  const beats = NOTE_VALUES.map(noteValueBeats);
  assert.ok(beats.every((length, index) => index === 0 || length > beats[index - 1]));
});

test("a synced time's free value at a beat: where its note is then, in its free unit, to its step", () => {
  const beat = 60 / 72;
  assert.equal(freeAt('1/8', beat, { unit: 'ms', range: [1, 4000, 1] }), 417, 'an 8th at 72 BPM, to the ms');
  assert.equal(freeAt('1/8.', beat, { unit: 'ms', range: [1, 4000, 1] }), 625, 'a dotted 8th');
  assert.equal(freeAt('1/4', 0.5, { unit: 'Hz', range: [0.01, 20, 0.01] }), 2, 'a rate: a turn a beat at 120 BPM');
});
