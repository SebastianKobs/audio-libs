// ---------- libs/spatial/places/place: a place with a lifetime, perceived from a listener as it moves ----------
// Generic, the spatial part's: what's perceived there (Perceived) is its user's, a sound's how it's heard. Where it is, and how
// long it's needed: let go once past its time (until, close(at)), a time of its user's, never if kept. Moves from a time on (moveTo()):
// perceived there as it's asked, queued until its time comes. update(t), on every tick: the moves whose time has come taken, then
// perceived again from where it is, the listener having moved, and what it's perceived as now told once that has changed enough to matter
import { shifted } from './position.ts';
import type { Position } from './position.ts';
import { DueQueue } from '../../base/util/index.ts';

// how a place is perceived from where the listener is now, and whether a change is worth telling
export interface Perceiving<Perceived> {
  perceive(position: Position): Perceived;
  changed(previous: Perceived, next: Perceived): boolean;
}
// a move from a time on: where to, and how it's perceived there
export interface Move<Perceived> {
  readonly at: number;
  position: Position;
  readonly perceived: Perceived;
}
// how long it's needed: until a time, or kept for good
export interface Lifetime {
  until?: number | undefined;
  keep?: boolean | undefined;
}

export class Place<Perceived> {
  readonly keep: boolean;
  readonly #next = new DueQueue<Move<Perceived>>((move) => move.at); // the places moves take it to, each from its time
  readonly #perceiving: Perceiving<Perceived>;
  #position: Position;
  #until: number;
  #perceived: Perceived; // what it's perceived as now

  constructor(
    perceiving: Perceiving<Perceived>,
    position: Position,
    { until = Infinity, keep = false }: Lifetime = {},
  ) {
    this.#perceiving = perceiving;
    this.#position = position;
    this.#until = until;
    this.keep = keep;
    this.#perceived = perceiving.perceive(position);
  }
  get position(): Position {
    return this.#position;
  }
  get until(): number {
    return this.#until;
  }
  get perceived(): Perceived {
    return this.#perceived;
  }
  close(at: number): void {
    this.#until = at;
  }
  // whether it's past its time, and not kept
  done(t: number): boolean {
    return t > this.#until && !this.keep;
  }
  // a move to a position from a time on; returns how it's perceived there
  moveTo(position: Position, at: number): Perceived {
    const perceived = this.#perceiving.perceive(position);
    this.#next.add({ at, position, perceived });
    return perceived;
  }
  // on a tick: to the place a move took it to, once its time has come, perceived as it was then; then perceived from where it is now.
  // Returns what it's perceived as now if that has changed enough to matter, else null
  update(t: number): Perceived | null {
    const arrived = this.#next.takeDue(t).at(-1); // the last of those due, where it is now
    if (arrived) {
      this.#position = arrived.position;
      this.#perceived = arrived.perceived;
    }
    const perceived = this.#perceiving.perceive(this.#position);
    if (!this.#perceiving.changed(this.#perceived, perceived)) {
      return null;
    }
    this.#perceived = perceived;
    return perceived;
  }
  // when its user moves its world under the listener: it, and its moves still to come, with it
  shift(offset: Position): void {
    this.#position = shifted(this.#position, offset);
    for (const move of this.#next.items) {
      move.position = shifted(move.position, offset);
    }
  }
}
