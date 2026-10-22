// ---------- view/desk/models/desk-model: a desk read as its strips ----------
// Its strips in the plan's order, by their roles:
//   - its buses, each with the buses that go out into it, as a group track holds its tracks;
//   - its returns;
//   - its master.
// A solo click, as Ableton's: that strip alone, the others let go; again, none; with shift,
// added or let go. A pool's copies among them, as they're added.
// What strips feed, for a view's lights: each through its way out, the sends said to be up.
// Its channels, as a desk alone shows them.
import { reached, withCopies, type Composite, type Wire } from '../../../plan/format/index.ts';
import { addressOf, addressText, type Address } from '../../../../base/util/index.ts';
import type { Strip } from './strip.ts';
import type { ViewBuilder } from '../../device/models/index.ts';

// a bus and the buses that go out into it
export interface BusGroup {
  readonly bus: Strip;
  readonly members: readonly Strip[];
}

// what a desk is read from: the view builder's plan and copies
type DeskViews = Pick<ViewBuilder, 'plan' | 'copiesOf'>;

// the desk form's roles a desk sorts its strips by
const BUS = 'bus';
const RETURN = 'return';
const MASTER = 'master';
const CHANNEL = 'channel';

// A desk read as its strips, by role, in the plan's order.
export class DeskModel {
  readonly buses: readonly BusGroup[];
  readonly returns: readonly Strip[];
  readonly master: Strip | undefined;
  readonly #views: DeskViews;
  readonly #strip: (address: Address) => Strip | undefined;

  // strip: a channel as a strip, by its address, a pool's copy among them
  constructor(views: DeskViews, strip: (address: Address) => Strip | undefined) {
    this.#views = views;
    this.#strip = strip;
    const own = this.#own();
    this.buses = groupsOf(own.filter(({ role }) => role === BUS));
    this.returns = own.filter(({ role }) => role === RETURN);
    this.master = own.find(({ role }) => role === MASTER);
  }
  // A solo click on a strip, with shift to add it or let it go.
  // Each strip whose solo changes is told: first those let go, then the one soloed.
  soloClick(address: Address, add = false): void {
    const soloed = this.#all().filter(({ solo }) => (solo?.value ?? 0) > 0);
    const before = new Set(soloed.map((strip) => addressText(strip.address)));
    const after = soloedAfter(before, addressText(address), add);
    for (const strip of soloed.filter((each) => !after.has(addressText(each.address)))) {
      strip.solo!.set(0); // soloed: it has a solo
    }
    for (const key of [...after].filter((each) => !before.has(each))) {
      this.#strip(addressOf(key))?.solo?.set(1);
    }
  }

  // The desk's channels, as a desk alone shows them: its own of the channel role, then each
  // pool's copies added so far.
  channels(): Strip[] {
    return [...this.#own().filter(({ role }) => role === CHANNEL), ...this.#copyStrips()];
  }

  // Everything the named strips feed, they among it: each through its way out, and its sends
  // sendsUp() says are up; over the desk's wires, its pools' copies added so far among them.
  // The master left out, where every way ends.
  reached(names: Iterable<string>, sendsUp: (from: string, to: string) => boolean): Set<string> {
    const through = ({ from, to }: Wire): boolean =>
      !('node' in from) || from.output === 'out' || !('node' in to) || sendsUp(from.node, to.node);
    const fed = reached({ wires: this.#wires() }, names, through);
    if (this.master) {
      fed.delete(addressText(this.master.address));
    }
    return fed;
  }

  // the desk's own channels as strips, in the plan's order
  #own(): Strip[] {
    const desk = this.#views.plan.node as Composite; // a desk is a composite
    return desk.children.flatMap(({ name }) => this.#strip([name]) ?? []);
  }
  // the desk's wires as they are: its own, and each copy's added, by its pool's rule
  #wires(): readonly Wire[] {
    return withCopies(this.#views.plan.node as Composite, this.#copies()).wires; // a desk is a composite
  }
  // every strip on the desk now: its own, then each pool's copies added so far
  #all(): Strip[] {
    return [...this.#own(), ...this.#copyStrips()];
  }
  // each pool's copies added so far, as strips
  #copyStrips(): Strip[] {
    return this.#copies().flatMap((copy) => this.#strip(copy) ?? []);
  }
  // each pool's copies added so far, pool by pool
  #copies(): Address[] {
    const desk = this.#views.plan.node as Composite; // a desk is a composite
    return desk.pools.flatMap(({ child }) => this.#views.copiesOf([child.name]));
  }
}

// Buses in groups, in order: a bus that goes out into another is that one's member.
function groupsOf(buses: readonly Strip[]): BusGroup[] {
  const names = new Set(buses.map(({ address }) => addressText(address)));
  const heads = buses.filter(({ into }) => into === undefined || !names.has(into));
  return heads.map((bus) => ({
    bus,
    members: buses.filter(({ into }) => into === addressText(bus.address)),
  }));
}
// Which strips are soloed after a click: with shift, that one added or let go; else that one
// alone, or none where it was the one soloed.
function soloedAfter(before: ReadonlySet<string>, clicked: string, add: boolean): Set<string> {
  if (add) {
    const after = new Set(before);
    if (!after.delete(clicked)) {
      after.add(clicked);
    }
    return after;
  }
  if (before.has(clicked) && before.size === 1) {
    return new Set();
  }
  return new Set([clicked]);
}
