// ---------- build/web-audio/built: what the Web Audio builder hands back ----------
// The thing built, as its front panel (libs/build/ports/):
//   - a param set or automated by its address: a block's, on what's built of it; a macro's, onto
//     its targets; a choice by its index, as its block's param holds it; a placeholder's left alone;
//   - a preset's values set together; a new tempo told what follows it;
//   - a pool's copy added by its pool's address and its number, wired by its rule; let go;
//   - built again: the new beside the old, its inputs moved over, the values told and the copies
//     added kept, the old ringing out, faded where it makes sound of its own (rebuild.ts); a preset
//     that changes a setting built again with it;
//   - its placeholders, by address; taken apart, its sources stopped, its nodes disconnected.
// What a studio needs of it besides, Web Audio's own, not every builder's:
//   - a sound fed into a node's input by its address: a bus's, a copy's;
//   - a meter on a node's output by its address, or at a point inside a block;
//     made at its first read;
//   - what a block says of itself, by name: a limiter's reduction.
// Times are the context's.
import { eventOf, timedAt, type Automation, type When } from '../../automation/index.ts';
import { choiceIndex } from '../../params/index.ts';
import { entryOf } from '../../util/index.ts';
import {
  addressOf,
  addressText,
  copyOf,
  mapOnto,
  nodeAt,
  paramAt,
  settingAt,
  withSettings,
  type Address,
  type Node,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Built } from '../ports/index.ts';
import { automate } from './automation.ts';
import type { BuiltNode } from './built-node.ts';
import { meterOn, type PeakMeter } from './meters.ts';
import { BuiltParts, type PoolHolder } from './parts.ts';
import { disconnectFrom, fadedThrough, RING_OUT } from './rebuild.ts';
import { connectInto, wireInside, type Jacks } from './wiring.ts';

// a copy as added: its parts, the composite it's in, its name there, its pool and number, to add it again
interface Copy {
  readonly parts: BuiltParts;
  readonly holder: PoolHolder;
  readonly name: string;
  readonly pool: Address;
  readonly number: number;
}
// what's built of one plan: its plan, its parts, its jacks at the top, its copies by their addresses as text
interface Generation {
  readonly plan: Plan;
  readonly parts: BuiltParts;
  readonly top: Jacks;
  readonly copies: Map<string, Copy>;
}
// what what's built is made with: the context, where its sound goes and where its inputs come from, and how
// a plan and a copy's node are built into parts
export interface Building {
  readonly context: BaseAudioContext;
  readonly into: AudioNode;
  readonly from: Readonly<Record<string, AudioNode>>;
  readonly planned: (plan: Plan) => { parts: BuiltParts; top: Jacks };
  readonly copied: (node: Node, at: Address, parts: BuiltParts) => Jacks;
}

export class WebAudioBuilt implements Built {
  readonly #building: Building;
  readonly #told = new Map<string, number | string>(); // each value set, by its address as text, to tell again
  readonly #meters = new Map<string, Map<string, PeakMeter>>(); // by a node's address as text, then its point, '' its output
  #now: Generation;

  constructor(plan: Plan, building: Building) {
    this.#building = building;
    this.#now = this.#generationOf(plan);
  }
  get placeholders(): readonly Address[] {
    return this.#now.parts.placeholders;
  }
  // a param set by its address: now, at a time, or gliding there from now; kept, to tell it again
  set(address: Address, value: number | string, when: When = {}): void {
    this.#paramNamed(address);
    const at = timedAt(this.#numberOf(address, value), when, this.#context().currentTime);
    this.automate(address, [eventOf(at)], 0);
    this.#told.set(addressText(address), value);
  }
  // a param automated by its address, its events' times from a time, now unless given
  automate(address: Address, automation: readonly Automation[], from = this.#context().currentTime): void {
    this.#paramNamed(address);
    const node = nodeAt(this.#now.plan, address.slice(0, -1))!; // a param's: its node is there
    const name = address.at(-1)!;
    const macro = node.inside?.macros.find((each) => each.spec.name === name);
    if (macro) {
      for (const target of macro.maps) {
        const mapped = automation.map((event) => mappedEvent(event, (value) => mapOnto(target, value)));
        this.automate([...address.slice(0, -1), ...target.to], mapped, from);
      }
      return;
    }
    const built = this.#now.parts.blocks.get(addressText(address.slice(0, -1)));
    if (!built) {
      throw new Error(`${addressText(address)}: not built`); // a copy not added
    }
    const param = built.param(name); // none on a placeholder, or a pan made a gain where the context can't pan
    if (param) {
      automate(param, automation, from);
    }
  }
  // A preset sent: a setting it changes built again with it; its values by their addresses set
  // together, at one time.
  preset(values: ValuesByAddress, settings: ValuesByAddress = {}, when: When = {}): void {
    const plan = this.#now.plan;
    const changes = Object.entries(settings).some(([text, value]) => settingAt(plan, addressOf(text))?.value !== value);
    if (changes) {
      this.rebuild(withSettings(plan, settings));
    }
    for (const [text, value] of Object.entries(values)) {
      this.set(addressOf(text), value, when);
    }
  }
  // a new beat told what follows it, its synced delays' times: gliding there unless told otherwise
  tempo(beat: number, when: When = {}): void {
    for (const follower of this.#now.parts.tempoFollowers) {
      follower(beat, when, this.#context().currentTime);
    }
  }
  // A pool's copy added, by its pool's address and its number from 1: built from the pool's child,
  // wired by its rule, set by its own address; its address handed back.
  add(pool: Address, number: number): Address {
    const holder = this.#now.parts.poolHolders.get(addressText(pool.slice(0, -1)));
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
    holder.children.set(node.name, this.#building.copied(node, at, parts));
    for (const wire of wires) {
      wireInside(holder.node, wire, { children: holder.children, own: holder.own });
    }
    this.#now.parts.takeIn(parts);
    this.#now.copies.set(addressText(at), { parts, holder, name: node.name, pool, number });
    return at;
  }
  // A sound fed into a node's input by its address, its main one unless named:
  //   - a bus's, as a phrase plays into it;
  //   - a copy's, as a track's instrument plays into its channel.
  feed(address: Address, source: AudioNode, input = 'in'): void {
    for (const destination of this.#jacksAt(address).inputs[input] ?? []) {
      connectInto(source, destination);
    }
  }
  // A peak, as a meter reads it, the loudest sample of its last window:
  //   - on a node's main output, by its address: a channel's, after its fader and its pan;
  //   - at a point inside a block there, by name: a limiter's in and out.
  // Its meter made at its first read, so what nobody looks at has none.
  peak(address: Address, point = ''): number {
    const text = addressText(address);
    const meters = entryOf(this.#meters, text, () => new Map<string, PeakMeter>());
    const meter = entryOf(meters, point, () => meterOn(this.#context(), this.#listenedAt(address, point)));
    return meter.peak();
  }
  // what a block says of itself, by name, now: a limiter's reduction, in dB
  reading(address: Address, name: string): number {
    const reading = this.#blockAt(address).readings[name];
    if (!reading) {
      throw new Error(`${addressText(address)}: no reading ${name}`);
    }
    return reading();
  }
  // a copy let go: its sources stopped, its nodes disconnected, its address no longer set, what it was told forgotten
  letGo(copy: Address): void {
    const text = addressText(copy);
    const added = this.#now.copies.get(text);
    if (!added) {
      throw new Error(`${text}: not added`);
    }
    added.parts.takeApart();
    this.#now.parts.giveBack(added.parts);
    added.holder.children.delete(added.name);
    this.#now.copies.delete(text);
    for (const told of [...this.#told.keys()].filter((key) => key.startsWith(`${text}/`))) {
      this.#told.delete(told);
    }
    for (const metered of [...this.#meters.keys()].filter((key) => key === text || key.startsWith(`${text}/`))) {
      this.#meters.delete(metered); // on what's gone
    }
  }
  // Built again from a plan, the new beside the old:
  //   1. its inputs moved over to the new;
  //   2. the old faded out and the new faded in, where the old makes sound of its own;
  //   3. the copies added and the values told, told the new again;
  //   4. the old let go once it has rung out.
  rebuild(plan: Plan): void {
    const old = this.#now;
    for (const [name, source] of Object.entries(this.#building.from)) {
      (old.top.inputs[name] ?? []).forEach((destination) => disconnectFrom(source, destination));
    }
    this.#now = this.#generationOf(plan);
    this.#meters.clear(); // on the old: made again on the new as they're read
    if (makesSound(old)) {
      this.#faded(old, [1, 0]);
      this.#faded(this.#now, [0, 1]);
    }
    for (const { pool, number } of old.copies.values()) {
      this.add(pool, number);
    }
    for (const [text, value] of this.#told) {
      this.set(addressOf(text), value);
    }
    setTimeout(() => takeApart(old), RING_OUT);
  }
  dispose(): void {
    takeApart(this.#now);
  }

  // a plan built into a generation: fed from where its inputs come from, its main output into where it goes
  #generationOf(plan: Plan): Generation {
    const { into, from, planned } = this.#building;
    const { parts, top } = planned(plan);
    for (const [name, source] of Object.entries(from)) {
      (top.inputs[name] ?? []).forEach((destination) => connectInto(source, destination));
    }
    for (const output of top.outputs.out ?? []) {
      output.connect(into);
    }
    return { plan, parts, top, copies: new Map() };
  }
  // a generation's main output faded from one level to another, through a fade it keeps
  #faded({ top, parts }: Generation, levels: [number, number]): void {
    const context = this.#context();
    const fade = parts.keep(context.createGain());
    fadedThrough(top.outputs.out ?? [], { into: this.#building.into, levels, fade, now: context.currentTime });
  }
  #context(): BaseAudioContext {
    return this.#building.context;
  }
  // a node's jacks as built, by its address; one not built refused
  #jacksAt(address: Address): Jacks {
    const jacks = this.#now.parts.jacks.get(addressText(address));
    if (!jacks) {
      throw new Error(`${addressText(address)}: not built`);
    }
    return jacks;
  }
  // a block as built, by its address; one not built refused
  #blockAt(address: Address): BuiltNode {
    const built = this.#now.parts.blocks.get(addressText(address));
    if (!built) {
      throw new Error(`${addressText(address)}: not built`);
    }
    return built;
  }
  // where a meter listens: at a block's point, by name;
  // else at a node's main output, what it comes out of summed
  #listenedAt(address: Address, point: string): AudioNode {
    if (point) {
      const node = this.#blockAt(address).points[point];
      if (!node) {
        throw new Error(`${addressText(address)}: no point ${point}`);
      }
      return node;
    }
    const outputs = this.#jacksAt(address).outputs['out'] ?? [];
    if (outputs.length === 1) {
      return outputs[0]!;
    }
    const sum = this.#now.parts.keep(this.#context().createGain());
    outputs.forEach((output) => output.connect(sum));
    return sum;
  }
  // a param's spec by its address; a setting's or nothing's refused
  #paramNamed(address: Address): void {
    if (paramAt(this.#now.plan, address)) {
      return;
    }
    if (settingAt(this.#now.plan, address)) {
      throw new Error(`${addressText(address)}: a setting, sent with a preset`);
    }
    throw new Error(`${addressText(address)}: no param`);
  }
  // a value as its param holds it: a number as it is, a choice by its index among its param's choices
  #numberOf(address: Address, value: number | string): number {
    if (typeof value === 'number') {
      return value;
    }
    const spec = paramAt(this.#now.plan, address)?.spec;
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
// whether a generation makes sound of its own: a source running in it or in a copy
function makesSound({ parts, copies }: Generation): boolean {
  return parts.sources.length > 0 || [...copies.values()].some((copy) => copy.parts.sources.length > 0);
}
// a generation taken apart: its sources stopped, its nodes disconnected, its copies' too
function takeApart({ parts, copies }: Generation): void {
  parts.takeApart();
  for (const copy of copies.values()) {
    copy.parts.takeApart();
  }
}
