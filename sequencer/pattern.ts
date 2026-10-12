// ---------- libs/sequencer/pattern: a pattern of events, as a clip, and its ticks: its length, a record as a pattern ----------
import type { Meter } from '../clock/index.ts';

// time as a pattern counts it: 96 ticks to the quarter, as a MIDI file's
export type Ticks = number;
// an event of a pattern: where it starts and how long it lasts, in ticks, and how far off its 16th it sounds, as due() hands it on; and
// whatever else its caller gives it, which the sequencer passes on and never reads
export interface PatternEvent {
  start: Ticks;
  duration?: Ticks | undefined;
  offset?: Ticks | undefined;
  [value: string]: unknown;
}
// a pattern, as a clip: its time signature, its length in bars, whether it loops, where a record was played from, its events, its name
export interface Pattern<Event extends PatternEvent = PatternEvent> {
  meter?: Meter;
  bars?: number;
  loop?: boolean;
  from?: number;
  events: Event[];
  name?: string;
}

export const PPQ = 96; // ticks to a quarter note: a 16th is 24, a 16th triplet 16, an 8th triplet 32, all whole
export const STEP = PPQ / 4; // ticks to a 16th, the grid's step
export const MASTER: Meter = [4, 4]; // the master's time signature, unless the caller has its own
// a bar's length in ticks, in a time signature [beats, unit]; a pattern's length, its bars in its own time signature or the master's
export function barTicks([beats, unit]: Meter = MASTER): number {
  return (beats * PPQ * 4) / unit;
}
// whether the 16th i starts a bar, in a time signature, the master's unless given: where a change waits for, as a clip launched on a bar
export function startsBar(i: number, meter: Meter = MASTER): boolean {
  return (i * STEP) % barTicks(meter) === 0;
}
export function lengthOf(pat: Pick<Pattern, 'bars' | 'meter'>, meter: Meter = MASTER): number {
  return (pat.bars ?? 1) * barTicks(pat.meter ?? meter);
}
// a record as the pattern it is: from the one of the bar its first note fell in, as many whole cycles long as it needs, each note where it
// fell in it, in time order. A record keeps places from the grid's start; its pattern loops from where it was played (from), every its length
export function patternOf<Event extends PatternEvent>(
  record: Event[],
  cycle: number,
  meter: Meter = MASTER,
): Pattern<Event> {
  const bar = barTicks(meter);
  const from = Math.floor(Math.min(...record.map((ev) => ev.start)) / bar) * bar;
  const events = record
    .map((ev) => ({ ...ev, start: ev.start - from }))
    .sort((first, second) => first.start - second.start);
  const end = Math.max(...events.map((event) => event.start + (event.duration || 1))); // a long one as long as it lasts
  return { meter, bars: (Math.ceil(end / cycle) * cycle) / bar, loop: true, from, events };
}
