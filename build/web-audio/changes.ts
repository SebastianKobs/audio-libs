// ---------- build/web-audio/changes: changes held until their time ----------
// A change: what it sets (a param's address, or its user's own key), its value, when it lands.
// Set at once once its time has come.
// One for later is held on the clock's cues until a tick brings it.
// With a lead, each is set that far ahead of its time: where Web Audio can schedule it.
// The clock is the user's, as this interface has it: its time now, and its ticks.
import { Cues } from '../../clock/index.ts';
import type { TimedValue } from '../../automation/index.ts';
import type { Address } from '../../plan/format/index.ts';

// a change to a param by its address: its value, when it lands, its glide's time constant if any
export interface Change extends TimedValue {
  readonly address: Address;
}
// a clock, as the changes ask it: its time now, and a listener told of each tick
export interface Ticking {
  now(): number;
  onTick(listener: (now: number) => void): unknown;
}

export class HeldChanges<Held extends TimedValue = Change> {
  readonly #clock: Ticking;
  readonly #cues: Cues<Held>; // the changes for later

  // set: where a change lands once its time has come; lead: how far ahead of it, in seconds
  constructor({ clock, lead = 0, set }: { clock: Ticking; lead?: number; set: (change: Held) => void }) {
    this.#clock = clock;
    this.#cues = new Cues({ timeOf: (change) => change.t, handOn: set, lead });
    clock.onTick((now) => this.#cues.tick(now));
  }
  change(change: Held): void {
    this.#cues.cue(change, this.#clock.now());
  }
}
