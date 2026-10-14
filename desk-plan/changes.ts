// ---------- libs/desk-plan/changes: changes to a desk's params, each held until its time ----------
// A change: a param's key, its value, and the time it lands at.
// Set at once once its time has come; one for later kept until the clock's tick brings it,
// those kept set in their time's order.
// The clock is the user's, as this interface has it: its time now, and its ticks.
import type { ParamKey } from './keys.ts';

// a change to a param: its key, its value, and when it lands
export interface Change {
  key: ParamKey;
  value: number;
  t: number;
}
// a clock, as the changes ask it: its time now, and a listener told of each tick and its time
export interface Ticking {
  now(): number;
  onTick(listener: (now: number) => void): unknown;
}

export class HeldChanges {
  readonly #clock: Ticking;
  readonly #set: (change: Change) => void;
  #later: Change[] = []; // the changes for later, in their time's order

  // set: where a change lands once its time has come
  constructor({ clock, set }: { clock: Ticking; set: (change: Change) => void }) {
    this.#clock = clock;
    this.#set = set;
    clock.onTick((now) => this.#due(now));
  }
  change(change: Change): void {
    if (change.t <= this.#clock.now()) {
      this.#set(change);
      return;
    }
    this.#later.push(change);
    this.#later.sort((first, second) => first.t - second.t);
  }
  // each tick: those kept whose time has come, set in their order
  #due(now: number): void {
    while (this.#later.length && this.#later[0]!.t <= now) {
      this.#set(this.#later.shift()!); // one at least, as found
    }
  }
}
