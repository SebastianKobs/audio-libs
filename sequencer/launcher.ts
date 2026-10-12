// ---------- libs/sequencer/launcher: clips launched on tracks, each looping on the grid, its events handed on as they come due ----------
// As Ableton's session view launches a clip: a pattern on a track, one a track, looping on the beat grid; each 16th (step()), every
// clip's events due there handed on at the clock times they fall at, on the swing or straight under it, an event off its 16th where it
// falls in it. Knows nothing of what its events are: whoever launched them plays them (play()). Each launch a number of its own
import type { Meter, Seconds } from '../clock/index.ts';
import { STEP, type Pattern, type PatternEvent } from './pattern.ts';
import { due } from './playing.ts';

// a clip as launched: the track it plays on, its pattern, and whether it plays straight under the grid's swing or on it
export interface LaunchedClip<Track extends string, Event extends PatternEvent> {
  track: Track;
  pattern: Pattern<Event>;
  straight?: boolean | undefined;
}
// the grid a clip plays on, the clock's: its time signature, a 16th's length and swing, the clock time a place on it falls at
export interface ClipGrid {
  meter(): Meter;
  stepDuration(): Seconds;
  swingAt(i: number): Seconds;
  timeAt(place: number): Seconds;
}
// an event handed on: its track, the event, the clock time it falls at, and its clip's launch
export type PlayEvent<Track extends string, Event extends PatternEvent> = (
  track: Track,
  event: Event,
  at: Seconds,
  launch: number,
) => void;

// the clips playing, one a track, in the order they were launched, a clip launched again in a track's place keeping it
export class ClipLauncher<Track extends string, Event extends PatternEvent = PatternEvent> {
  readonly #grid: ClipGrid;
  readonly #play: PlayEvent<Track, Event>;
  readonly #playing = new Map<Track, { clip: LaunchedClip<Track, Event>; launch: number }>(); // by its track
  #launches = 0; // the launches so far

  constructor({ grid, play }: { grid: ClipGrid; play: PlayEvent<Track, Event> }) {
    this.#grid = grid;
    this.#play = play;
  }
  // a clip launched on its track, in place of what the track played; its launch's number, a fresh one
  launch(clip: LaunchedClip<Track, Event>): number {
    this.#launches += 1;
    this.#playing.set(clip.track, { clip, launch: this.#launches });
    return this.#launches;
  }
  stop(track: Track): void {
    this.#playing.delete(track);
  }
  // the 16th i, falling at a clock time: every clip's events due there handed on, each at its time
  step(i: number, t: Seconds): void {
    for (const { clip, launch } of this.#playing.values()) {
      for (const event of due(clip.pattern, i, this.#grid.meter())) {
        this.#play(clip.track, event, this.#timeOf(clip, event, i, t), launch);
      }
    }
  }
  // when an event due on the 16th i falls: straight, the 16th's swing taken back, its offset on the straight grid; else on the swing, an
  // event off the 16th, a triplet say, where it falls in it
  #timeOf(clip: LaunchedClip<Track, Event>, event: Event, i: number, t: Seconds): Seconds {
    const grid = this.#grid;
    const offset = event.offset ?? 0;
    if (clip.straight) {
      return t - grid.swingAt(i) + (offset / STEP) * grid.stepDuration();
    }
    return offset ? grid.timeAt(i + offset / STEP) : t;
  }
}
