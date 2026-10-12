// ---------- libs/sequencer/playing: a pattern played: its notes due on the grid, upcoming round its loop, unmuted or whole, live at a ----------
// speed, sounding, placed
import { MASTER, PPQ, STEP, lengthOf } from './pattern.ts';
import type { Pattern, PatternNote } from './pattern.ts';
import type { Meter } from '../clock/index.ts';

// the grid a pattern is placed on: where a clock time lies on it, in 16ths, and when a place on it sounds (the clock's)
// functions, not methods: they're handed on alone ({ stepAt, timeAt })
export interface Grid {
  stepAt: (t: number) => number;
  timeAt: (place: number) => number;
}
// a looping pattern's next count notes from a place (ticks from the grid's start), round the loop, each where it sounds from the grid's start
export function upcoming(pat: Pattern, at: number, count: number, meter: Meter = MASTER): PatternNote[] {
  if (!pat.notes.length) {
    return [];
  }
  const loopLength = lengthOf(pat, meter);
  const next: PatternNote[] = [];
  const from = pat.from!; // a record's pattern: where it was played
  for (let lap = Math.floor((at - from) / loopLength); next.length < count; lap++) {
    for (const note of pat.notes) {
      if (from + lap * loopLength + note.start >= at && next.length < count) {
        next.push({ ...note, start: from + lap * loopLength + note.start });
      }
    }
  }
  return next;
}
// the notes a replay unmutes, the pattern running on silently where it was played: from the next one at a place on, a random number of
// them, 1 up to all, round the loop. One draw
export function unmute(pat: Pattern, at: number, rand: () => number, meter: Meter = MASTER): PatternNote[] {
  return upcoming(pat, at, 1 + Math.floor(rand() * pat.notes.length), meter);
}
// a pattern played whole, as a launched clip: from its first note to its last, once, its first in the beat at a place (ticks from the
// grid's start), each note in its place in the beat as kept, so its swing and offbeats stay; its place in the bar moves by whole beats
export function whole(pat: Pattern, at: number, meter: Meter = MASTER): PatternNote[] {
  const [firstNote] = pat.notes;
  if (!firstNote) {
    return [];
  }
  const beat = (PPQ * 4) / meter[1];
  const first = firstNote.start;
  const shift = at + (((first % beat) + beat) % beat) - first;
  return pat.notes.map((note) => ({ ...note, start: note.start + shift }));
}
// what a repeating pattern plays in the grid's 16th i: its notes whose place comes round within it, every length from the grid's
// start, in the pattern's order, each with its offset, how many ticks into the 16th it starts
export function due(pat: Pattern, i: number, meter: Meter = MASTER): PatternNote[] {
  const loopLength = lengthOf(pat, meter);
  const t0 = i * STEP;
  return pat.notes.flatMap((note) => {
    const offset = (((note.start - t0) % loopLength) + loopLength) % loopLength;
    return offset < STEP ? [{ ...note, offset }] : [];
  }); // + loopLength: % keeps the sign, so a note already gone would count as due
}
// a rhythm played live, as a tower's while you circle: looping from where it started (start, in ticks from the grid's start), at a time
// scale (2: double time, 0.5: half), its notes whose places fall from a place up to another, each where it sounds, as long as it lasts then
export function liveNotes(
  pat: Pattern,
  start: number,
  scale: number,
  from: number,
  to: number,
  meter: Meter = MASTER,
): PatternNote[] {
  if (!pat.notes.length) {
    return [];
  }
  const loopLength = lengthOf(pat, meter) / scale;
  const found: PatternNote[] = [];
  for (let lap = Math.max(0, Math.floor((from - start) / loopLength)); start + lap * loopLength < to; lap++) {
    for (const note of pat.notes) {
      const at = start + lap * loopLength + note.start / scale;
      if (at >= from && at < to) {
        found.push({ ...note, start: at, ...(note.duration ? { duration: note.duration / scale } : {}) });
      }
    }
  }
  return found;
}
// the note of a rhythm played live sounding at a place, as what's left of it from there, if that's a 16th or more: so a soloist coming in
// mid-note plays it at once. One starting on the place isn't sounding yet: it comes as the next
export function soundingAt(
  pat: Pattern,
  start: number,
  scale: number,
  at: number,
  meter: Meter = MASTER,
): PatternNote | undefined {
  const sounding = liveNotes(pat, start, scale, at - lengthOf(pat, meter) / scale, at, meter)
    .filter((note) => note.start + (note.duration || 0) - at >= STEP)
    .pop();
  return sounding && { ...sounding, start: at, duration: sounding.start + sounding.duration! - at };
}
// where a rhythm playing from start at a scale would have had to start at another, to be where it has got to at a place: it runs on with
// no jump
export function rescaled(start: number, scale: number, next: number, at: number): number {
  return at - ((at - start) * scale) / next;
}
// where a pattern's places sound: on the grid, with its swing as it is now. base: the place, in ticks, its first note was kept at;
// start: the beat it starts on, a clock time. On the beat (from: 'beat'), or in the same place in the beat as its phrase began
// ('phrase'), so the swing falls on the same notes. Returns a place in ticks → clock time
export function place(
  base: number,
  start: number,
  grid: Grid,
  from = 'beat',
  meter: Meter = MASTER,
): (at: number) => number {
  const placed = placeOn(base, start, grid, from, meter);
  return (at: number) => grid.timeAt(placed(at));
}
// and where they lie on the grid, in 16ths, as place() times them: for a phrase sent as its notes come due, each timed then (P3c2)
export function placeOn(
  base: number,
  start: number,
  { stepAt }: Pick<Grid, 'stepAt'>,
  from = 'beat',
  meter: Meter = MASTER,
): (at: number) => number {
  const beat = (PPQ * 4) / meter[1];
  const s0 = Math.round(stepAt(start)) + (from === 'phrase' ? (((base % beat) + beat) % beat) / STEP : 0);
  return (at: number) => s0 + (at - base) / STEP;
}
