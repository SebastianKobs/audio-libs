// ---------- libs/sequencer/playing: a pattern played: its events due on the grid, upcoming round its loop, whole, live at a speed, ----------
// under way, placed
import { MASTER, PPQ, STEP, lengthOf } from './pattern.ts';
import type { Pattern, PatternEvent } from './pattern.ts';
import type { Meter } from '../clock/index.ts';

// the grid a pattern is placed on: where a clock time lies on it, in 16ths, and the clock time a place on it falls at (the clock's)
// functions, not methods: they're handed on alone ({ stepAt, timeAt })
export interface Grid {
  stepAt: (t: number) => number;
  timeAt: (place: number) => number;
}
// a looping pattern's next count events from a place (ticks from the grid's start), round the loop, each where it falls from the grid's start
export function upcoming<Event extends PatternEvent>(
  pat: Pattern<Event>,
  at: number,
  count: number,
  meter: Meter = MASTER,
): Event[] {
  if (!pat.events.length) {
    return [];
  }
  const loopLength = lengthOf(pat, meter);
  const next: Event[] = [];
  const from = pat.from!; // a record's pattern: where it was played
  for (let lap = Math.floor((at - from) / loopLength); next.length < count; lap++) {
    for (const event of pat.events) {
      if (from + lap * loopLength + event.start >= at && next.length < count) {
        next.push({ ...event, start: from + lap * loopLength + event.start });
      }
    }
  }
  return next;
}
// a pattern played whole, as a launched clip: from its first event to its last, once, its first in the beat at a place (ticks from the
// grid's start), each event in its place in the beat as kept, so its swing and offbeats stay; its place in the bar moves by whole beats
export function whole<Event extends PatternEvent>(pat: Pattern<Event>, at: number, meter: Meter = MASTER): Event[] {
  const [firstEvent] = pat.events;
  if (!firstEvent) {
    return [];
  }
  const beat = (PPQ * 4) / meter[1];
  const first = firstEvent.start;
  const shift = at + (((first % beat) + beat) % beat) - first;
  return pat.events.map((event) => ({ ...event, start: event.start + shift }));
}
// what a repeating pattern plays in the grid's 16th i: its events whose place comes round within it, every length from the grid's
// start, in the pattern's order, each with its offset, how many ticks into the 16th it starts
export function due<Event extends PatternEvent>(pat: Pattern<Event>, i: number, meter: Meter = MASTER): Event[] {
  const loopLength = lengthOf(pat, meter);
  const t0 = i * STEP;
  return pat.events.flatMap((event) => {
    const offset = (((event.start - t0) % loopLength) + loopLength) % loopLength;
    return offset < STEP ? [{ ...event, offset }] : [];
  }); // + loopLength: % keeps the sign, so an event already gone would count as due
}
// a rhythm played live, as a tower's while you circle: looping from where it started (start, in ticks from the grid's start), at a time
// scale (2: double time, 0.5: half), its events whose places fall from a place up to another, each where it falls, as long as it lasts then
export function liveEvents<Event extends PatternEvent>(
  pat: Pattern<Event>,
  start: number,
  scale: number,
  from: number,
  to: number,
  meter: Meter = MASTER,
): Event[] {
  if (!pat.events.length) {
    return [];
  }
  const loopLength = lengthOf(pat, meter) / scale;
  const found: Event[] = [];
  for (let lap = Math.max(0, Math.floor((from - start) / loopLength)); start + lap * loopLength < to; lap++) {
    for (const event of pat.events) {
      const at = start + lap * loopLength + event.start / scale;
      if (at >= from && at < to) {
        found.push({ ...event, start: at, ...(event.duration ? { duration: event.duration / scale } : {}) });
      }
    }
  }
  return found;
}
// the event of a rhythm played live under way at a place, as what's left of it from there, if that's a 16th or more: so one coming in
// partway, as a soloist comes in mid-note, takes it up at once. One starting on the place isn't under way yet: it comes as the next
export function underWayAt<Event extends PatternEvent>(
  pat: Pattern<Event>,
  start: number,
  scale: number,
  at: number,
  meter: Meter = MASTER,
): Event | undefined {
  const underWay = liveEvents(pat, start, scale, at - lengthOf(pat, meter) / scale, at, meter)
    .filter((event) => event.start + (event.duration || 0) - at >= STEP)
    .pop();
  return underWay && { ...underWay, start: at, duration: underWay.start + underWay.duration! - at };
}
// where a rhythm playing from start at a scale would have had to start at another, to be where it has got to at a place: it runs on with
// no jump
export function rescaled(start: number, scale: number, next: number, at: number): number {
  return at - ((at - start) * scale) / next;
}
// where a pattern's places fall: on the grid, with its swing as it is now. base: the place, in ticks, its first event was kept at;
// start: the beat it starts on, a clock time. On the beat (from: 'beat'), or in the same place in the beat as its phrase began
// ('phrase'), so the swing falls on the same events. Returns a place in ticks → clock time
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
// and where they lie on the grid, in 16ths, as place() times them: for a phrase sent as its events come due, each timed then (P3c2)
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
