// ---------- formats/midi-file/encode: a Standard MIDI File's bytes from its tracks ----------
// Bytes out, no file written: that's the caller's. At one tick the tempo and time signature come first, then notes let go, then
// controllers, then notes begun, so a note on the same pitch starts after the last one ends and hears the controllers sent with it.
// A note off is sent as 0x80 with the release velocity 64, the standard's for none.
import type { ControllerChange, MidiFile, MidiNote, MidiTrack, TempoChange, TimeSignatureChange } from './tracks.ts';
import { LARGEST_VARIABLE_LENGTH, variableLength } from './variable-length.ts';

// an event's bytes at its tick, its rank deciding its place among those at the same tick
interface TrackEvent {
  tick: number;
  rank: number;
  bytes: number[];
}

const RANKS = Object.freeze({ meta: 0, noteOff: 1, controller: 2, noteOn: 3, ownNoteOff: 4 });
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROLLER = 0xb0;
const META = 0xff;
const TEMPO = 0x51;
const TIME_SIGNATURE = 0x58;
const END_OF_TRACK = 0x2f;
const RELEASE_VELOCITY = 64; // a note off's velocity where none is meant, as the standard has it
const CLOCKS_PER_CLICK = 24; // a metronome's click a quarter, in MIDI clocks
const THIRTY_SECONDS_PER_QUARTER = 8;
const LARGEST_PPQ = 0x7fff; // the top bit set means SMPTE frames
const LARGEST_TEMPO = 0xffffff; // three bytes
const DENOMINATORS: readonly number[] = [1, 2, 4, 8, 16, 32, 64];

// a file's bytes; refused, saying where and what, where a value doesn't fit its field
export function encodeMidiFile(file: MidiFile): Uint8Array {
  checkFile(file);
  const conductor = [...file.tempos.map(tempoEvent), ...file.timeSignatures.map(timeSignatureEvent)];
  const chunks = file.tracks.map((track, index) => {
    const meta = index === 0 ? conductor : [];
    return trackChunk([...meta, ...trackEvents(track, index)]);
  });
  return Uint8Array.from([...headerChunk(file), ...chunks.flat()]);
}
function checkFile(file: MidiFile): void {
  if (file.format !== 0 && file.format !== 1) {
    throw refusal(`its format is 0 or 1, not ${String(file.format)}`);
  }
  checkWhole(file.ppq, 1, LARGEST_PPQ, 'its ppq');
  if (file.tracks.length === 0) {
    throw refusal('it holds at least one track');
  }
  if (file.format === 0 && file.tracks.length !== 1) {
    throw refusal(`format 0 holds one track, not ${file.tracks.length}`);
  }
  file.tempos.forEach((tempo, index) => checkTempo(tempo, `tempo ${index + 1}: its`));
  file.timeSignatures.forEach((signature, index) => checkTimeSignature(signature, `time signature ${index + 1}: its`));
}
function checkTempo(tempo: TempoChange, its: string): void {
  checkWhole(tempo.tick, 0, Infinity, `${its} tick`);
  checkWhole(tempo.microsecondsPerQuarter, 1, LARGEST_TEMPO, `${its} microsecondsPerQuarter`);
}
function checkTimeSignature(signature: TimeSignatureChange, its: string): void {
  checkWhole(signature.tick, 0, Infinity, `${its} tick`);
  checkWhole(signature.numerator, 1, 255, `${its} numerator`);
  if (!DENOMINATORS.includes(signature.denominator)) {
    throw refusal(`${its} denominator is a power of 2 from 1 to 64, not ${signature.denominator}`);
  }
}
function checkWhole(value: number, low: number, high: number, what: string): void {
  if (Number.isInteger(value) && value >= low && value <= high) {
    return;
  }
  const range = high === Infinity ? `from ${low} up` : `from ${low} to ${high}`;
  throw refusal(`${what} is a whole number ${range}, not ${value}`);
}
function refusal(reason: string): Error {
  return new Error(`Can't write the MIDI file: ${reason}`);
}
function tempoEvent({ tick, microsecondsPerQuarter }: TempoChange): TrackEvent {
  const bytes = [
    (microsecondsPerQuarter >> 16) & 0xff,
    (microsecondsPerQuarter >> 8) & 0xff,
    microsecondsPerQuarter & 0xff,
  ];
  return { tick, rank: RANKS.meta, bytes: [META, TEMPO, bytes.length, ...bytes] };
}
// the denominator written as its power of 2
function timeSignatureEvent({ tick, numerator, denominator }: TimeSignatureChange): TrackEvent {
  const bytes = [numerator, Math.log2(denominator), CLOCKS_PER_CLICK, THIRTY_SECONDS_PER_QUARTER];
  return { tick, rank: RANKS.meta, bytes: [META, TIME_SIGNATURE, bytes.length, ...bytes] };
}
// a track's notes, each its note on and off, and its controllers, checked as they're turned to events
function trackEvents(track: MidiTrack, index: number): TrackEvent[] {
  const where = `track ${index + 1}`;
  const notes = track.notes.flatMap((note, at) => noteEvents(note, `${where}, note ${at + 1}: its`));
  const controllers = track.controllers.map((change, at) =>
    controllerEvent(change, `${where}, controller ${at + 1}: its`),
  );
  return [...notes, ...controllers];
}
// a note's on and off; a note of no length lets go after it starts, not before
function noteEvents(note: MidiNote, its: string): TrackEvent[] {
  checkWhole(note.tick, 0, Infinity, `${its} tick`);
  checkWhole(note.duration, 0, Infinity, `${its} duration`);
  checkWhole(note.pitch, 0, 127, `${its} pitch`);
  checkWhole(note.velocity, 1, 127, `${its} velocity`);
  checkWhole(note.channel, 0, 15, `${its} channel`);
  const end = note.tick + note.duration;
  return [
    { tick: note.tick, rank: RANKS.noteOn, bytes: [NOTE_ON | note.channel, note.pitch, note.velocity] },
    {
      tick: end,
      rank: note.duration === 0 ? RANKS.ownNoteOff : RANKS.noteOff,
      bytes: [NOTE_OFF | note.channel, note.pitch, RELEASE_VELOCITY],
    },
  ];
}
function controllerEvent(change: ControllerChange, its: string): TrackEvent {
  checkWhole(change.tick, 0, Infinity, `${its} tick`);
  checkWhole(change.controller, 0, 127, `${its} controller`);
  checkWhole(change.value, 0, 127, `${its} value`);
  checkWhole(change.channel, 0, 15, `${its} channel`);
  return {
    tick: change.tick,
    rank: RANKS.controller,
    bytes: [CONTROLLER | change.channel, change.controller, change.value],
  };
}
// a track chunk: its events in time order, each after its delta time, then its end
function trackChunk(events: TrackEvent[]): number[] {
  const ordered = events.toSorted((one, other) => one.tick - other.tick || one.rank - other.rank);
  const body: number[] = [];
  let tick = 0;
  for (const event of ordered) {
    body.push(...deltaTime(event.tick - tick), ...event.bytes);
    tick = event.tick;
  }
  body.push(0, META, END_OF_TRACK, 0);
  return [...text('MTrk'), ...uint32(body.length), ...body];
}
function deltaTime(ticks: number): number[] {
  if (ticks > LARGEST_VARIABLE_LENGTH) {
    throw refusal(`a gap of ${ticks} ticks between two events, over the ${LARGEST_VARIABLE_LENGTH} a delta time holds`);
  }
  return variableLength(ticks);
}
function headerChunk(file: MidiFile): number[] {
  return [...text('MThd'), ...uint32(6), ...uint16(file.format), ...uint16(file.tracks.length), ...uint16(file.ppq)];
}
function text(letters: string): number[] {
  return Array.from({ length: letters.length }, (_, index) => letters.charCodeAt(index));
}
function uint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}
function uint32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}
