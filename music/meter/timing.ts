// ---------- music/meter/timing: a timing template, an offset for each index of a beat cut in so many ----------
// A player's feel as data: each 16th, or each triplet, early or late by its own. A template applies to the beats cut as it is,
// so a 16ths' feel leaves a triplet where it is.
import type { GridPosition } from './grid.ts';
import { msToBeats } from './tempo.ts';

// the offsets for a beat cut in `subdivision`, one an index, late positive, in beats or in ms
export interface TimingTemplate {
  readonly subdivision: number;
  readonly offsets: readonly number[];
  readonly unit: 'beats' | 'ms';
}

// a position's offset, in beats, ms turned into beats at bpm; none for a beat cut otherwise
export function timingOffset(position: GridPosition, template: TimingTemplate, bpm: number): number {
  if (position.of !== template.subdivision) {
    return 0;
  }
  const offset = template.offsets[position.index] ?? 0;
  if (template.unit === 'ms') {
    return msToBeats(offset, bpm);
  }
  return offset;
}
// where a position sounds with its offset, in beats
export function timedPosition(position: GridPosition, template: TimingTemplate, bpm: number): number {
  return position.at + timingOffset(position, template, bpm);
}
