// ---------- view/models/mixer: a desk as a mixer ----------
// Its strips in the plan's order, by their roles:
//   - its buses, each with the buses that go out into it, as a group track holds its tracks;
//   - its returns;
//   - its master.
// A solo click, as Ableton's: that strip alone, the others let go; again, none; with shift,
// added or let go. A pool's copies among them, as they're added.
// What strips feed, for a view's lights: each through its way out, the sends said to be up.
import {
  addressOf,
  addressText,
  copyOf,
  reached,
  type Address,
  type Composite,
  type Wire,
} from '../../plan/format/index.ts';
import type { Model } from './model.ts';
import type { Strip } from './strip.ts';

// a bus and the buses that go out into it
export interface BusGroup {
  readonly bus: Strip;
  readonly members: readonly Strip[];
}

// the desk form's roles a mixer sorts its strips by
const BUS = 'bus';
const RETURN = 'return';
const MASTER = 'master';

// A desk as a mixer: its strips by role, in the plan's order.
export class Mixer {
  readonly buses: readonly BusGroup[];
  readonly returns: readonly Strip[];
  readonly master: Strip | undefined;
  readonly #model: Model;
  readonly #strip: (address: Address) => Strip | undefined;

  // strip: a channel as a strip, by its address, a pool's copy among them
  constructor(model: Model, strip: (address: Address) => Strip | undefined) {
    this.#model = model;
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
    const desk = this.#model.plan.node as Composite; // a desk is a composite
    return desk.children.flatMap(({ name }) => this.#strip([name]) ?? []);
  }
  // the desk's wires as they are: its own, and each copy's added, by its pool's rule
  #wires(): Wire[] {
    const desk = this.#model.plan.node as Composite; // a desk is a composite
    const copies = desk.pools.flatMap((pool) =>
      this.#model.copiesOf([pool.child.name]).flatMap(([, number]) => copyOf(pool, Number(number)).wires),
    );
    return [...desk.wires, ...copies];
  }
  // every strip on the desk now: its own, then each pool's copies added so far
  #all(): Strip[] {
    const desk = this.#model.plan.node as Composite; // a desk is a composite
    const copies = desk.pools.flatMap(({ child }) =>
      this.#model.copiesOf([child.name]).flatMap((copy) => this.#strip(copy) ?? []),
    );
    return [...this.#own(), ...copies];
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
