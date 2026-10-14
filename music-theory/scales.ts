// ---------- libs/music-theory/scales: scales, and a degree's note in a key ----------
// A scale is its steps in semitones from its root, in one octave; a key is { root, scale }, the root a MIDI note. A degree counts
// the scale's steps from an octave below the root, so degree 0 is the root an octave down, one scale's length on is the root itself, and
// a negative degree goes on down
import { modulo } from '../util/index.ts';

// a key: its root a MIDI note, its scale its steps in semitones from it
export interface Key {
  root: number;
  scale: number[];
}

export const SCALES = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  // the natural harmonic series: partials 8, 9, 10, 12 and 14 in every octave, in pure intervals rather than equal temperament, with a
  // natural seventh. A harmonic pentatonic, after Stockhausen's "Stimmung"
  harmonicPentatonic: [8, 9, 10, 12, 14].map((harmonic) => 12 * Math.log2(harmonic / 8)),
} satisfies Record<string, number[]>;

export function degreeNote(degree: number, { root, scale }: Key): number {
  const steps = scale.length;
  const octave = Math.floor(degree / steps);
  const i = modulo(degree, steps);
  const step = scale[i];
  if (step === undefined) {
    throw new Error('a scale with no steps');
  }
  return root - 12 + 12 * octave + step;
}
