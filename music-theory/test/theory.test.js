// The music theory's unit tests (mockup/src/libs/music-theory): scales, and a degree's note in a key
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALES, chordNote, degreeNote } from '../index.ts';

test('a degree counts the scale from an octave below the root, and on down below it', () => {
  const D = { root: 62, scale: SCALES.majorPentatonic };
  assert.deepEqual(
    [0, 1, 4, 5, 6, 10].map((d) => degreeNote(d, D)),
    [50, 52, 59, 62, 64, 74],
  );
  assert.deepEqual(
    [-1, -5, -6].map((d) => degreeNote(d, D)),
    [47, 38, 35],
  );
  assert.equal(chordNote({ degree: 7 }, D), degreeNote(7, D), "a chord's degree is one");
  assert.equal(chordNote({ semi: -24 }, D), 38);
});
