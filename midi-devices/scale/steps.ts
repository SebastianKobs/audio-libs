// ---------- midi-devices/scale/steps: how far a pitch moves from one key into another, by its step ----------
// A pitch is matched to a step within a tolerance: a key an octave down may differ in its last bit, and
// Stimmung's steps aren't whole semitones (music-theory's degreeNote).
import { degreeNote, type Key } from '../../music/music-theory/index.ts';

// a semitone's error still on a step: a float's last bits, not a fraction of a step
const TOLERANCE = 0.000001;

// how far a pitch moves from one key into another: the step below it, in each key, differ by this.
// A pitch outside its key moves with the step under it, so a glide keeps its place between steps.
export function shiftInto(pitch: number, from: Key, into: Key): number {
  const degree = stepBelow(pitch, from);
  return degreeNote(degree, into) - degreeNote(degree, from);
}
// the largest degree of the key whose note is at or below the pitch, within the tolerance
function stepBelow(pitch: number, from: Key): number {
  const reach = pitch + TOLERANCE;
  // an octave below the pitch: its first step is at or below it, so the walk up starts below
  let degree = Math.floor((pitch - from.root) / 12) * from.scale.length;
  while (degreeNote(degree + 1, from) <= reach) {
    degree++;
  }
  return degree;
}
