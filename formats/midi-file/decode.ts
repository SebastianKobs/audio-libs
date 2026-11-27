// ---------- formats/midi-file/decode: a Standard MIDI File's tracks from its bytes ----------
// Bytes in, no file read: that's the caller's. A file is an edge: anything malformed is refused, saying what and at which byte.
// Read: formats 0 and 1 in ticks to a quarter; running status; a note on of velocity 0 as a note off; notes paired into a start
// and a length, each note off letting go the earliest held on its pitch and channel, one never let go ending with its track; the tempo
// map and time signatures from every track, in time order; controllers. Skipped: other channel messages, sysex, other meta events,
// chunks of other types.
import type { ControllerChange, MidiFile, MidiNote, TempoChange, TimeSignatureChange } from './tracks.ts';
import { ByteReader, refused } from './byte-reader.ts';

// a file's header: its format, how many tracks it names, its ticks to a quarter
interface Header {
  format: 0 | 1;
  trackCount: number;
  ppq: number;
}
// what a track chunk holds, its tempo map and time signatures apart, as they're the whole file's
interface TrackRead {
  notes: MidiNote[];
  controllers: ControllerChange[];
  tempos: TempoChange[];
  timeSignatures: TimeSignatureChange[];
}

const HEADER_LENGTH = 6;
const SMPTE = 0x8000; // the division's top bit: ticks by SMPTE frames
const STATUS = 0x80; // a status byte's top bit, which no data byte has
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROLLER = 0xb0;
const PROGRAM_CHANGE = 0xc0;
const CHANNEL_PRESSURE = 0xd0;
const SYSTEM = 0xf0; // and up: no channel message
const SYSEX = 0xf0;
const SYSEX_ESCAPE = 0xf7;
const META = 0xff;
const TEMPO = 0x51;
const TIME_SIGNATURE = 0x58;
const END_OF_TRACK = 0x2f;

// a file's tracks, its tempo map and its time signatures; refused where it's malformed or of a kind not read
export function decodeMidiFile(bytes: Uint8Array): MidiFile {
  const reader = new ByteReader(bytes);
  const header = readHeader(reader);
  const tracks: TrackRead[] = [];
  while (tracks.length < header.trackCount) {
    if (reader.atEnd) {
      throw refused(`cut short: it names ${header.trackCount} tracks and holds ${tracks.length}`, reader.offset);
    }
    const type = reader.text(4);
    const body = reader.within(reader.uint32());
    if (type === 'MTrk') {
      tracks.push(readTrack(body));
    }
  }
  return {
    format: header.format,
    ppq: header.ppq,
    tracks: tracks.map(({ notes, controllers }) => ({ notes, controllers })),
    tempos: inTimeOrder(tracks.flatMap((track) => track.tempos)),
    timeSignatures: inTimeOrder(tracks.flatMap((track) => track.timeSignatures)),
  };
}
function readHeader(reader: ByteReader): Header {
  const type = reader.text(4);
  if (type !== 'MThd') {
    throw refused(`not a MIDI file: it starts with ${type}, not MThd`, 0);
  }
  const length = reader.uint32();
  if (length < HEADER_LENGTH) {
    throw refused(`a header of ${length} bytes, not ${HEADER_LENGTH}`, 4);
  }
  const body = reader.within(length); // a longer header's bytes past the 6 known left unread, as the standard asks
  const format = body.uint16();
  const trackCount = body.uint16();
  const division = body.uint16();
  if (format !== 0 && format !== 1) {
    throw refused(`format ${format} isn't read: only formats 0 and 1`, 8);
  }
  if ((division & SMPTE) !== 0) {
    throw refused("ticks by SMPTE frames aren't read: only ticks to a quarter", 12);
  }
  if (division === 0) {
    throw refused('a file of 0 ticks to a quarter', 12);
  }
  if (format === 0 && trackCount !== 1) {
    throw refused(`format 0 holds one track, not ${trackCount}`, 10);
  }
  return { format, trackCount, ppq: division };
}
// a track chunk's events, read up to its end of track, or its chunk's end where it has none
function readTrack(reader: ByteReader): TrackRead {
  const read: TrackRead = { notes: [], controllers: [], tempos: [], timeSignatures: [] };
  const held = new HeldNotes();
  let tick = 0;
  let running: number | undefined; // the last channel message's status, which a data byte in its place repeats
  while (!reader.atEnd) {
    tick += reader.variableLength();
    const at = reader.offset;
    const first = reader.byte();
    if (first < STATUS) {
      if (running === undefined) {
        throw refused(`a data byte, ${hex(first)}, where a status byte is due`, at);
      }
      readChannelMessage(reader, { status: running, first, tick }, read, held);
      continue;
    }
    if (first < SYSTEM) {
      running = first;
      readChannelMessage(reader, { status: first, first: dataByte(reader), tick }, read, held);
      continue;
    }
    running = undefined; // sysex and meta events end a running status
    if (first === SYSEX || first === SYSEX_ESCAPE) {
      reader.within(reader.variableLength());
      continue;
    }
    if (first !== META) {
      throw refused(`status ${hex(first)} has no place in a MIDI file`, at);
    }
    if (readMeta(reader, tick, read, at) === END_OF_TRACK) {
      break;
    }
  }
  held.letGoAll(tick);
  return read;
}
function dataByte(reader: ByteReader): number {
  const at = reader.offset;
  const byte = reader.byte();
  if (byte >= STATUS) {
    throw refused(`a status byte, ${hex(byte)}, where a data byte is due`, at);
  }
  return byte;
}
function hex(byte: number): string {
  return `0x${byte.toString(16).padStart(2, '0')}`;
}
// a channel message from its status and its first data byte: a note's on or off, a controller; any other read past
function readChannelMessage(
  reader: ByteReader,
  { status, first, tick }: { status: number; first: number; tick: number },
  read: TrackRead,
  held: HeldNotes,
): void {
  const kind = status & 0xf0;
  const channel = status & 0x0f;
  if (kind === PROGRAM_CHANGE || kind === CHANNEL_PRESSURE) {
    return; // one data byte, read
  }
  const second = dataByte(reader);
  if (kind === NOTE_ON && second > 0) {
    const note = { tick, duration: 0, pitch: first, velocity: second, channel };
    read.notes.push(note);
    held.hold(note);
  } else if (kind === NOTE_ON || kind === NOTE_OFF) {
    held.letGo(channel, first, tick);
  } else if (kind === CONTROLLER) {
    read.controllers.push({ tick, controller: first, value: second, channel });
  }
}
// a meta event: a tempo and a time signature kept, their lengths checked, any other read past; its type
function readMeta(reader: ByteReader, tick: number, read: TrackRead, at: number): number {
  const type = reader.byte();
  const body = reader.within(reader.variableLength());
  if (type === TEMPO) {
    const length = body.length;
    if (length !== 3) {
      throw refused(`a tempo event of ${length} bytes, not 3`, at);
    }
    read.tempos.push({ tick, microsecondsPerQuarter: body.byte() * 0x10000 + body.uint16() });
  } else if (type === TIME_SIGNATURE) {
    const length = body.length;
    if (length !== 4) {
      throw refused(`a time signature of ${length} bytes, not 4`, at);
    }
    read.timeSignatures.push({ tick, numerator: body.byte(), denominator: 2 ** body.byte() });
  }
  return type;
}
// stable: those at one tick in the order of their tracks
function inTimeOrder<Change extends { tick: number }>(changes: Change[]): Change[] {
  return changes.toSorted((one, other) => one.tick - other.tick);
}

// the notes still held, by channel and pitch, earliest first: a note off lets go the earliest, its length set
class HeldNotes {
  readonly #byKey = new Map<number, MidiNote[]>();

  hold(note: MidiNote): void {
    const key = keyOf(note.channel, note.pitch);
    const notes = this.#byKey.get(key) ?? [];
    notes.push(note);
    this.#byKey.set(key, notes);
  }
  // a note off with none held is let be
  letGo(channel: number, pitch: number, tick: number): void {
    const note = this.#byKey.get(keyOf(channel, pitch))?.shift();
    if (note !== undefined) {
      note.duration = tick - note.tick;
    }
  }
  // every note never let go, ended at its track's end
  letGoAll(tick: number): void {
    for (const notes of this.#byKey.values()) {
      for (const note of notes) {
        note.duration = tick - note.tick;
      }
    }
    this.#byKey.clear();
  }
}
function keyOf(channel: number, pitch: number): number {
  return channel * 128 + pitch;
}
