// ---------- libs/spatial-audio/space: where you listen, and the emitters it keeps, each heard from there ----------
import { Emitter } from './emitter.ts';
import type { EmitterOptions } from './emitter.ts';
import { hearMax, hearing, moved } from './model.ts';
import type { Heard, SpaceSettings } from './model.ts';
import { Places, type Position } from '../spatial/index.ts';

// where you listen, the caller's: how far a place is, and which side of you, -1 left to 1 right
export interface Listener {
  distance(position: Position): number;
  side(position: Position): number;
}

export class Space {
  readonly #settings: SpaceSettings & { width: number };
  readonly #listener: Listener;
  readonly #places: Places<Heard, Emitter>; // its emitters' places, each heard from where you listen

  constructor({ settings, listener }: { settings: SpaceSettings & { width: number }; listener: Listener }) {
    this.#settings = settings;
    this.#listener = listener;
    this.#places = new Places({ perceive: (position) => this.#heard(position), changed: moved });
  }
  // the live list, the same array for as long as it runs
  get emitters(): Emitter[] {
    return this.#places.all;
  }
  hearing(distance: number): Heard {
    return hearing(distance, this.#settings);
  }
  hearMax(): number {
    return hearMax(this.#settings);
  }
  // an emitter (emitter.ts), handing on what it hears from where it is, on the live list
  emitter(position: Position, { hears, until, keep, onLetGo }: EmitterOptions): Emitter {
    const place = this.#places.place(position, { until, keep });
    return this.#places.add(new Emitter(place, (at) => this.side(at), { hears, onLetGo }));
  }
  // How far a sound from a place is panned: the listener's side of it times the width.
  side(position: Position): number {
    return this.#listener.side(position) * this.#settings.width;
  }
  // On every tick:
  //   1. lets go of the emitters past their time, but those kept;
  //   2. each of the others follows its notes and the listener.
  update(t: number): void {
    this.#places.update(t);
  }
  // when the caller moves its world under the listener (a floating origin, or a wrap): every emitter with it
  shift(offset: Position): void {
    this.#places.shift(offset);
  }
  #heard(position: Position): Heard {
    return hearing(this.#listener.distance(position), this.#settings);
  }
}
