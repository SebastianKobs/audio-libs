// ---------- view/models/view-builder: view models for whatever part of a plan is asked ----------
// Built from the plan by its nodes, the values read through the model's port.
//   - a param or a setting: a knob where it has a range, a choice where it has choices;
//   - a node: a device, its controls in the plan's order;
//   - a channel: a strip, by its form; a desk: a mixer, its strips by role.
import { nodeAt, under, type Address, type Node } from '../../plan/format/index.ts';
import { Choice } from './choice.ts';
import type { Control, Device } from './device.ts';
import { Knob } from './knob.ts';
import { Mixer } from './mixer.ts';
import { Model, type ModelPort } from './model.ts';
import { Strip } from './strip.ts';

// The view models of a plan, read and set through the tool's port.
export class ViewBuilder {
  readonly #model: Model;

  constructor(port: ModelPort) {
    this.#model = new Model(port);
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
