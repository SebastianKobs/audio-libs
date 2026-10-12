// ---------- sequencer/clips: clips the sequencer plays on its own, each looping on its track (G0.1a) ----------
// As Ableton's session view plays a launched clip: a pattern on a track, looping on the grid, its notes sent into the sequencer's input as
// they come due (due()), so they reach their instrument and the stream as a played note does; each with its note on and its note off
// together, its length known as it starts, a fresh index each, the player one source (note rotation)
import type { Meter, Seconds } from '../clock/index.ts';
import type { Address, Input } from './input.ts';
import { STEP, type Pattern, type PatternNote } from './pattern.ts';
import { due } from './playing.ts';
import { NoteRotation } from './rotation.ts';

// a clip as launched: where its notes go, its pattern, its notes in pitches; straight under the grid's swing, or on it; its notes'
// velocity as it plays, read as each comes due, as a velocity device sets it, full if it has none, none leaving the note out
export interface Clip<Track extends string> {
  to: Address<Track>;
  pattern: Pattern;
  straight?: boolean | undefined;
  velocity?: (() => number) | undefined;
}
// the grid a clip plays on, the clock's: its time signature, a 16th's length and swing, when a place on it sounds
export interface ClipGrid {
  meter(): Meter;
  stepDuration(): Seconds;
  swingAt(i: number): Seconds;
  timeAt(place: number): Seconds;
}

// the clips playing, one a track, as a session track plays one at a time: each 16th (step()), every clip's notes due there sent on, in
// the order the clips were launched, each launch a region of its own (G1a)
export class ClipPlayer<Track extends string> {
  readonly #input: Input<Track>;
  readonly #grid: ClipGrid;
  readonly #rotation = new NoteRotation();
  readonly #playing = new Map<Track, Clip<Track>>(); // by its track
  #launches = 0; // the regions handed out so far, a launch's each

  constructor({ input, grid }: { input: Input<Track>; grid: ClipGrid }) {
    this.#input = input;
    this.#grid = grid;
  }
  // a clip launched on its track, in place of what the track played: its notes carrying its launch's region, a fresh number, as one
  // region while it loops (G1a)
  launch(clip: Clip<Track>): void {
    this.#launches += 1;
    const region = { ...clip.to.play, region: this.#launches };
    this.#playing.set(clip.to.track, { ...clip, to: { ...clip.to, play: region } });
  }
  stop(track: Track): void {
    this.#playing.delete(track);
  }
  step(i: number, t: Seconds): void {
    for (const clip of this.#playing.values()) {
      for (const note of due(clip.pattern, i, this.#grid.meter())) {
        this.#send(clip, note, i, t);
      }
    }
  }
  // a note due, at its time and velocity, its note on and its note off together; left out where its velocity is none
  #send(clip: Clip<Track>, note: PatternNote, i: number, t: Seconds): void {
    const velocity = clip.velocity?.() ?? 1;
    if (velocity <= 0) {
      return;
    }
    const at = this.#timeOf(clip, note, i, t);
    const index = this.#rotation.noteOn();
    this.#rotation.noteOff(index);
    this.#input.send(clip.to, [
      { type: 'note on', index, pitch: note.pitch!, velocity, t: at }, // a clip's notes in pitches
      { type: 'note off', index, t: at + (note.duration! / STEP) * this.#grid.stepDuration() }, // its length on the straight grid
    ]);
  }
  // when a note due on the 16th i sounds: straight, the 16th's swing taken back, its offset on the straight grid; else on the swing, a
  // note off the 16th, a triplet say, where it falls in it
  #timeOf(clip: Clip<Track>, note: PatternNote, i: number, t: Seconds): Seconds {
    const grid = this.#grid;
    const offset = note.offset ?? 0;
    if (clip.straight) {
      return t - grid.swingAt(i) + (offset / STEP) * grid.stepDuration();
    }
    return offset ? grid.timeAt(i + offset / STEP) : t;
  }
}
