// ---------- phrasing/transforms: a pattern reshaped, as a player would. Pure ----------
// Notes: { start, deg, sounds, pitchBend, and a phrase's duration, vibrato, phrase, shape, k }, start and duration in ticks (libs/sequencer/index.ts), sounds
// in seconds; each transform changes them in place.
// rand() is given, and each draws in a fixed order, so a seeded replay is always the same. Which a player picks, and how often, is its owner's

import { type Grid } from '../sequencer/index.ts';
import { type NotePattern } from '../midi-sequencer/index.ts';
import type { Seconds, Ticks } from '../clock/index.ts';
import { modulo, pickFrom } from '../util/index.ts';
import { STEP, barTicks } from '../clock/index.ts';

// a phrase's note, as the transforms reshape it
export interface PhraseNote {
  start: Ticks;
  deg: number;
  sounds: Seconds; // how long it sounds
  pitchBend?: number | undefined;
  duration?: Ticks | undefined; // a rephrased note takes its slot's, which may have none
  vibrato?: number | undefined;
  phrase?: number | undefined; // a field given as undefined is one not given: a sung note hands on what its kept note had
  shape?: string | undefined;
  rhythmIndex?: number | null | undefined;
}

// the start moved to the next place of a cycle, in ticks: the answer in the bar after a call, such as a bass's motif every two bars
export function answer(start: number, grid: Grid): number {
  const si = Math.round(grid.stepAt(start));
  const everySteps = (2 * barTicks()) / STEP; // a two-bar cycle
  const atStep = barTicks() / STEP; // the answer in its second bar
  return grid.timeAt(si + modulo(atStep - si, everySteps));
}
export function layBack(notes: PhraseNote[], by: number): void {
  return notes.forEach((note) => {
    note.start += by;
  }); // later by so many ticks
}
// the last note held
export function holdLast(notes: PhraseNote[], sounds: Seconds): void {
  const last = notes.at(-1);
  if (last) {
    last.sounds = sounds;
  }
}
export function halfTime(notes: PhraseNote[], ring = 1): void {
  // twice as slow, the notes ringing longer
  const [first] = notes;
  if (!first) {
    return;
  }
  const base = first.start;
  notes.forEach((note) => {
    note.start = base + 2 * (note.start - base);
    note.sounds *= ring;
  });
}
// a breath: one note left out of the middle, or two when there are six or more, half the time. The first and the last stay
export function breath(notes: PhraseNote[], rand: () => number): void {
  const count = notes.length;
  const leaveOut = count >= 6 && rand() < 0.5 ? 2 : 1;
  notes.splice(1 + Math.floor(rand() * (count - 1 - leaveOut)), leaveOut);
}
// the last phrase in another rhythm from a set (patterns: { events: [{ start, duration }], vibrato }), not the one it came from (k): the same notes,
// phrased differently, from the 8th its first note is on. It keeps the first notes and the last; with more notes than the rhythm has,
// the middle ones drop out. soundsFor(duration): how long a note of so many ticks sounds
export function rephrase(
  notes: PhraseNote[],
  set: NotePattern[],
  rand: () => number,
  { soundsFor }: { soundsFor: (duration: Ticks) => Seconds },
): void {
  const last = notes.at(-1);
  if (!last) {
    return;
  }
  const from = notes.findIndex((note) => note.phrase === last.phrase);
  const grp = notes.slice(from); // the last phrase, its last note among them
  let choice = Math.floor(rand() * set.length);
  if (last.rhythmIndex != null && set.length > 1 && choice === last.rhythmIndex) {
    choice = (choice + 1) % set.length; // another than it had, if it came from one
  }
  const rhythm = set[choice];
  const lastSlot = rhythm?.events.at(-1);
  if (!rhythm || !lastSlot) {
    throw new Error('a rhythm to phrase it in, with no notes');
  }
  const kept = Math.min(grp.length, rhythm.events.length);
  const use = [...grp.slice(0, kept - 1), last];
  const slots = [...rhythm.events.slice(0, kept - 1), lastSlot];
  const [firstOfPhrase = last] = grp; // the phrase holds the last note at least
  const [firstSlot = lastSlot] = slots;
  const s16 = Math.round(firstOfPhrase.start / STEP);
  const s0 = (s16 + (s16 % 2)) * STEP; // on its 8th, if its first note came a 16th early
  use.forEach((note, i) => {
    const slot = slots[i];
    if (!slot) {
      throw new Error('a rhythm with fewer places than the notes it phrases');
    }
    note.start = s0 + (slot.start - firstSlot.start);
    note.duration = slot.duration;
    note.sounds = soundsFor(note.duration!);
    note.vibrato = rhythm.vibrato;
    note.rhythmIndex = null;
  });
  notes.splice(from, grp.length, ...use);
}
// a slide into one note the line arrives at: after a rest of two 16ths or more, a leap of two steps or more, on a long note (a dotted
// quarter or more), or the last; from below when it climbs, above when it falls, either way at random when it stays
export function slide(notes: PhraseNote[], rand: () => number): void {
  const arrivals = notes.filter((note, index) => arrivesAt(note, notes[index - 1], index === notes.length - 1));
  const note = pickFrom(arrivals, rand);
  if (!note) {
    return; // no notes: nothing to slide into
  }
  const previous = notes[notes.indexOf(note) - 1];
  const staysOrFirst = !previous || previous.deg === note.deg;
  let fromBelow: boolean;
  if (staysOrFirst) {
    fromBelow = rand() < 0.5;
  } else {
    fromBelow = note.deg > previous.deg;
  }
  note.pitchBend = fromBelow ? -1 : 1;
}
function arrivesAt(note: PhraseNote, previous: PhraseNote | undefined, isLast: boolean): boolean {
  if (!previous || isLast) {
    return true;
  }
  const rest = note.start - previous.start - (previous.duration || 0);
  const isLong = (note.duration ?? 0) >= 6 * STEP;
  const leap = Math.abs(note.deg - previous.deg);
  return rest > 1.99 * STEP || isLong || leap >= 2;
}
