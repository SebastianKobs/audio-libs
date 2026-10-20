// ---------- view/device/models/view-builder: view models for whatever part of a plan is asked ----------
// Built from the plan by its nodes, the values read through the plan's readout.
//   - a param or a setting: a knob where it has a range, a choice where it has choices;
//   - a node: a device, its controls in the plan's order;
//   - a composite's children: grouped by their roles, as a synth's panel groups its modules;
//   - what a composite's own sources move: a matrix, as a synth's mod matrix;
import { isComposite, nodeAt, type MacroTarget, type Move, type Node, type Plan } from '../../../plan/format/index.ts';
import { addressText, under, type Address } from '../../../util/index.ts';
import { Choice } from './choice.ts';
import type { Control, Device } from './device.ts';
import { Knob } from './knob.ts';
import { Model } from './model.ts';
import type { Command, PlanReadout } from '../readout/index.ts';

// A row of a matrix: a source, by its address within the composite, what it moves, and how
// much: a macro by its map, a modulator by its reach, a control of its own.
export interface MatrixRow {
  readonly source: string;
  readonly target: string;
  readonly kind: Move['kind'];
  readonly map?: Omit<MacroTarget, 'to'>;
  readonly amount?: Control;
}

// The view models of a plan, read through the plan's readout, what's done sent as a
// message on a bus for the plan.
export class ViewBuilder {
  readonly #model: Model;

  constructor(planReadout: PlanReadout, send: (command: Command) => void) {
    this.#model = new Model(planReadout, send);
  }
  // the plan the models are built from, as its readout hands it now
  get plan(): Plan {
    return this.#model.plan;
  }
  // A param or a setting as a control: a choice where it has choices, else a knob; none where
  // nothing's there.
  control(address: Address): Control | undefined {
    const found = this.#model.find(address);
    if (!found) {
      return undefined;
    }
    if (found.param.spec.choices) {
      return new Choice(this.#model, address, found);
    }
    return new Knob(this.#model, address, found);
  }
  // A node as a device, by its address; none where nothing's there.
  device(address: Address): Device | undefined {
    const node = nodeAt(this.#model.plan, address);
    if (!node) {
      return undefined;
    }
    const controls = controlsOf(node).map((name) => this.control([...address, ...name])!); // found there
    const label = node.label ?? node.kind;
    return { address, name: node.name, kind: node.kind, label, slot: this.#model.slotOf(address), controls };
  }
  // A composite's children, by its address, grouped by their roles, a group each in the order
  // they first come, each child a device; none where it's no composite.
  groups(address: Address): { role: string; devices: Device[] }[] {
    const node = nodeAt(this.#model.plan, address);
    const groups = new Map<string, Device[]>();
    for (const child of node && isComposite(node) ? node.children : []) {
      const role = child.role ?? '';
      groups.set(role, [...(groups.get(role) ?? []), this.device([...address, child.name])!]); // a child: there
    }
    return [...groups].map(([role, devices]) => ({ role, devices }));
  }
  // What a composite's own sources move, by its address, a row a target: its macros in its
  // template's order, then its children wired into a param; none of a child's own.
  matrix(address: Address): MatrixRow[] {
    const within = (inner: Address): string => addressText(inner.slice(address.length));
    return this.#model.movesAt(address).map(({ by, target, kind, map, reach }) => {
      const amount = reach && this.control(reach);
      return { source: within(by), target: within(target), kind, ...(map && { map }), ...(amount && { amount }) };
    });
  }
  // a node's level as the implementation hears it, at one of its points where it has several
  peakOf(address: Address, point?: string): number {
    return this.#model.peakOf(address, point);
  }
  // what the implementation reads of a node, a limiter's reduction
  readingOf(address: Address, reading: string): number {
    return this.#model.readingOf(address, reading);
  }
  // a pool's copies added so far, by their addresses
  copiesOf(pool: Address): readonly Address[] {
    return this.#model.copiesOf(pool);
  }
}

// A node's controls in order, by their addresses within it:
//   1. its macros, a composite's own params;
//   2. its params;
//   3. its settings, then each child's, in the plan's order.
function controlsOf(node: Node): Address[] {
  const own = [...(node.macros ?? []), ...node.params].map(({ spec }) => [spec.name]);
  return [...own, ...settingsWithin(node)];
}
// A node's settings and its children's, by their addresses within it; a child's that one of
// the node's own stands for left out, as it's set through that one.
function settingsWithin(node: Node): Address[] {
  const own = node.settings.map(({ spec }) => [spec.name]);
  const stoodFor = new Set(node.settings.flatMap(({ to }) => (to ? [addressText(to)] : [])));
  const children = (node.children ?? []).flatMap((child) =>
    child.settings.map(({ spec }) => under(child.name, [spec.name])),
  );
  return [...own, ...children.filter((address) => !stoodFor.has(addressText(address)))];
}
