// ---------- build/web-audio/built: what the Web Audio builder hands back ----------
// The thing built, as its front panel (libs/build/ports/):
//   - a param set or automated by its address: a block's, on what's built of it; a macro's, onto
//     its targets; a choice by its index, as its block's param holds it; a placeholder's left alone;
//   - a preset's values set together; a new tempo told what follows it;
//   - a pool's copy added by its pool's address and its number, wired by its rule; let go;
//   - its placeholders, by address; taken apart, its sources stopped, its nodes disconnected.
// Times are the context's.
import { eventOf, timedAt, type Automation, type When } from '../../automation/index.ts';
import { choiceIndex } from '../../params/index.ts';
import {
  addressOf,
  addressText,
  copyOf,
  mapOnto,
  nodeAt,
  paramAt,
  settingAt,
  type Address,
  type Node,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Built } from '../ports/index.ts';
import { automate } from './automation.ts';
import { BuiltParts, type PoolHolder } from './parts.ts';
import { wireInside, type Jacks } from './wiring.ts';

// a copy as added: its parts, the composite it's in, its name there
interface Copy {
  readonly parts: BuiltParts;
  readonly holder: PoolHolder;
  readonly name: string;
}
// what what's built is made with: its plan, its parts, the context, and how a copy's node is built into its parts
interface Making {
  readonly plan: Plan;
  readonly parts: BuiltParts;
  readonly context: BaseAudioContext;
  readonly copied: (node: Node, at: Address, parts: BuiltParts) => Jacks;
}

export class WebAudioBuilt implements Built {
  readonly #plan: Plan;
  readonly #parts: BuiltParts;
  readonly #context: BaseAudioContext;
  readonly #copied: Making['copied'];
  readonly #copies = new Map<string, Copy>(); // by its address as text

  constructor({ plan, parts, context, copied }: Making) {
    this.#plan = plan;
    this.#parts = parts;
    this.#context = context;
    this.#copied = copied;
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
    if (!built) {
      throw new Error(`${addressText(address)}: not built`); // a copy not added
    }
    const param = built.param(name); // none on a placeholder, or a pan made a gain where the context can't pan
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
  // A pool's copy added, by its pool's address and its number from 1: built from the pool's child,
  // wired by its rule, set by its own address; its address handed back.
  add(pool: Address, number: number): Address {
    const holder = this.#parts.poolHolders.get(addressText(pool.slice(0, -1)));
    const kept = holder?.node.inside?.pools.find((each) => each.child.name === pool.at(-1));
    if (!holder || !kept) {
      throw new Error(`${addressText(pool)}: no pool`);
    }
    const { node, wires } = copyOf(kept, number);
    const at = [...pool.slice(0, -1), node.name];
    if (holder.children.has(node.name)) {
      throw new Error(`${addressText(at)}: added already`);
    }
    const parts = new BuiltParts();
    holder.children.set(node.name, this.#copied(node, at, parts));
    for (const wire of wires) {
      wireInside(holder.node, wire, { children: holder.children, own: holder.own });
    }
    this.#parts.takeIn(parts);
    this.#copies.set(addressText(at), { parts, holder, name: node.name });
    return at;
  }
  // a copy let go: its sources stopped, its nodes disconnected, its address no longer set
  letGo(copy: Address): void {
    const added = this.#copies.get(addressText(copy));
    if (!added) {
      throw new Error(`${addressText(copy)}: not added`);
    }
    added.parts.takeApart();
    this.#parts.giveBack(added.parts);
    added.holder.children.delete(added.name);
    this.#copies.delete(addressText(copy));
  }
  dispose(): void {
    this.#parts.takeApart();
    for (const { parts } of this.#copies.values()) {
      parts.takeApart();
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
