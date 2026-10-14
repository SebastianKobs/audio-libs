// ---------- libs/synth/values: the values in a patch that depend on the note ----------
// values (a builder's n) hold the patch's params, the note's values and its context (see index.ts). In a patch:
// - a time is seconds, or a sum of terms in its values: '0.35 duration', 'decay + 0.05', '2 rise', 'duration in 0.1..0.5' (clamped), or
//   note values, from the length of a beat: '1/8', '1/4.' (dotted), '1/8t' (a triplet). A time can name a param that holds one: 'time',
//   with params: { time: '1/8' }
// - a value can depend on the note, { if: 'held && vibrato > 12', then: 0.1, else: 0.06 }, or name one of its values: 'vibrato', or be
//   drawn between two with the context's random(): { between: [0.35, 0.65] }
// - a block can be there only when: { when: 'held' }. Conditions: 'held', '!held', 'vibrato > 12', joined by &&
// - a frequency is hertz, or a multiple of the note's, at most so much: { key: 8, max: 9000 }
import { mappedValue, mappingOf } from './mappings.ts';
import { noteValueBeats, type Seconds } from '../clock/index.ts';

export type { Seconds };
// a voice's note, after MIDI 2.0's per-note model: its note number and velocity, as a note-on carries them; its length to its note-off;
// its per-note pitch bend and the moves it makes; its vibrato; and a role's own values. Named as the DAWs name a note's
export interface Note {
  pitch: number; // its note number, a fraction for pure intervals (Stimmung's), as MIDI 2.0's per-note pitch carries it
  velocity: number; // 0 to 1, as MIDI 2.0's 16 bits, normalised
  duration?: Seconds | undefined; // to its note-off
  pitchBend?: number | undefined; // semitones, where it starts
  pitchGlides?: [after: Seconds, pitch: number][] | undefined; // where its pitch moves while it sounds
  vibrato?: number | undefined; // its depth, a per-note expression, as VST3's
  held?: boolean | undefined; // a vine's: held, as its vibrato says
  rise?: Seconds | undefined; // a bloom's: how long it swells
}
// beside the note, the garden's (G0 takes them over): the tempo, a beat in seconds; the random source. The key isn't the synth's: a voice
// gets its pitch (G0.1d)
export interface Context {
  beat?: Seconds;
  random: () => number;
}
// a device's parameters, its state, not the note's: by the names its patch gives them, the release the VCA's envelope reads among them
export interface Params {
  release?: Seconds;
  [name: string]: unknown;
}
// what a block reads, by name, as a patch's times, values and conditions name it: the note, its context and its device's params, merged.
// An FX module has no note
export type Values = Partial<Note> & Context & Params;
export type Condition = string;
// a value as a patch writes it: itself, one of two by a condition, one drawn between two, or the name of one of its values
export type Valued<Value> =
  Value | { if: Condition; then: Valued<Value>; else: Valued<Value> } | { between: [number, number] } | string;
export type Time = Valued<number | string>;
export type Freq = Valued<number | { key: number; max?: number }>;
export function when(block: { when?: Condition }, values: Values): boolean {
  return block.when === undefined || holds(block.when, values);
}

function holds(condition: Condition, values: Values): boolean {
  return condition.split('&&').every((part) => holdsOne(part, values));
}
// one condition: a value by name, ! before it for its absence, or compared with a number ('held', '!held', 'vib > 12')
function holdsOne(part: string, values: Values): boolean {
  const parts = part.trim().match(/^(!?)(\w+)\s*(?:(>=|<=|>|<|==)\s*(-?[\d.]+))?$/);
  if (!parts) {
    throw new Error(`a condition it can't read: ${part}`);
  }
  const [, not = '', name = '', comparison, number = ''] = parts; // its name always matched, its sign and number with a comparison
  const value = values[name];
  if (!comparison) {
    return not ? !value : !!value;
  }
  return compares(value, comparison, +number);
}
// a value compared with a number: equal to it, or as JavaScript compares a value with a number, undefined never holding, true as 1
function compares(value: unknown, comparison: string, limit: number): boolean {
  if (comparison === '==') {
    return value === limit;
  }
  const compared = Number(value);
  switch (comparison) {
    case '>':
      return compared > limit;
    case '<':
      return compared < limit;
    case '>=':
      return compared >= limit;
    default:
      return compared <= limit;
  }
}
export function val<Value>(valued: Valued<Value>, values: Values): Value {
  if (valued && typeof valued === 'object' && 'if' in valued) {
    return val(holds(valued.if, values) ? valued.then : valued.else, values);
  }
  if (valued && typeof valued === 'object' && 'between' in valued) {
    return (valued.between[0] + values.random() * (valued.between[1] - valued.between[0])) as Value;
  }
  if (typeof valued === 'string') {
    const value = named(valued, values);
    if (value !== undefined) {
      return value as Value;
    }
  }
  return valued as Value;
}
// a value by name, or with a factor, held within a range, plus an offset ('0.5 vibrato', I1i2); none where it names none: a word, a wave
function named(written: string, values: Values): number | undefined {
  const value = values[written];
  if (typeof value === 'number') {
    return value;
  }
  const mapping = mappingOf(written);
  return mapping ? mappedValue(mapping, values) : undefined;
}
export function time(spec: Time, values: Values): number {
  let resolved = val(spec, values);
  if (typeof resolved === 'string') {
    const named = values[resolved];
    if (typeof named === 'string') {
      resolved = named; // a param that holds a time: a delay line's note value
    }
  }
  if (typeof resolved === 'number') {
    return resolved;
  }
  const written = resolved; // as the patch writes it, such as '1.1 duration'
  return written.split('+').reduce((sum, term) => sum + termTime(term.trim(), written, values), 0);
}
// one term of a time: a note value ('1/4' a beat, dotted '1/8.', a triplet '1/8t'), seconds, or a value by name read as its mapping
// (mappings.ts): its factor ('1.1 duration'), held between two ('duration in 0.2..0.6', at least so much with no top, '0.5 rise in 0.05..')
function termTime(term: string, written: string, values: Values): number {
  const beats = noteValueBeats(term);
  if (beats !== undefined) {
    return noteValueTime(beats, written, values);
  }
  if (/^-?[\d.]+$/.test(term)) {
    return +term;
  }
  const mapping = mappingOf(term);
  const value = mapping && mappedValue(mapping, values);
  if (typeof value !== 'number') {
    throw new Error(`a time it can't read: ${written}`);
  }
  return value;
}
// a note value at the beat, so many beats of it: '1/4' a beat, dotted '1/8.', a triplet '1/8t'
function noteValueTime(beats: number, written: string, values: Values): number {
  const beat = values.beat;
  if (beat === undefined || !(beat > 0)) {
    throw new Error(`a note value with no beat: ${written}`);
  }
  return beat * beats;
}
// whether a time is written as a note value ('1/8', '1/4.', '1/8t'), as a delay line's time can be
export function isNoteValue(term: string): boolean {
  return noteValueBeats(term) !== undefined;
}
export function freq(written: Freq, noteFrequency: number, values: Values): number {
  const value = val(written, values);
  return typeof value === 'number' ? value : Math.min(value.max ?? Infinity, noteFrequency * value.key);
}
