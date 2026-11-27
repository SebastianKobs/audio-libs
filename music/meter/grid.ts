// ---------- music/meter/grid: a bar's grid, each beat cut in its subdivisions ----------
// Each beat, a quarter note, is cut in its own count: 4 its 16ths, 3 its 8th triplets, mixed in a bar as written. A bar whose last
// beat is short, 3.5 beats, keeps only the positions inside it.
import { barBeats, type Meter } from './meter.ts';

// a position on the grid: its start in the bar in beats, its beat, its index in the beat, and the count the beat is cut in
export interface GridPosition {
  readonly at: number;
  readonly beat: number;
  readonly index: number;
  readonly of: number;
}

const INSIDE = 1e-9; // beats: a position this close to the bar's end is the next bar's

// the positions of a bar, each beat cut in the same count, or in its own, a count a beat; refused where a list doesn't give every beat
// its own or a count isn't a whole number above 0
export function gridPositions(meter: Meter, subdivisions: number | readonly number[]): GridPosition[] {
  const length = barBeats(meter);
  const counts = countsByBeat(length, subdivisions);
  return counts.flatMap((of, beat) =>
    Array.from({ length: of }, (_, index) => ({ at: beat + index / of, beat, index, of })).filter(
      (position) => position.at < length - INSIDE,
    ),
  );
}
// each beat's count, every beat of the bar, a short last one too
function countsByBeat(length: number, subdivisions: number | readonly number[]): readonly number[] {
  const beats = Math.ceil(length - INSIDE);
  const counts = typeof subdivisions === 'number' ? Array.from({ length: beats }, () => subdivisions) : subdivisions;
  if (counts.length !== beats) {
    throw new Error(
      `A grid's subdivisions: a bar of ${length} beats takes ${beats} subdivisions, one a beat, not ${counts.length}`,
    );
  }
  const wrong = counts.find((count) => !Number.isInteger(count) || count < 1);
  if (wrong !== undefined) {
    throw new Error(`A beat's subdivision is a whole number above 0, not ${wrong}`);
  }
  return counts;
}
