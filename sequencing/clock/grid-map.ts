// ---------- clock/grid-map: where a song time lies on the grid as it was played, the tempo as it was then ----------
import type { Clock } from './clock.ts';
import type { BeatGrid } from './beat-grid.ts';
import { HISTORY } from './song-time.ts';
import { firstAfter } from '../../base/util/index.ts';

// what it reads of the grid: where a time lies on it and back, its bars and beats, a hold, song time
export type HeardGrid = Pick<
  BeatGrid,
  'straightAt' | 'straightTime' | 'stepsPerBar' | 'stepsPerBeat' | 'heldAt' | 'songTime' | 'timeOfSong'
>;

const KEEP = HISTORY + 60; // s of song time: the history kept, and a minute more
const TRIM_EVERY = 1024; // 16ths: what's past let go this often, not on every one

// Where each 16th fell as the grid played it, heard as it's scheduled:
//   - a time long past lies where it was played after the tempo has changed,
//     the bars lined up; the grid itself knows only the tempo now;
//   - straight, so a swung note lies where it sounded;
//   - in song time, the times it's asked and answers, so a hold (a stop's, or
//     live play's while a recording played back), where no 16th fell, takes no room.
export class GridMap {
  readonly #grid: HeardGrid;
  readonly #steps: number[] = []; // each 16th's number, in the order played
  readonly #songs: number[] = []; // and its straight time's song time

  constructor({ clock }: { clock: Pick<Clock, 'onStep'> & { grid: HeardGrid } }) {
    this.#grid = clock.grid;
    clock.onStep((i) => this.#played(i, clock.grid.straightTime(i)));
  }
  // a song time's place, in 16ths: between two 16ths heard as far as it lies between them, a hold taking no room, those skipped as the ticks
  // lagged counted; past the last one heard, or before the first, at the tempo now; from the song time the grid was held at, the place it's
  // held at, the 16ths scheduled ahead of it not counted, so the present stands still
  placeOf(song: number): number {
    const heldAt = this.#grid.heldAt;
    if (heldAt !== null && song >= this.#grid.songTime(heldAt)) {
      return this.#grid.straightAt(heldAt);
    }
    const songs = this.#songs;
    const after = firstAfter(songs, song, (heard) => heard);
    if (after <= 0 || after >= songs.length) {
      return this.#grid.straightAt(this.#grid.timeOfSong(song));
    }
    const steps = this.#steps;
    const before = after - 1;
    const from = songs[before]!; // both within, as found
    const span = songs[after]! - from;
    const along = span > 0 ? (song - from) / span : 1;
    return steps[before]! + along * (steps[after]! - steps[before]!);
  }
  // a place's song time, the other way: between two 16ths heard as far as it lies between them; past the last one heard, or before the
  // first, at the tempo now
  timeOf(place: number): number {
    const steps = this.#steps;
    const after = firstAfter(steps, place, (step) => step);
    if (after <= 0 || after >= steps.length) {
      return this.#grid.songTime(this.#grid.straightTime(place));
    }
    const songs = this.#songs;
    const before = after - 1;
    const along = (place - steps[before]!) / (steps[after]! - steps[before]!); // both within, as found
    return songs[before]! + along * (songs[after]! - songs[before]!);
  }
  // a bar's length in 16ths, by the time signature now
  stepsPerBar(): number {
    return this.#grid.stepsPerBar();
  }
  // a beat's, a quarter in 4/4
  stepsPerBeat(): number {
    return this.#grid.stepsPerBeat();
  }
  #played(i: number, t: number): void {
    this.#steps.push(i);
    const song = this.#grid.songTime(t);
    this.#songs.push(song);
    if (this.#steps.length % TRIM_EVERY === 0) {
      const kept = this.#songs.findIndex((heard) => heard >= song - KEEP);
      this.#steps.splice(0, kept);
      this.#songs.splice(0, kept);
    }
  }
}
