// ---------- libs/sequencer/pattern: a pattern, as a clip, and its ticks: its length, its cycle, a record as a pattern ----------
import type { Meter } from '../clock/index.ts';

// time as a pattern counts it: 96 ticks to the quarter, as a MIDI file's
export type Ticks = number;
// a note of a pattern: where it starts and how long it lasts, in ticks; and what else its pattern gives it: a step of the scale from the
// pattern's own note, a note number of its own, a drum's (the brushes'), the phrase of a record it's in, its vibrato, how far off its 16th
// it sounds; and what a record keeps beside (where it was swung, its bulb, segment or leaf, its shape, its glides), the garden's own
export interface PatternNote {
  start: Ticks;
  duration?: Ticks | undefined;
  step?: number | undefined;
  pitch?: number | undefined;
  phrase?: number | undefined;
  vibrato?: number | undefined; // a field given as undefined is one not given: a record keeps its pattern's, which may have none
  offset?: Ticks | undefined; // as due() hands it on: how far off its 16th it sounds
  [value: string]: unknown;
}
// a pattern, as a clip: its time signature, its length in bars, whether it loops, where a record was played from, its notes
export interface Pattern {
  meter?: Meter;
  bars?: number;
  loop?: boolean;
  from?: number;
  notes: PatternNote[];
  name?: string;
  shape?: string;
  vibrato?: number;
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
export function lengthOf(pat: Pattern, meter: Meter = MASTER): number {
  return (pat.bars ?? 1) * barTicks(pat.meter ?? meter);
}
// every pattern in a bank: anything with notes, in it or in its sets
export function patternsIn(bank: unknown, found: Pattern[] = []): Pattern[] {
  const part = bank as { notes?: unknown } | null | undefined;
  if (part?.notes) {
    found.push(part as Pattern);
  } else if (part && typeof part === 'object') {
    for (const inner of Object.values(part)) {
      patternsIn(inner, found);
    }
  }
  return found;
}
// a theme's cycle, in ticks: its longest pattern, in whole bars of the master's, at least one. What's recorded is as long, or longer in
// whole cycles, so a pattern played along with the longest stays with it
export function cycleOf(patterns: Pattern[], meter: Meter = MASTER): number {
  const bar = barTicks(meter);
  return Math.max(1, ...patterns.map((pattern) => Math.ceil(lengthOf(pattern, meter) / bar))) * bar;
}
// a record as the pattern it is: from the one of the bar its first note fell in, as many whole cycles long as it needs, each note where it
// fell in it, in time order. A record keeps places from the grid's start; its pattern loops from where it was played (from), every its length
export function patternOf(record: PatternNote[], cycle: number, meter: Meter = MASTER): Pattern {
  const bar = barTicks(meter);
  const from = Math.floor(Math.min(...record.map((ev) => ev.start)) / bar) * bar;
  const notes = record
    .map((ev) => ({ ...ev, start: ev.start - from }))
    .sort((first, second) => first.start - second.start);
  const end = Math.max(...notes.map((note) => note.start + (note.duration || 1))); // a long note as long as it lasts
  return { meter, bars: (Math.ceil(end / cycle) * cycle) / bar, loop: true, from, notes };
}
