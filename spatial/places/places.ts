// ---------- libs/spatial/places/places: the places a listener follows, each let go once past its time ----------
// Generic, the spatial part's. The live list (all), the same array for as long as it runs, of anything with a place (Placed): each
// told what its place is perceived as now, when that has changed enough (perceivedAs()), and let go once past its time (letGo()).
// place() makes a place perceived as its user asks (Perceiving); add() puts what has it on the list. update(t) on every tick; shift()
// moves every place with the world, when its user moves its world under the listener (a floating origin, a wrap)
import { Place } from './place.ts';
import type { Lifetime, Perceiving } from './place.ts';
import type { Position } from './position.ts';

// anything with a place: told what it's perceived as when that changes, and let go
export interface Placed<Perceived> {
  readonly place: Place<Perceived>;
  perceivedAs(perceived: Perceived): void;
  letGo(): void;
}

export class Places<Perceived, Thing extends Placed<Perceived> = Placed<Perceived>> {
  readonly all: Thing[] = []; // the live list, the same array for as long as it runs
  readonly #perceiving: Perceiving<Perceived>;

  constructor(perceiving: Perceiving<Perceived>) {
    this.#perceiving = perceiving;
  }
  // a place, perceived as its user asks, with its lifetime
  place(position: Position, lifetime: Lifetime = {}): Place<Perceived> {
    return new Place(this.#perceiving, position, lifetime);
  }
  add(placed: Thing): Thing {
    this.all.push(placed);
    return placed;
  }
  // on every tick: lets go of those past their time, but those kept; each of the others followed, told its change
  update(t: number): void {
    for (const [index, placed] of [...this.all.entries()].reverse()) {
      if (placed.place.done(t)) {
        placed.letGo();
        this.all.splice(index, 1);
        continue;
      }
      const perceived = placed.place.update(t);
      if (perceived !== null) {
        placed.perceivedAs(perceived);
      }
    }
  }
  shift(offset: Position): void {
    for (const placed of this.all) {
      placed.place.shift(offset);
    }
  }
}
