// ---------- clip-player/player: tracks of clip slots, a clip launched on its track ----------
// As Ableton's session view: tracks of clip slots, each slot holding a clip, a pattern of notes.
// Launched from its slot, a clip plays on its track, one a track, looping on the grid.
// Its notes:
//   - pitches, or steps of the scale, pitched in the key as the clip is launched;
//   - sent into the input as they come due, so they reach their instrument and the stream as
//     a played note does;
//   - each with its note on and its note off together, a fresh index each, the player one
//     source (note rotation).
// The looping, and when each note comes due, are the sequencer's clip launcher's.
import type { Seconds } from '../clock/index.ts';
import { ClipLauncher, type ClipGrid } from '../sequencer/index.ts';
import type { Address, Input, NotePattern, PatternNote } from '../midi-sequencer/index.ts';
import { NoteRotation, noteMessages } from '../midi/index.ts';
import { degreeNote, type Key } from '../music-theory/index.ts';

// A clip: where its notes go, its pattern, and how it plays.
// transpose: semitones, once its notes are pitched.
// straight: under the grid's swing, or on it.
// velocity: read as each note comes due, as a velocity device sets it; full if it has none,
// none leaving the note out.
export interface Clip<Track extends string> {
  to: Address<Track>;
  pattern: NotePattern;
  transpose?: number | undefined;
  straight?: boolean | undefined;
  velocity?: (() => number) | undefined;
}

// The clip slots, and the clips playing, one a track.
// Each 16th (step()): every playing clip's notes due there sent on, in the order the clips
// were launched.
// Each launch is a region of its own, its notes carrying its number.
// Slot: what its owner knows a slot by.
export class ClipPlayer<Track extends string, Slot = unknown> {
  readonly #input: Input<Track>;
  readonly #grid: ClipGrid;
  readonly #key: () => Key;
  readonly #rotation = new NoteRotation();
  readonly #launcher: ClipLauncher<Track, PatternNote>;
  readonly #slots = new Map<Slot, Clip<Track>>(); // in the order put
  readonly #playing = new Map<Track, Clip<Track>>(); // as launched: pitched, its region

  // key: the key a clip's steps are pitched in, read as it's launched
  constructor({ input, grid, key }: { input: Input<Track>; grid: ClipGrid; key: () => Key }) {
    this.#input = input;
    this.#grid = grid;
    this.#key = key;
    this.#launcher = new ClipLauncher<Track, PatternNote>({
      grid,
      play: (track, note, at) => this.#send(track, note, at),
    });
  }
  // a clip into its slot, in place of the one it held; on the track its notes go to
  put(slot: Slot, clip: Clip<Track>): void {
    this.#slots.set(slot, clip);
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
    const track = clip.to.track;
    const pattern = pitched(clip.pattern, this.#key(), clip.transpose ?? 0);
    const region = this.#launcher.launch({ track, pattern, straight: clip.straight });
    this.#playing.set(track, { ...clip, pattern, to: { ...clip.to, play: { ...clip.to.play, region } } });
  }
  stop(track: Track): void {
    this.#launcher.stop(track);
    this.#playing.delete(track);
  }
  step(i: number, t: Seconds): void {
    this.#launcher.step(i, t);
  }
  // a note due, at its time and velocity, its note on and its note off together; left out
  // where its velocity is none
  #send(track: Track, note: PatternNote, at: Seconds): void {
    const clip = this.#playing.get(track)!; // a note comes only of a clip launched
    const velocity = clip.velocity?.() ?? 1;
    if (velocity <= 0) {
      return;
    }
    const index = this.#rotation.noteOn();
    this.#rotation.noteOff(index);
    const duration = this.#grid.secondsOf(note.duration!); // its length on the straight grid
    this.#input.send(clip.to, noteMessages({ pitch: note.pitch!, velocity, t: at, duration }, index)); // pitched as launched
  }
}

// a pattern's notes as pitches in a key, transposed
function pitched(pattern: NotePattern, key: Key, transpose: number): NotePattern {
  return { ...pattern, events: pattern.events.map((note) => ({ ...note, pitch: pitchOf(note, key) + transpose })) };
}
// a note's pitch: its step of the scale in the key, where it has one; else its own
function pitchOf(note: PatternNote, key: Key): number {
  if (note.step !== undefined) {
    return degreeNote(note.step, key);
  }
  return note.pitch!; // a clip's note has a step or a pitch
}
