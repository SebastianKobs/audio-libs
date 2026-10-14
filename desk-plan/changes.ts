// ---------- libs/desk-plan/changes: changes to a desk's params, each held until its time ----------
// A change: a param's key, its value, and the time it lands at.
// Set at once once its time has come; one for later kept until the clock's tick brings it,
// those kept set in their time's order.
// With a lead, each is set that far ahead of its time, as a clock hands its 16ths out ahead.
// The clock is the user's, as this interface has it: its time now, and its ticks.
import type { ParamKey } from './keys.ts';
import { DueQueue } from '../util/index.ts';
import type { TimedValue } from '../util/index.ts';

// a change to a param: its key, its value, when it lands, and the time constant it glides there by, where it has one
export interface Change extends TimedValue {
  key: ParamKey;
}
// a clock, as the changes ask it: its time now, and a listener told of each tick and its time
export interface Ticking {
  now(): number;
  onTick(listener: (now: number) => void): unknown;
}

export class HeldChanges {
  readonly #clock: Ticking;
  readonly #lead: number;
  readonly #set: (change: Change) => void;
  readonly #later = new DueQueue<Change>((change) => change.t); // the changes for later, in their time's order

  // set: where a change lands once its time has come; lead: how far ahead of it, in seconds
  constructor({ clock, lead = 0, set }: { clock: Ticking; lead?: number; set: (change: Change) => void }) {
    this.#clock = clock;
    this.#lead = lead;
    this.#set = set;
    clock.onTick((now) => this.#due(now));
  }
  change(change: Change): void {
    if (change.t <= this.#clock.now() + this.#lead) {
      this.#set(change);
      return;
    }
    this.#later.add(change);
  }
  // each tick: those kept whose time has come, set in their order
  #due(now: number): void {
    for (const change of this.#later.takeDue(now + this.#lead)) {
      this.#set(change);
    }
  }
}
