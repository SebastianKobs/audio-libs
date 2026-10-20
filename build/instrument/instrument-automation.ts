// ---------- build/instrument/instrument-automation: the instrument's automation, fitted to its bank ----------
// The instrument's automation, fitted to its bank as the desk's is to the desk: a patch's value
// set at its time, as a motor turns a knob; a choice by its index, back to the choice.
// The instrument glides there itself (Instrument.edited()), so a controller's own glide is passed over.
// Each change is held on the clock's cues until its time, no lead:
//   - set at the tick that finds its time come, a tick late at most, as a switch on the desk is;
//   - one already due is set at once.
import { Cues, type Clock } from '../../clock/index.ts';
import type { Controller } from '../../midi/index.ts';
import { choiceAt, type ParamSpec } from '../../params/index.ts';
import type { LiveBank } from '../../plan/instrument/index.ts';
import { addressOf, type Address } from '../../util/index.ts';

// a patch's value to set: its patch's name, the value's address in it, when
interface PatchChange {
  readonly patch: string;
  readonly address: Address;
  readonly value: number | string;
  readonly t: number;
}

export class InstrumentAutomation {
  readonly #bank: Pick<LiveBank, 'edit'>;
  readonly #clock: Pick<Clock, 'now'>;
  readonly #specOf: (patch: string, address: Address) => ParamSpec | undefined;
  readonly #held: Cues<PatchChange>;

  // bank: the patches it sets; clock: its time now and its ticks;
  // specOf: a param's spec in a patch, none for one it hasn't
  constructor({
    bank,
    clock,
    specOf,
  }: {
    bank: Pick<LiveBank, 'edit'>;
    clock: Pick<Clock, 'now' | 'onTick'>;
    specOf: (patch: string, address: Address) => ParamSpec | undefined;
  }) {
    this.#bank = bank;
    this.#clock = clock;
    this.#specOf = specOf;
    this.#held = new Cues({
      timeOf: (change: PatchChange) => change.t,
      handOn: (change: PatchChange) => this.#set(change),
    });
    clock.onTick((now) => this.#held.tick(now));
  }
  // a patch's value, set on the bank at its time: its controller's name its address in the patch,
  // a param with choices set as its choice
  control(patch: string, { controller, value, t }: Controller): void {
    const address = addressOf(controller);
    const spec = this.#specOf(patch, address);
    const set = spec?.choices ? choiceAt(spec, value) : value; // a choice's index back to the choice
    this.#held.cue({ patch, address, value: set, t }, this.#clock.now());
  }
  #set({ patch, address, value }: PatchChange): void {
    this.#bank.edit({ type: 'preset edited', patch, of: 'values', address, value });
  }
}
