// ---------- build/desk/desk-state: a desk's state as it plays, by address ----------
// What the desk's parts work on (desk.ts): its plan, its values, its channels, what's built.
// Planned, then built as its sound starts, by the function handed in: what builds it is its
// owner's, and where its sound goes (a Web Audio builder, into an output that fades in).
// Built:
//   1. its plan, with the settings changed before;
//   2. a way in for each of its own inputs, what plays into a bus (bus), by what's built;
//   3. the values set before told what's built.
// Then, as it plays:
//   - a track's channel added from its pool the first time it's asked for, by the track's key:
//     its pool's copy, by its address (my tap/3);
//   - every value set by its address, and kept: the one owner of the desk's values as
//     they play, what's built told each, the views reading copies;
//   - the tempo followed; a setting changed by a preset, what's built built again.
import type { When } from '../../automation/index.ts';
import { choiceAt, type ParamSpec } from '../../params/index.ts';
import {
  addressOf,
  addressText,
  isCopyNumber,
  paramAt,
  poolNamed,
  settingAt,
  withCopies,
  withSettings,
  type Address,
  type Composite,
  type Plan,
  type ValuesByAddress,
} from '../../plan/format/index.ts';
import type { Built } from '../contract/index.ts';

// What the desk asks of what's built beyond what every builder hands back: a way into a
// channel or into one of the desk's own inputs, by its address and its input.
export interface DeskBuilt extends Built {
  wayInto(address: Address, input?: string): unknown;
}
// a way in, as what's built hands it out: an audio node, for Web Audio's
export type WayIn<B extends DeskBuilt> = ReturnType<B['wayInto']>;
// the desk's channels and their wires, its pools' copies added so far among them
export type Wiring = Pick<Composite, 'children' | 'wires'>;

export class DeskState<B extends DeskBuilt> {
  readonly plan: Plan;
  // each of its own inputs' way in, by name, once built
  readonly bus: Record<string, WayIn<B>> = {};
  // each value set, by its address as text
  readonly #values = new Map<string, number | string>();
  // each setting changed, by its address as text
  readonly #settings: Record<string, number | string> = {};
  // each copy added, by its address as text, its track's key
  readonly #copies = new Map<string, Address>();
  #built: B | null = null;
  #beat: number | undefined; // the beat last told, none at first

  constructor({ plan }: { plan: Plan }) {
    this.plan = plan;
  }
  // what's built, once its sound has started
  get built(): B | null {
    return this.#built;
  }
  // The desk built by the function handed in, as its sound starts, with the settings changed
  // before, the values set before told it.
  build(make: (plan: Plan) => B): B {
    const built = make(withSettings(this.plan, this.#settings));
    this.#built = built;
    for (const { name } of this.plan.node.inputs) {
      this.bus[name] = built.wayInto([], name) as WayIn<B>; // what's built hands its own kind
    }
    this.#tell((address) => this.#playable(address));
    return built;
  }
  // A track's channel, its pool's copy, added the first time it's asked for once the desk is
  // built; its address on the desk; none for a track with no pool on the desk.
  channelOf(track: string): Address | null {
    const copy = this.#copyOf(track);
    if (!copy) {
      return null;
    }
    if (this.#built && !this.#copies.has(track)) {
      this.#built.add(copy);
      this.#copies.set(track, copy);
      this.#tell((address) => isUnder(address, copy)); // what was set on it before
    }
    return copy;
  }
  // whether a track's channel has been added
  added(track: string): boolean {
    return this.#copies.has(track);
  }
  // a pool's copies added so far, by their addresses, in their numbers' order
  copiesOf(pool: string): Address[] {
    const copies = [...this.#copies.values()].filter(([name]) => name === pool);
    return copies.toSorted(([, first = ''], [, second = '']) => Number(first) - Number(second));
  }
  // Its channels and their wires as they are: the plan's, and each copy added, wired by its
  // pool's rule; each copy by its address, as its wires name it, the track's key.
  wiring(): Wiring {
    return withCopies(this.plan.node as Composite, [...this.#copies.values()]); // a desk is a composite
  }
  // A value set by its address: kept, and told what's built when it says.
  // Told once there's something to tell: the desk built, a track's channel added.
  // A choice by its index, as a controller carries it, kept as the choice.
  set(address: Address, value: number | string, when: When = {}): void {
    this.#values.set(addressText(address), this.#keptAs(address, value));
    if (this.#playable(address)) {
      this.#built!.set(address, value, when); // built, as playable
    }
  }
  // a value or a setting now, as set, or as the plan starts it; none where there's no such
  // param or setting
  valueOf(address: Address): number | string | undefined {
    const text = addressText(address);
    return this.#values.get(text) ?? this.#settings[text] ?? this.startOf(address);
  }
  // a param's declaration, by its address, as the plan declares it; none where it has none
  specOf(address: Address): ParamSpec | undefined {
    return paramAt(this.plan, address)?.spec;
  }
  // a value or a setting as the plan starts it, which a reset brings back
  startOf(address: Address): number | string | undefined {
    return (paramAt(this.plan, address) ?? settingAt(this.plan, address))?.value;
  }
  // settings changed, as a preset: kept, what's built built again with them
  settings(changed: ValuesByAddress): void {
    Object.assign(this.#settings, changed);
    this.#built?.preset({}, changed);
  }
  // whether a strip is one of the desk's own channels, not a track's
  isOwn(strip: string): boolean {
    return (this.plan.node as Composite).children.some(({ name }) => name === strip); // a desk is a composite
  }
  // a new beat, its synced delays' times following it, gliding; one unchanged passed over
  tempo(beat: number): void {
    if (beat === this.#beat) {
      return;
    }
    this.#beat = beat;
    this.#built?.tempo(beat);
  }

  // Whether what's built has an address: built, a param of the plan's, on one of the plan's
  // channels or a copy added.
  #playable(address: Address): boolean {
    const [channel] = address;
    if (!this.#built || channel === undefined || !paramAt(this.plan, address)) {
      return false;
    }
    if ([...this.#copies.values()].some((copy) => isUnder(address, copy))) {
      return true;
    }
    return this.plan.node.children!.some(({ name }) => name === channel); // a desk is a composite
  }
  // A track's channel's address, its key's names: a pool's name and the copy's number
  // (my tap/3); none for a track with no pool.
  #copyOf(track: string): Address | null {
    const [pool = '', number = '', ...deeper] = addressOf(track);
    const desk = this.plan.node as Composite; // a desk is a composite
    if (!poolNamed(desk, pool) || !isCopyNumber(number) || deeper.length) {
      return null;
    }
    return [pool, number];
  }
  // the values kept that it says, told what's built, now
  #tell(which: (address: Address) => boolean): void {
    for (const [text, value] of this.#values) {
      const address = addressOf(text);
      if (which(address)) {
        this.#built!.set(address, value); // built: only told once it is
      }
    }
  }
  // a value as it's kept: a choice by its index as the choice its param holds there
  #keptAs(address: Address, value: number | string): number | string {
    const spec = this.specOf(address);
    if (typeof value !== 'number' || !spec?.choices) {
      return value;
    }
    return choiceAt(spec, value);
  }
}

// whether an address is under another, or it
function isUnder(address: Address, at: Address): boolean {
  return at.every((name, index) => address[index] === name);
}
