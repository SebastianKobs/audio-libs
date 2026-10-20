// ---------- view/models/strip: a channel as a strip, by its form ----------
// As a mixer's strip: its inserts as devices, its sends' knobs, its fader, pan, mute and solo,
// its level. Read by the channel form's roles: insert, mute (its cut), sends.
// Its name as shown: its label, else its own; a pool's copy its pool's and its number.
// Where it goes: the channel its way out goes into, by that one's name as shown.
import {
  isCopyNumber,
  nodeAt,
  poolNamed,
  splitAtChild,
  wayOut,
  type Address,
  type Composite,
  type Node,
  type Plan,
} from '../../plan/format/index.ts';
import type { Device, Knob, ViewBuilder } from '../device/models/index.ts';

// what a strip is read from: the view builder's plan, controls, devices and levels
type StripViews = Pick<ViewBuilder, 'plan' | 'control' | 'device' | 'peakOf'>;

// the channel form's roles a strip finds its parts by
const INSERT = 'insert';
const CUT = 'mute';
const SENDS = 'sends';

// A channel as a strip: its parts by their addresses, its level and whether it's quiet as it plays.
export class Strip {
  readonly address: Address;
  readonly name: string;
  readonly role: string | undefined;
  readonly into: string | undefined;
  readonly out: string | undefined;
  readonly inserts: readonly Device[];
  readonly sends: readonly Knob[];
  readonly volume: Knob;
  readonly pan: Knob | undefined;
  readonly mute: Knob | undefined;
  readonly solo: Knob | undefined;
  readonly #views: StripViews;
  readonly #cut: Knob | undefined;

  constructor(views: StripViews, address: Address, node: Node) {
    this.#views = views;
    this.address = address;
    this.name = shownName(views.plan, address);
    this.role = node.role;
    this.into = wayOutOf(views.plan, address);
    this.out = this.into === undefined ? undefined : shownName(views.plan, [this.into]);
    const children = node.children ?? [];
    const under = (...names: string[]): Address => [...address, ...names];
    const knob = (...names: string[]): Knob | undefined => views.control(under(...names)) as Knob | undefined;
    this.inserts = children.filter(({ role }) => role === INSERT).map(({ name }) => views.device(under(name))!);
    const sends = children.find(({ role }) => role === SENDS);
    this.sends = (sends?.macros ?? []).map(({ spec }) => knob(sends!.name, spec.name)!); // a sends' child's
    this.volume = knob('volume')!; // every channel has its volume
    this.pan = knob('pan');
    this.mute = knob('mute');
    this.solo = knob('solo');
    const cut = children.find(({ role }) => role === CUT);
    this.#cut = cut && knob(cut.name, cut.params[0]!.spec.name); // a cut is a gain
  }
  // its level as the implementation hears it
  get level(): number {
    return this.#views.peakOf(this.address);
  }
  // whether a mute or another's solo has it silent: its cut at 0
  get quiet(): boolean {
    return this.#cut?.value === 0;
  }
}

// A channel's name as shown: its label, else its own; a pool's copy, its pool's and its number.
export function shownName(plan: Plan, address: Address): string {
  const { child } = splitAtChild(address);
  const [name = '', number] = child;
  const node = nodeAt(plan, [name]);
  const shown = node?.label ?? name;
  if (number !== undefined && isCopyNumber(number)) {
    return `${shown} ${number}`;
  }
  return shown;
}
// A channel's name in little room, as a send's knob shows it: its short label, else its label,
// else its own.
export function shortName(plan: Plan, address: Address): string {
  return nodeAt(plan, address)?.short ?? shownName(plan, address);
}
// The channel a channel's way out goes into, by its name; none where it goes out of the desk.
// A pool's copy goes where its pool's rule wires it.
function wayOutOf(plan: Plan, address: Address): string | undefined {
  const desk = plan.node as Composite; // a desk is a composite
  const [name = '', number] = address;
  if (number !== undefined && isCopyNumber(number)) {
    return wayOut(poolNamed(desk, name)?.wires ?? [], name);
  }
  return wayOut(desk.wires, name);
}
