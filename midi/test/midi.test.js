// The MIDI protocol's unit tests (mockup/src/libs/midi/, its test/ folder; G0a, mockup/architecture/done.md; the sequencer's until V1): a
// control surface's messages, MIDI 2.0's channel voice messages as values, and the notes among them; a note's index, handed out by note
// rotation. The sequencer's input, which passes them on, is tested in libs/midi-sequencer/test/input.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NoteRotation, notesIn } from '../index.ts';

const noteOn = (index, t, more = {}) => ({ type: 'note on', index, pitch: 60, velocity: 1, t, ...more });
const noteOff = (index, t) => ({ type: 'note off', index, t });
const perNote = (index, controller, value, t) => ({ type: 'per-note controller', index, controller, value, t });

test('note rotation: each note a fresh index, in turn', () => {
  const rotation = new NoteRotation();
  const handed = [rotation.noteOn(), rotation.noteOn(), rotation.noteOn()];
  assert.deepEqual(handed, [0, 1, 2]);
});

test('note rotation: an index let go is handed out again only once round the 128 note numbers', () => {
  const rotation = new NoteRotation();
  const first = rotation.noteOn();
  rotation.noteOff(first);
  const handed = Array.from({ length: 128 }, () => {
    const index = rotation.noteOn();
    rotation.noteOff(index);
    return index;
  });
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

test("a note's #3 Pitch changes sent with it are its glides, each at its time, apart from its values as it starts (G0d2)", () => {
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
