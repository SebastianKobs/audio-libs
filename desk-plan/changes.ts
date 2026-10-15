// ---------- libs/desk-plan/changes: changes to a desk's params, each held until its time ----------
// A change: a param's key, its value, and the time it lands at.
// Set at once once its time has come; one for later held on the clock's cues until a tick brings it.
// With a lead, each is set that far ahead of its time.
// The clock is the user's, as this interface has it: its time now, and its ticks.
import type { ParamKey } from './keys.ts';
import { Cues } from '../clock/index.ts';
import type { TimedValue } from '../automation/index.ts';

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
  readonly #cues: Cues<Change>; // the changes for later

  // set: where a change lands once its time has come; lead: how far ahead of it, in seconds
  constructor({ clock, lead = 0, set }: { clock: Ticking; lead?: number; set: (change: Change) => void }) {
    this.#clock = clock;
    this.#cues = new Cues({ timeOf: (change) => change.t, handOn: set, lead });
    clock.onTick((now) => this.#cues.tick(now));
  }
  change(change: Change): void {
    this.#cues.cue(change, this.#clock.now());
  }
}
