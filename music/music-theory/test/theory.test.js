// The music theory's unit tests (mockup/src/libs/music/music-theory): scales, and a degree's note in a key
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

test('the standard scales, each its steps in semitones from its root in one octave: the seven modes, the harmonic and melodic minor, both pentatonics, the blues, the whole tone and the chromatic', () => {
  assert.deepEqual(Object.keys(SCALES), [
    'major',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'minor',
    'locrian',
    'harmonicMinor',
    'melodicMinor',
    'majorPentatonic',
    'minorPentatonic',
    'blues',
    'wholeTone',
    'chromatic',
  ]);
  assert.deepEqual(SCALES.major, [0, 2, 4, 5, 7, 9, 11]);
  for (const steps of Object.values(SCALES)) {
    assert.equal(steps[0], 0, 'a scale starts on its root');
    assert.ok(
      steps.every((step, i) => i === 0 || step > (steps[i - 1] ?? -1)),
      'its steps rise',
    );
    assert.ok(
      steps.every((step) => step < 12),
      'its steps stay in one octave',
    );
  }
});
