// MIDI's protocol (midi/protocol/): a note's index handed out by note rotation, and
// MIDI 2.0's note messages as values, a note's messages and the note they read back as.
// The sequencer's input, which passes them on, is tested in sequencing/midi-sequencer/test/input.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NoteRotation, noteMessages, notesIn, retimed } from '../index.ts';

const noteOn = (index, t, more = {}) => ({ type: 'note on', index, pitch: 60, velocity: 1, t, ...more });
const noteOff = (index, t) => ({ type: 'note off', index, t });
const perNote = (index, controller, value, t) => ({ type: 'per-note controller', index, controller, value, t });

test('note rotation: an index let go is handed out again only once round the 128 note numbers', () => {
  const rotation = new NoteRotation();
  const first = rotation.noteOn();
  rotation.noteOff(first);
  const handed = Array.from({ length: 128 }, () => {
    const index = rotation.noteOn();
    rotation.noteOff(index);
    return index;
  });
  assert.deepEqual([first, ...handed.slice(0, 2)], [0, 1, 2], 'each note a fresh index, in turn');
  assert.equal(handed[0], 1, 'the next in turn, not the one just let go');
  assert.equal(handed[127], 0, 'once round, the first again');
});

test('note rotation: an index still on is passed over, so two notes of one pitch keep apart', () => {
  const rotation = new NoteRotation();
  rotation.noteOn(); // 0, never let go
  for (let k = 1; k < 128; k++) {
    rotation.noteOff(rotation.noteOn());
  }
  assert.equal(rotation.noteOn(), 1, 'round again: 0 is still on, so 1');
});

test('note rotation: with all 128 on, the next in turn, its note taken over', () => {
  const rotation = new NoteRotation();
  for (let k = 0; k < 128; k++) {
    rotation.noteOn();
  }
  assert.equal(rotation.noteOn(), 0);
});

test('a note on with its note off is a note with a length; one whose note off has not come with it has none yet', () => {
  const notes = notesIn([noteOn(3, 10), noteOn(4, 10.5), noteOff(3, 10.25)]);
  assert.deepEqual(
    notes.map(({ noteOn: on, duration }) => [on.index, duration]),
    [
      [3, 0.25],
      [4, undefined],
    ],
  );
});

test("a note's per-note controllers sent with it are its values as it starts; another note's are not", () => {
  const [note] = notesIn([
    noteOn(3, 10),
    perNote(3, 'volume', 0.5, 10),
    perNote(3, 'pan', -0.2, 10),
    perNote(7, 'volume', 0.9, 10),
    noteOff(3, 10.25),
  ]);
  assert.deepEqual(note.controllers, { volume: 0.5, pan: -0.2 });
});

test("a note's #3 Pitch changes sent with it are its glides, each at its time, apart from its values as it starts", () => {
  const [note] = notesIn([
    noteOn(3, 10),
    perNote(3, 'bend', -1, 10),
    perNote(3, 'pitch', 62, 10.4),
    perNote(3, 'pitch', 64, 10.8),
    noteOff(3, 11),
  ]);
  assert.deepEqual(note.controllers, { bend: -1 });
  assert.deepEqual(note.glides, [
    [10.4, 62],
    [10.8, 64],
  ]);
});

test("a note's messages, as notesIn() reads them back: its note on, its values as it starts, its glides at their times, its note off where its length is known", () => {
  const note = {
    pitch: 60,
    velocity: 0.5,
    t: 2,
    part: 3,
    duration: 1,
    controllers: { bend: -1, 'vibrato depth': 8 },
    glides: [[2.5, 62]],
  };
  const messages = noteMessages(note, 4);
  assert.deepEqual(messages, [
    { type: 'note on', index: 4, pitch: 60, velocity: 0.5, t: 2, part: 3 },
    { type: 'per-note controller', index: 4, controller: 'bend', value: -1, t: 2 },
    { type: 'per-note controller', index: 4, controller: 'vibrato depth', value: 8, t: 2 },
    { type: 'per-note controller', index: 4, controller: 'pitch', value: 62, t: 2.5 },
    { type: 'note off', index: 4, t: 3 },
  ]);
  const [read] = notesIn(messages);
  assert.deepEqual([read.duration, read.controllers, read.glides], [1, note.controllers, note.glides], 'and back');
  assert.deepEqual(
    noteMessages({ pitch: 60, velocity: 1, t: 2, controllers: { rise: 0.5, bend: undefined } }, 1, 1.5),
    [
      { type: 'note on', index: 1, pitch: 60, velocity: 1, t: 2 },
      { type: 'per-note controller', index: 1, controller: 'rise', value: 0.5, t: 1.5 },
    ],
    'held, no note off; its values sent when asked; a value it has none of left out',
  );
});

test("messages on another clock: each one's time moved by the clock's own, the rest as it was", () => {
  const messages = [noteOn(1, 2), perNote(1, 'pitch', 62, 2.5), noteOff(1, 3)];
  assert.deepEqual(
    retimed(messages, (t) => t + 10),
    [noteOn(1, 12), perNote(1, 'pitch', 62, 12.5), noteOff(1, 13)],
  );
  assert.deepEqual(messages[0], noteOn(1, 2), 'the messages handed in left as they were');
});
