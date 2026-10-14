// ---------- libs/sequencer/pattern: a pattern of events, as a clip, and its ticks: its length, a record as a pattern ----------
import { barTicks, COMMON_TIME, type Meter, type Ticks } from '../clock/index.ts';

// an event of a pattern: where it starts and how long it lasts, in ticks, and how far off its 16th it falls, as due() hands it on; and
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

// a pattern's length, its bars in its own time signature or the master's
export function lengthOf(pat: Pick<Pattern, 'bars' | 'meter'>, meter: Meter = COMMON_TIME): Ticks {
  return (pat.bars ?? 1) * barTicks(pat.meter ?? meter);
}
// a record as the pattern it is: from the one of the bar its first event fell in, as many whole cycles long as it needs, each event where it
// fell in it, in time order. A record keeps places from the grid's start; its pattern loops from where it was played (from), every its length
export function patternOf<Event extends PatternEvent>(
  record: Event[],
  cycle: number,
  meter: Meter = COMMON_TIME,
): Pattern<Event> {
  const bar = barTicks(meter);
  const from = Math.floor(Math.min(...record.map((ev) => ev.start)) / bar) * bar;
  const events = record
    .map((ev) => ({ ...ev, start: ev.start - from }))
    .sort((first, second) => first.start - second.start);
  const end = Math.max(...events.map((event) => event.start + (event.duration || 1))); // a long one as long as it lasts
  return { meter, bars: (Math.ceil(end / cycle) * cycle) / bar, loop: true, from, events };
}
