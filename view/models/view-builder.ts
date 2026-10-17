// ---------- view/models/view-builder: view models for whatever part of a plan is asked ----------
// Built from the plan by its nodes, the values read through the model's port.
//   - a param or a setting: a knob where it has a range, a choice where it has choices;
//   - a node: a device, its controls in the plan's order;
//   - a composite's children: grouped by their roles, as a synth's panel groups its modules;
//   - what a composite's own sources move: a matrix, as a synth's mod matrix;
//   - a channel: a strip, by its form; a desk: a mixer, its strips by role.
import {
  addressText,
  isComposite,
  nodeAt,
  under,
  type Address,
  type MacroTarget,
  type Node,
  type Plan,
} from '../../plan/format/index.ts';
import { Choice } from './choice.ts';
import type { Control, Device } from './device.ts';
import { Knob } from './knob.ts';
import { Mixer } from './mixer.ts';
import { Model, type ModelPort } from './model.ts';
import type { Move } from './moves.ts';
import { Strip } from './strip.ts';

// A row of a matrix: a source, by its address within the composite, what it moves, and how
// much: a macro by its map, a modulator by its reach, a control of its own.
export interface MatrixRow {
  readonly source: string;
  readonly target: string;
  readonly kind: Move['kind'];
  readonly map?: Omit<MacroTarget, 'to'>;
  readonly amount?: Control;
}

// The view models of a plan, read and set through the tool's port.
export class ViewBuilder {
  readonly #model: Model;

  constructor(port: ModelPort) {
    this.#model = new Model(port);
  }
  // the plan the models are built from, as the port hands it now
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
  // A channel as a strip, by its address, a pool's copy among them; none where nothing's there.
  strip(address: Address): Strip | undefined {
    const node = nodeAt(this.#model.plan, address);
    if (!node) {
      return undefined;
    }
    return new Strip(this.#model, this, address, node);
  }
  // a node's level as the implementation hears it, at one of its points where it has several
  peakOf(address: Address, point?: string): number {
    return this.#model.peakOf(address, point);
  }
  // what the implementation reads of a node, a limiter's reduction
  readingOf(address: Address, reading: string): number {
    return this.#model.readingOf(address, reading);
  }
  // the plan's desk as a mixer
  mixer(): Mixer {
    return new Mixer(this.#model, (address) => this.strip(address));
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
// a node's settings and its children's, by their addresses within it
function settingsWithin(node: Node): Address[] {
  const own = node.settings.map(({ spec }) => [spec.name]);
  const children = (node.children ?? []).flatMap((child) =>
    child.settings.map(({ spec }) => under(child.name, [spec.name])),
  );
  return [...own, ...children];
}
