// ---------- phrasing/record: what's played into a track kept, and a slice of it or whole phrases; the cycle ----------
import { lengthOf, upcoming } from '../sequencer/index.ts';
import { type NotePattern, type PatternNote } from '../midi-sequencer/index.ts';
import { COMMON_TIME, barTicks } from '../clock/index.ts';
import type { Meter } from '../clock/index.ts';

// keeps an event in a record, up to its cap; the event, or null once it's full
export function keep<Item>(record: Item[], ev: Item, cap = Infinity): Item | null {
  if (record.length >= cap) {
    return null;
  }
  record.push(ev);
  return ev;
}
// a slice of a record of count events: [where it starts, how many], a random length from 1 to all of it, from the start, or anywhere
// (from: 'random'). The length is drawn first
export function slice(count: number, from: string | undefined, rand: () => number): [number, number] {
  const len = 1 + Math.floor(rand() * count);
  return [from === 'random' ? Math.floor(rand() * (count - len + 1)) : 0, len];
}
// whole phrases of a record kept in phrases (each event's phrase): 1 up to all of them, so a line never stops before its end. A record not
// all in phrases is sliced as above
export function phrases(record: PatternNote[], from: string | undefined, rand: () => number): [number, number] {
  if (record.some((ev) => ev.phrase == null)) {
    return slice(record.length, from, rand);
  }
  const starts = record.flatMap((ev, index) => (index === 0 || ev.phrase !== record[index - 1]?.phrase ? [index] : []));
  const count = starts.length;
  const len = 1 + Math.floor(rand() * count);
  const firstPhrase = from === 'random' ? Math.floor(rand() * (count - len + 1)) : 0;
  const first = starts[firstPhrase];
  if (first === undefined) {
    return [0, 0]; // an empty record: nothing to play
  }
  const end = starts[firstPhrase + len] ?? record.length; // the next phrase's start, or the record's end
  return [first, end - first];
}
// the notes a play of a record unmutes, the pattern running on silently where it was
// played: from the next one at a place on, a random number of them, 1 up to all, round
// the loop. One draw
export function unmute(pat: NotePattern, at: number, rand: () => number, meter: Meter = COMMON_TIME): PatternNote[] {
  return upcoming(pat, at, 1 + Math.floor(rand() * pat.events.length), meter);
}
// every pattern in a bank: anything with events, in it or in its sets
export function patternsIn(bank: unknown, found: NotePattern[] = []): NotePattern[] {
  const part = bank as { events?: unknown } | null | undefined;
  if (part?.events) {
    found.push(part as NotePattern);
  } else if (part && typeof part === 'object') {
    for (const inner of Object.values(part)) {
      patternsIn(inner, found);
    }
  }
  return found;
}
// a set of patterns' cycle, in ticks: its longest pattern, in whole bars of the master's, at least one. What's recorded is as long, or longer in
// whole cycles, so a pattern played along with the longest stays with it
export function cycleOf(patterns: NotePattern[], meter: Meter = COMMON_TIME): number {
  const bar = barTicks(meter);
  return Math.max(1, ...patterns.map((pattern) => Math.ceil(lengthOf(pattern, meter) / bar))) * bar;
}
