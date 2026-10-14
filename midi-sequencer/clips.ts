// ---------- midi-sequencer/clips: clips the sequencer plays on its own, each looping on its track (G0.1a) ----------
// As Ableton's session view plays a launched clip: a pattern of notes on a track, looping on the grid, its notes sent into the sequencer's
// input as they come due, so they reach their instrument and the stream as a played note does; each with its note on and its note off
// together, its length known as it starts, a fresh index each, the player one source (note rotation). The looping and when each note
// comes due the clip launcher's (launcher.ts): here only the notes as MIDI's messages
import type { Seconds } from '../clock/index.ts';
import type { Address, Input } from './input.ts';
import { ClipLauncher, type ClipGrid } from '../sequencer/index.ts';
import type { NotePattern, PatternNote } from './pattern-note.ts';
import { NoteRotation } from '../midi/index.ts';

// a clip as launched: where its notes go, its pattern, its notes in pitches; straight under the grid's swing, or on it; its notes'
// velocity as it plays, read as each comes due, as a velocity device sets it, full if it has none, none leaving the note out
export interface Clip<Track extends string> {
  to: Address<Track>;
  pattern: NotePattern;
  straight?: boolean | undefined;
  velocity?: (() => number) | undefined;
}

// the clips playing, one a track: each 16th (step()), every clip's notes due there sent on, in the order the clips were launched, each
// launch a region of its own (G1a)
export class ClipPlayer<Track extends string> {
  readonly #input: Input<Track>;
  readonly #grid: ClipGrid;
  readonly #rotation = new NoteRotation();
  readonly #launcher: ClipLauncher<Track, PatternNote>;
  readonly #clips = new Map<Track, Clip<Track>>(); // each track's, its notes carrying its launch's region

  constructor({ input, grid }: { input: Input<Track>; grid: ClipGrid }) {
    this.#input = input;
    this.#grid = grid;
    this.#launcher = new ClipLauncher<Track, PatternNote>({
      grid,
      play: (track, note, at) => this.#send(track, note, at),
    });
  }
  // a clip launched on its track, in place of what the track played: its notes carrying its launch's region, a fresh number, as one
  // region while it loops (G1a)
  launch(clip: Clip<Track>): void {
    const track = clip.to.track;
    const region = this.#launcher.launch({ track, pattern: clip.pattern, straight: clip.straight });
    this.#clips.set(track, { ...clip, to: { ...clip.to, play: { ...clip.to.play, region } } });
  }
  stop(track: Track): void {
    this.#launcher.stop(track);
    this.#clips.delete(track);
  }
  step(i: number, t: Seconds): void {
    this.#launcher.step(i, t);
  }
  // a note due, at its time and velocity, its note on and its note off together; left out where its velocity is none
  #send(track: Track, note: PatternNote, at: Seconds): void {
    const clip = this.#clips.get(track)!; // a note comes only of a clip launched
    const velocity = clip.velocity?.() ?? 1;
    if (velocity <= 0) {
      return;
    }
    const index = this.#rotation.noteOn();
    this.#rotation.noteOff(index);
    this.#input.send(clip.to, [
      { type: 'note on', index, pitch: note.pitch!, velocity, t: at }, // a clip's notes in pitches
      { type: 'note off', index, t: at + this.#grid.secondsOf(note.duration!) }, // its length on the straight grid
    ]);
  }
}
