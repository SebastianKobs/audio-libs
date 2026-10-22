// The test notes (mockup/src/libs/modular-audio/build/instrument/test-notes.ts), a device view's, played straight into an instrument of
// their own for each key, made at its first test note, never through a sequencer, so never recorded:
//   - each note a fresh index, phrased as its owner says, held at most 30 s;
//   - let go as its button is: its note off at that time;
//   - pressed and let go as the app's messages, by its key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TestNotes } from '../index.ts';

// test notes on instruments that keep what they receive, each made once for its key; phrased as a note on alone
function notesOn() {
  const made = [];
  const instrumentFor = (key) => {
    const instrument = { key, received: [] };
    instrument.receive = (messages) => instrument.received.push(...messages);
    made.push(instrument);
    return instrument;
  };
  const phrase = (key, note, index) => [{ type: 'note on', key, index, ...note }];
  return { made, notes: new TestNotes({ instrumentFor, phrase }) };
}
const NOTE = { pitch: 62, velocity: 1, t: 2, values: { rise: 0.75 } };

test("a test note on its key's instrument, made at its first note, once; a fresh index, held at most 30 s, phrased as its owner says", () => {
  const { made, notes } = notesOn();
  notes.play('hold', NOTE);
  notes.play('hold', { ...NOTE, t: 3 });
  notes.play('tap', NOTE);
  assert.deepEqual(
    made.map(({ key }) => key),
    ['hold', 'tap'],
    'one for each key',
  );
  assert.deepEqual(
    made[0].received.map(({ index, duration, values }) => [index, duration, values]),
    [
      [0, 30, { rise: 0.75 }],
      [1, 30, { rise: 0.75 }],
    ],
  );
});

test('let go as its button is: its note off at that time', () => {
  const { made, notes } = notesOn();
  notes.play('hold', NOTE).release(4);
  assert.deepEqual(
    made[0].received.map(({ type, index, t }) => [type, index, t]),
    [
      ['note on', 0, 2],
      ['note off', 0, 4],
    ],
  );
});

test("pressed and let go as the app's messages: a key's test note let go by its key, once", () => {
  const { made, notes } = notesOn();
  notes.hear({ type: 'test note', key: 'hold', note: NOTE });
  notes.hear({ type: 'test note released', key: 'hold', t: 4 });
  notes.hear({ type: 'test note released', key: 'hold', t: 5 });
  assert.deepEqual(
    made[0].received.map(({ type, index, t }) => [type, index, t]),
    [
      ['note on', 0, 2],
      ['note off', 0, 4],
    ],
  );
});
