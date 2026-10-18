// ---------- clip-player/player: tracks of clip slots, a clip launched on its track ----------
// As Ableton's session view: tracks of clip slots, each slot holding a clip, a pattern of notes.
// Launched from its slot, a clip plays on its track, one a track:
//   - looping on the grid;
//   - or once, from the next beat, its first note to its last, on its track or on one its
//     owner lends it for that long, as it starts.
// Its notes:
//   - pitches, or steps of the scale, pitched in the key as the clip is launched;
//   - each with its part, its own per-note values and a held note's glides, as MIDI 2.0 has them;
//   - sent into the input as they come due, so they reach their instrument and the stream as
//     a played note does;
//   - each with its note on and its note off together, a fresh index each, the player one
//     source (note rotation).
// The looping, and when each note comes due, are the sequencer's clip launcher's.
import type { Seconds, Ticks } from '../clock/index.ts';
import { ClipLauncher, type ClipGrid, type Pattern, type Span } from '../sequencer/index.ts';
import type { Address, Input, PatternNote } from '../midi-sequencer/index.ts';
import { NoteRotation, noteMessages, type PerNoteValues } from '../midi/index.ts';
import { degreeNote, type Key } from '../music-theory/index.ts';

// A clip's note, as a pattern's, and what it plays with:
//   - part: which part of its element sounds it, as the way back lights it;
//   - values: its per-note controllers as it starts;
//   - glides: a held note's, each [ticks after its start, the pitch it glides to].
export interface ClipNote extends PatternNote {
  part?: number | undefined;
  values?: PerNoteValues | undefined;
  glides?: readonly (readonly [after: Ticks, pitch: number])[] | undefined;
}
// A clip: where its notes go, its pattern, and how it plays.
// transpose: semitones, once its notes are pitched.
// straight: under the grid's swing, or on it.
// velocity: read as each note comes due, as a velocity device sets it; full if it has none,
// none leaving the note out.
// once: played once.
// lend(): a track lent to a clip played once, as it starts, from its first note's time to its
// last's end, handed its own address, its track the one it borrows from; else its own track.
export type Clip<Track extends string> = {
  to: Address<Track>;
  pattern: Pattern<ClipNote>;
  transpose?: number | undefined;
  straight?: boolean | undefined;
  velocity?: (() => number) | undefined;
} & (
  { once?: false | undefined; lend?: undefined } | { once: true; lend?(to: Address<Track>, span: Span): Address<Track> }
);
// A clip as it plays: its slot, and where its notes go, once a lent track is known.
interface Playing<Track extends string, Slot> {
  clip: Clip<Track>;
  slot: Slot;
  to?: Address<Track>;
}

// The clip slots, and the clips playing, one a track.
// Each 16th (step()): every playing clip's notes due there sent on, in the order the clips
// were launched.
// Each launch is a region of its own, its notes carrying its number.
// Slot: what its owner knows a slot by.
// A lent clip plays one a slot: launched again, it starts again on a track lent again.
export class ClipPlayer<Track extends string, Slot = unknown> {
  readonly #input: Input<Track>;
  readonly #grid: ClipGrid;
  readonly #key: () => Key;
  readonly #rotation = new NoteRotation();
  readonly #launcher: ClipLauncher<Track | Slot, ClipNote>;
  readonly #slots = new Map<Slot, Clip<Track>>(); // in the order put
  readonly #playing = new Map<Track | Slot, Playing<Track, Slot>>(); // by its track, or its slot where lent
  readonly #sounding = new Map<Slot, Seconds>(); // a clip played once: when its last note ends, from its start
  #now: Seconds = -Infinity; // the last 16th's time

  // key: the key a clip's steps are pitched in, read as it's launched
  constructor({ input, grid, key }: { input: Input<Track>; grid: ClipGrid; key: () => Key }) {
    this.#input = input;
    this.#grid = grid;
    this.#key = key;
    this.#launcher = new ClipLauncher<Track | Slot, ClipNote>({
      grid,
      play: (track, note, at) => this.#send(track, note, at),
      started: (track, launch, span) => this.#started(track, launch, span),
      ended: (track) => this.#playing.delete(track),
    });
  }
  // a clip into its slot, in place of the one it held; on the track its notes go to, or borrow from
  put(slot: Slot, clip: Clip<Track>): void {
    this.#slots.set(slot, clip);
  }
  // a slot emptied: its clip gone, stopped where it plays
  remove(slot: Slot): void {
    this.#slots.delete(slot);
    this.#sounding.delete(slot);
    for (const [track, playing] of this.#playing) {
      if (playing.slot === slot) {
        this.#launcher.stop(track);
        this.#playing.delete(track);
      }
    }
  }
  // a track's slots, in the order they were first put
  slotsOn(track: Track): Slot[] {
    return [...this.#slots].filter(([, clip]) => clip.to.track === track).map(([slot]) => slot);
  }
  clipIn(slot: Slot): Clip<Track> | undefined {
    return this.#slots.get(slot);
  }
  // A slot's clip launched on its track, in place of what the track played.
  // Pitched in the key now; its notes carrying a fresh region, one while it loops.
  // An empty slot launches nothing.
  launch(slot: Slot): void {
    const clip = this.#slots.get(slot);
    if (!clip) {
      return;
    }
    const track = clip.lend ? slot : clip.to.track;
    const pattern = pitched(clip.pattern, this.#key(), clip.transpose ?? 0);
    const region = this.#launcher.launch({ track, pattern, straight: clip.straight, once: clip.once });
    const playing: Playing<Track, Slot> = { clip, slot };
    if (!clip.lend) {
      playing.to = inRegion(clip.to, region);
    }
    this.#playing.set(track, playing);
  }
  stop(track: Track): void {
    const playing = this.#playing.get(track);
    if (playing) {
      this.#sounding.delete(playing.slot);
    }
    this.#launcher.stop(track);
    this.#playing.delete(track);
  }
  // Whether a slot's clip plays, as of the last 16th:
  //   - one played once: from its start until its last note ends, or as long as its track
  //     is lent, its ring-out among it;
  //   - a looping one: from its launch until it's stopped.
  playing(slot: Slot): boolean {
    if ((this.#sounding.get(slot) ?? -Infinity) > this.#now) {
      return true;
    }
    return [...this.#playing.values()].some((playing) => playing.slot === slot && !playing.clip.once);
  }
  step(i: number, t: Seconds): void {
    this.#now = t;
    this.#launcher.step(i, t);
  }
  // A clip played once as it starts:
  //   - a lent one on the track its owner lends it for its span, its notes carrying its region;
  //   - sounding until its span's end, or as long as its track is lent, its ring-out among it.
  #started(track: Track | Slot, region: number, span: Span): void {
    const playing = this.#playing.get(track)!; // told only of a clip launched
    if (playing.clip.lend) {
      playing.to = inRegion(playing.clip.lend(playing.clip.to, span), region);
    }
    this.#sounding.set(playing.slot, Math.max(span.until, playing.to?.play?.until ?? -Infinity));
  }
  // a note due, at its time and velocity, its note on and its note off together; left out
  // where its velocity is none
  #send(track: Track | Slot, note: ClipNote, at: Seconds): void {
    const playing = this.#playing.get(track)!; // a note comes only of a clip launched
    const velocity = playing.clip.velocity?.() ?? 1;
    if (velocity <= 0) {
      return;
    }
    const index = this.#rotation.noteOn();
    this.#rotation.noteOff(index);
    const grid = this.#grid;
    const duration = grid.secondsOf(note.duration!); // its length on the straight grid
    const glides = note.glides?.map(([after, pitch]) => [at + grid.secondsOf(after), pitch] as const);
    const sent = { pitch: note.pitch!, velocity, t: at, duration, part: note.part, controllers: note.values, glides }; // pitched as launched
    this.#input.send(playing.to!, noteMessages(sent, index)); // a lent track's lent as it started
  }
}

// an address, its notes carrying a launch's region
function inRegion<Track extends string>(to: Address<Track>, region: number): Address<Track> {
  return { ...to, play: { ...to.play, region } };
}
// a pattern's notes as pitches in a key, transposed; a held note's glides transposed with it
function pitched(pattern: Pattern<ClipNote>, key: Key, transpose: number): Pattern<ClipNote> {
  const events = pattern.events.map((note) => ({
    ...note,
    pitch: pitchOf(note, key) + transpose,
    ...(note.glides ? { glides: note.glides.map(([after, pitch]) => [after, pitch + transpose] as const) } : {}),
  }));
  return { ...pattern, events };
}
// a note's pitch: its step of the scale in the key, where it has one; else its own
function pitchOf(note: ClipNote, key: Key): number {
  if (note.step !== undefined) {
    return degreeNote(note.step, key);
  }
  return note.pitch!; // a clip's note has a step or a pitch
}
