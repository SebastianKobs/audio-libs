// ---------- build/web-audio/built: what the Web Audio builder hands back ----------
// The thing built, as its front panel (libs/build/ports/):
//   - a param set or automated by its address: a block's, on what's built of it; a macro's, onto
//     its targets; a choice by its index, as its block's param holds it; a placeholder's left alone;
//   - a preset's values set together; a new tempo told what follows it;
//   - its placeholders, by address; taken apart, its sources stopped, its nodes disconnected.
// Times are the context's.
import { eventOf, timedAt, type Automation, type When } from '../../automation/index.ts';
import { choiceIndex } from '../../params/index.ts';
import {
  addressOf,
  addressText,
  mapOnto,
  nodeAt,
  paramAt,
  settingAt,
  type Address,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Built } from '../ports/index.ts';
import { automate } from './automation.ts';
import type { BuiltParts } from './parts.ts';

export class WebAudioBuilt implements Built {
  readonly #plan: Plan;
  readonly #parts: BuiltParts;
  readonly #context: BaseAudioContext;

  constructor(plan: Plan, parts: BuiltParts, context: BaseAudioContext) {
    this.#plan = plan;
    this.#parts = parts;
    this.#context = context;
  }
  get placeholders(): readonly Address[] {
    return this.#parts.placeholders;
  }
  // a param set by its address: now, at a time, or gliding there from now
  set(address: Address, value: number | string, when: When = {}): void {
    this.#paramNamed(address);
    const at = timedAt(this.#numberOf(address, value), when, this.#context.currentTime);
    this.automate(address, [eventOf(at)], 0);
  }
  // a param automated by its address, its events' times from a time, now unless given
  automate(address: Address, automation: readonly Automation[], from = this.#context.currentTime): void {
    this.#paramNamed(address);
    const node = nodeAt(this.#plan, address.slice(0, -1))!; // a param's: its node is there
    const name = address.at(-1)!;
    const macro = node.inside?.macros.find((each) => each.spec.name === name);
    if (macro) {
      for (const target of macro.maps) {
        const mapped = automation.map((event) => mappedEvent(event, (value) => mapOnto(target, value)));
        this.automate([...address.slice(0, -1), ...target.to], mapped, from);
      }
      return;
    }
    const built = this.#parts.blocks.get(addressText(address.slice(0, -1)));
    const param = built?.param(name); // none on a placeholder, or a pan made a gain where the context can't pan
    if (param) {
      automate(param, automation, from);
    }
  }
  // A preset sent: its values by their addresses set together, at one time.
  // A setting it changes needs a rebuild; one it keeps is passed over.
  preset(values: ValuesByAddress, settings: ValuesByAddress = {}, when: When = {}): void {
    for (const [text, value] of Object.entries(settings)) {
      if (settingAt(this.#plan, addressOf(text))?.value !== value) {
        throw new Error(`${text}: a setting changed, rebuilt`);
      }
    }
    for (const [text, value] of Object.entries(values)) {
      this.set(addressOf(text), value, when);
    }
  }
  // a new beat told what follows it, its synced delays' times: gliding there unless told otherwise
  tempo(beat: number, when: When = {}): void {
    for (const follower of this.#parts.tempoFollowers) {
      follower(beat, when, this.#context.currentTime);
    }
  }
  dispose(): void {
    for (const source of this.#parts.sources) {
      source.stop();
    }
    for (const node of this.#parts.nodes) {
      node.disconnect();
    }
  }

  // a param's spec by its address; a setting's or nothing's refused
  #paramNamed(address: Address): void {
    if (paramAt(this.#plan, address)) {
      return;
    }
    if (settingAt(this.#plan, address)) {
      throw new Error(`${addressText(address)}: a setting, sent with a preset`);
    }
    throw new Error(`${addressText(address)}: no param`);
  }
  // a value as its param holds it: a number as it is, a choice by its index among its param's choices
  #numberOf(address: Address, value: number | string): number {
    if (typeof value === 'number') {
      return value;
    }
    const spec = paramAt(this.#plan, address)?.spec;
    const index = spec ? choiceIndex(spec, value) : -1;
    if (index === -1) {
      throw new Error(`${addressText(address)}: no choice ${value}`);
    }
    return index;
  }
}

// an event's value mapped, its time kept; a cancel, which holds a time, as it is
function mappedEvent(event: Automation, map: (value: number) => number): Automation {
  if (event[0] === 'cancel') {
    return event;
  }
  const [kind, value, ...rest] = event;
  return [kind, map(value), ...rest] as Automation;
}
