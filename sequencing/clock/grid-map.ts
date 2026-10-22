// ---------- clock/grid-map: where a time lies on the grid as it was played, the tempo as it was then ----------
import type { Clock } from './clock.ts';
import type { BeatGrid } from './beat-grid.ts';
import { HISTORY } from './song-time.ts';
import { firstAfter } from '../../base/util/index.ts';

// what it reads of the grid: where a time lies on it and back, its bars and beats, a hold, song time
export type HeardGrid = Pick<
  BeatGrid,
  'straightAt' | 'straightTime' | 'stepsPerBar' | 'stepsPerBeat' | 'heldAt' | 'songTime' | 'timeOfSong'
>;

const KEEP = HISTORY + 60; // s: the history kept, and a minute more
const TRIM_EVERY = 1024; // 16ths: what's past let go this often, not on every one

// Where each 16th fell as the grid played it, heard as it's scheduled:
//   - a time long past lies where it was played after the tempo has changed,
//     the bars lined up; the grid itself knows only the tempo now;
//   - straight, so a swung note lies where it sounded;
//   - in song time, so a hold (a stop's, or live play's while a recording
//     played back), where no 16th fell, takes no room.
export class GridMap {
  readonly #grid: HeardGrid;
  readonly #steps: number[] = []; // each 16th's number, in the order played
  readonly #times: number[] = []; // and its straight time

  constructor({ clock }: { clock: Pick<Clock, 'onStep'> & { grid: HeardGrid } }) {
    this.#grid = clock.grid;
    clock.onStep((i) => this.#played(i, clock.grid.straightTime(i)));
  }
  // a time's place, in 16ths: between two 16ths heard as far as it lies between them in song time, a hold within where the grid stood,
  // those skipped as the ticks lagged counted (G5b); past the last one heard, or before the first, at the tempo now; from the time the grid
  // was held at, the place it's held at, the 16ths scheduled ahead of it not counted, so the present stands still (P2)
  placeOf(t: number): number {
    const heldAt = this.#grid.heldAt;
    if (heldAt !== null && t >= heldAt) {
      return this.#grid.straightAt(t);
    }
    const times = this.#times;
    const after = firstAfter(times, t, (time) => time);
    if (after <= 0 || after >= times.length) {
      return this.#grid.straightAt(t);
    }
    const steps = this.#steps;
    const before = after - 1;
    const song = (time: number): number => this.#grid.songTime(time);
    const from = song(times[before]!); // both within, as found
    const span = song(times[after]!) - from;
    const along = span > 0 ? (song(t) - from) / span : 1;
    return steps[before]! + along * (steps[after]! - steps[before]!);
  }
  // a place's time, the other way (G5b): between two 16ths heard as far as it lies between them in song time, where the grid stood a hold's
  // start; past the last one heard, or before the first, at the tempo now
  timeOf(place: number): number {
    const steps = this.#steps;
    const after = firstAfter(steps, place, (step) => step);
    if (after <= 0 || after >= steps.length) {
      return this.#grid.straightTime(place);
    }
    const times = this.#times;
    const before = after - 1;
    const along = (place - steps[before]!) / (steps[after]! - steps[before]!); // both within, as found
    const from = this.#grid.songTime(times[before]!);
    return this.#grid.timeOfSong(from + along * (this.#grid.songTime(times[after]!) - from));
  }
  // a bar's length in 16ths, by the time signature now
  stepsPerBar(): number {
    return this.#grid.stepsPerBar();
  }
  // a beat's, a quarter in 4/4 (P2)
  stepsPerBeat(): number {
    return this.#grid.stepsPerBeat();
  }
  #played(i: number, t: number): void {
    this.#steps.push(i);
    this.#times.push(t);
    if (this.#steps.length % TRIM_EVERY === 0) {
      const kept = this.#times.findIndex((time) => time >= t - KEEP);
      this.#steps.splice(0, kept);
      this.#times.splice(0, kept);
    }
  }
}
