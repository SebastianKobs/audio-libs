// ---------- libs/spatial-audio/emitter: where a sound comes from, how long it's needed, and what it hears ----------
// An emitter is a place, heard from where you listen.
// It hands on what it hears there to its caller, as values:
//   - cutoff: its lowpass's cutoff, in Hz;
//   - level: its direct sound's level;
//   - side: how far it's panned, -1 left to 1 right, times the width;
//   - room: its room's level, what goes to a reverb.
// Each value is handed on now, from a note's time, or gliding there as you move.
// A follower is a value of the caller's set from what it hears, by its law (a delay send).
// It builds nothing and knows no clock: its times are the caller's.
import type { Heard } from './model.ts';
import type { Place, Placed, Position } from '../spatial/index.ts';
import type { When } from '../util/index.ts';

// a value set from what an emitter hears
export type Law = (heard: Heard) => number;
// what an emitter hears, each value by its name
export type HeardValue = 'cutoff' | 'level' | 'side' | 'room';
// what an emitter hears, handed on to its caller
export type Hears = (name: HeardValue, value: number, when: When) => void;
// a follower's value, handed on as it changes
export type Follower = (value: number, when: When) => void;
// What it's made with:
//   - hears: where what it hears is handed on;
//   - until: when it's no longer needed; kept (keep), never let go;
//   - onLetGo: what its caller asks done as it's let go.
export interface EmitterOptions {
  hears: Hears;
  until?: number | undefined;
  keep?: boolean | undefined;
  onLetGo?: (() => void) | undefined;
}

const GLIDE = 0.08; // s: the time constant an emitter follows the listener with

// An emitter: its place the space's to follow, let go once past its until.
// A kept one is never let go, its until only what's counted as sounding.
// moveTo() moves it to a note's place from the note's time on:
//   - heard from there from then on;
//   - panned from side, where it's going unless the caller says;
//   - following the listener in between, its side left where its note put it.
export class Emitter implements Placed<Heard> {
  readonly place: Place<Heard>; // where it is, how long it's needed and how it's heard there
  readonly #side: (position: Position) => number;
  readonly #hears: Hears;
  readonly #followers = new Map<Follower, Law>(); // each value it follows, by its law
  readonly #onLetGo: (() => void) | undefined;

  // its place, the space's; how far a position is panned, the listener's side times the width
  constructor(
    place: Place<Heard>,
    side: (position: Position) => number,
    { hears, onLetGo }: Pick<EmitterOptions, 'hears' | 'onLetGo'>,
  ) {
    this.place = place;
    this.#side = side;
    this.#hears = hears;
    this.#onLetGo = onLetGo;
    this.#handOn(this.heard, {}, side(place.position));
  }
  get position(): Position {
    return this.place.position;
  }
  get until(): number {
    return this.place.until;
  }
  // how it's heard now
  get heard(): Heard {
    return this.place.perceived;
  }
  close(at: number): void {
    this.place.close(at);
  }
  // A value set from what it hears, by its law, from at, the caller's time (now, with none).
  // With no law, let go: handed on as 0, then left.
  follow(follower: Follower, law: Law | null, at?: number): void {
    if (law) {
      this.#followers.set(follower, law);
    } else {
      this.#followers.delete(follower);
    }
    let value = 0;
    if (law) {
      value = law(this.heard);
    }
    follower(value, { at });
  }
  moveTo(position: Position, at: number, side = position): void {
    this.#handOn(this.place.moveTo(position, at), { at }, this.#side(side));
  }
  // once it's done: what its caller asked
  letGo(): void {
    this.#onLetGo?.();
  }
  // Heard differently enough to hear, the listener having moved (its place's update(), on a tick):
  // gliding there; its notes' places set ahead as they were heard then.
  perceivedAs(heard: Heard): void {
    this.#handOn(heard, { glide: GLIDE });
  }
  // what it hears handed on, in one order: its cutoff, its level, its side where it's given, its room; then its followers
  #handOn(heard: Heard, when: When, side?: number): void {
    this.#hears('cutoff', heard.cutoff, when);
    this.#hears('level', heard.level, when);
    if (side !== undefined) {
      this.#hears('side', side, when);
    }
    this.#hears('room', heard.room, when);
    for (const [follower, law] of this.#followers) {
      follower(law(heard), when);
    }
  }
}
