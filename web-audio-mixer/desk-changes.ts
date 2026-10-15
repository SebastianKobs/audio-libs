// ---------- libs/web-audio-mixer/desk-changes: changes to a desk's params, by their keys ----------
// Each change is checked as it comes: a key the desk's strip can't have is thrown.
//   - a strip's own: its volume and pan, its mute and solo; the master's volume, mute and solo;
//   - a send: to a return on the desk, from any strip but the master;
//   - a slot's param: on a device among the device params (libs/web-audio-fx/'s DeviceParams).
// Then set by the key's shape:
//   1. a strip's own volume or pan, and a send by its return: on the live mix;
//   2. a mute or a solo: the live mix's switches, on above 0;
//   3. a slot's param: on its device, among the device params.
// When, each held (libs/desk-plan/'s HeldChanges), its state changing then:
//   - one that can glide: until its lead ahead of its time, then set on the audio at its time
//     (target.ts's timingOf()), as a clock hands its 16ths out ahead;
//   - a switch, and a param that plans its device again: until its time.
import type { DeviceParams, Timing } from '../web-audio-fx/index.ts';
import {
  HeldChanges,
  SEND,
  STRIP_PARAMS,
  controllerOf,
  deviceAt,
  returnsIn,
  type Change,
  type DeskEntry,
  type ParamKey,
  type Ticking,
} from '../desk-plan/index.ts';
import { MASTER } from '../mixer/index.ts';
import { timingOf } from './target.ts';

// The live mix, its owner's: a strip's own volume and pan and its sends, kept as its owner
// keeps them, and its switches.
export interface LiveMix {
  // a strip's volume or pan, or a send by its return's name, by a timing
  set(key: ParamKey, value: number, timing: Timing): void;
  setMute(strip: string, on: boolean): void;
  setSolo(strip: string, on: boolean): void;
}

// a strip's own params, as declared; the master has no pan
const OWN: ReadonlySet<string> = new Set(Object.keys(STRIP_PARAMS));

export class DeskChanges {
  readonly #mix: LiveMix;
  readonly #params: DeviceParams;
  readonly #returns: ReadonlySet<string>; // the desk's returns, a send is named by
  readonly #clock: Ticking;
  readonly #at: (t: number) => number;
  readonly #ahead: HeldChanges; // those that can glide, set their lead ahead
  readonly #due: HeldChanges; // switches and params with no port, set at their time

  // desk: its strips as data, which names its returns; clock: its time now and its ticks;
  // at(): a time on it on the audio's clock; lead: how far ahead one that can glide is set
  constructor({
    desk,
    mix,
    params,
    clock,
    at,
    lead,
  }: {
    desk: readonly DeskEntry[];
    mix: LiveMix;
    params: DeviceParams;
    clock: Ticking;
    at: (t: number) => number;
    lead: number;
  }) {
    this.#mix = mix;
    this.#params = params;
    this.#returns = new Set(returnsIn(desk));
    this.#clock = clock;
    this.#at = at;
    this.#ahead = new HeldChanges({ clock, lead, set: (change) => this.#set(change) });
    this.#due = new HeldChanges({ clock, set: (change) => this.#set(change) });
  }
  // A change, checked as it comes, held until it's set on time.
  change(change: Change): void {
    this.#check(change.key);
    if (this.#heldUntilDue(change.key)) {
      this.#due.change(change);
      return;
    }
    this.#ahead.change(change);
  }
  // a switch, and a param that plans its device again: neither can be set ahead of its time
  #heldUntilDue({ strip, slot, param }: ParamKey): boolean {
    if (slot === undefined) {
      return param === 'mute' || param === 'solo';
    }
    if (slot === SEND) {
      return false;
    }
    return this.#params.replans(deviceAt(strip, slot), param);
  }
  // throws for a key the desk's strip can't have
  #check(key: ParamKey): void {
    if (!this.#has(key)) {
      throw new Error(`no controller ${controllerOf(key)} on strip ${key.strip}`);
    }
  }
  #has({ strip, slot, param }: ParamKey): boolean {
    if (slot === undefined) {
      return OWN.has(param) && !(strip === MASTER && param === 'pan');
    }
    if (slot === SEND) {
      return strip !== MASTER && this.#returns.has(param);
    }
    return this.#params.has(deviceAt(strip, slot));
  }
  // a change set by its key's shape, by the timing it says
  #set(change: Change): void {
    const { key, value } = change;
    const timing = timingOf(change, { now: this.#clock.now(), at: this.#at });
    if (key.slot === undefined) {
      this.#setOwn(key, value, timing);
      return;
    }
    if (key.slot === SEND) {
      this.#mix.set(key, value, timing);
      return;
    }
    this.#params.set(deviceAt(key.strip, key.slot), key.param, value, timing);
  }
  #setOwn(key: ParamKey, value: number, timing: Timing): void {
    if (key.param === 'mute') {
      this.#mix.setMute(key.strip, value > 0);
      return;
    }
    if (key.param === 'solo') {
      this.#mix.setSolo(key.strip, value > 0);
      return;
    }
    this.#mix.set(key, value, timing);
  }
}
