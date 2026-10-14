// ---------- libs/web-audio-mixer/desk-changes: changes to a desk's params, by their keys ----------
// Each change is checked as it comes: a key the desk's strip can't have is thrown.
//   - a strip's own: its volume and pan, its mute and solo; the master's volume, mute and solo;
//   - a send: to a return on the desk, from any strip but the master;
//   - a slot's param: on a device among the device params (libs/web-audio-fx/'s DeviceParams).
// Then held until its time (libs/desk-plan/'s HeldChanges), and set by the key's shape:
//   1. a strip's own volume or pan, and a send by its return: on the live mix;
//   2. a mute or a solo: the live mix's switches, on above 0;
//   3. a slot's param: on its device, among the device params.
import type { DeviceParams } from '../web-audio-fx/index.ts';
import {
  HeldChanges,
  SEND,
  controllerOf,
  deviceAt,
  type Change,
  type DeskEntry,
  type ParamKey,
  type Ticking,
} from '../desk-plan/index.ts';
import { MASTER } from '../mixer/index.ts';

// The live mix, its owner's: a strip's own volume and pan and its sends, kept as its owner
// keeps them, and its switches.
export interface LiveMix {
  // a strip's volume or pan, or a send by its return's name
  set(strip: string, control: string, value: number): void;
  setMute(strip: string, on: boolean): void;
  setSolo(strip: string, on: boolean): void;
}

// a strip's own params; the master's, which has no pan
const OWN: ReadonlySet<string> = new Set(['volume', 'pan', 'mute', 'solo']);
const MASTER_OWN: ReadonlySet<string> = new Set(['volume', 'mute', 'solo']);

export class DeskChanges {
  readonly #mix: LiveMix;
  readonly #params: DeviceParams;
  readonly #returns: ReadonlySet<string>; // the desk's returns, a send is named by
  readonly #held: HeldChanges;

  // desk: its strips as data, which names its returns; clock: its time now and its ticks
  constructor({
    desk,
    mix,
    params,
    clock,
  }: {
    desk: readonly DeskEntry[];
    mix: LiveMix;
    params: DeviceParams;
    clock: Ticking;
  }) {
    this.#mix = mix;
    this.#params = params;
    this.#returns = new Set(desk.flatMap((entry) => (entry.fx ? [entry.fx] : [])));
    this.#held = new HeldChanges({ clock, set: (change) => this.#set(change) });
  }
  // A change, checked as it comes, set at its time.
  change(change: Change): void {
    this.#check(change.key);
    this.#held.change(change);
  }
  // throws for a key the desk's strip can't have
  #check(key: ParamKey): void {
    if (!this.#has(key)) {
      throw new Error(`no controller ${controllerOf(key)} on strip ${key.strip}`);
    }
  }
  #has({ strip, slot, param }: ParamKey): boolean {
    if (slot === undefined) {
      return (strip === MASTER ? MASTER_OWN : OWN).has(param);
    }
    if (slot === SEND) {
      return strip !== MASTER && this.#returns.has(param);
    }
    return this.#params.has(deviceAt(strip, slot));
  }
  // a change set by its key's shape
  #set({ key: { strip, slot, param }, value }: Change): void {
    if (slot === undefined) {
      this.#setOwn(strip, param, value);
      return;
    }
    if (slot === SEND) {
      this.#mix.set(strip, param, value);
      return;
    }
    this.#params.set(deviceAt(strip, slot), param, value);
  }
  #setOwn(strip: string, param: string, value: number): void {
    if (param === 'mute') {
      this.#mix.setMute(strip, value > 0);
      return;
    }
    if (param === 'solo') {
      this.#mix.setSolo(strip, value > 0);
      return;
    }
    this.#mix.set(strip, param, value);
  }
}
