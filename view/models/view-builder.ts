// ---------- view/models/view-builder: view models for whatever part of a plan is asked ----------
// Built from the plan by its nodes, the values read through the model's port.
//   - a param or a setting: a knob where it has a range, a choice where it has choices;
//   - a node: a device, its controls in the plan's order.
import { nodeAt, under, type Address, type Node } from '../../plan/format/index.ts';
import { Choice } from './choice.ts';
import type { Control, Device } from './device.ts';
import { Knob } from './knob.ts';
import { Model, type ModelPort } from './model.ts';

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
    return { name: node.name, kind: node.kind, controls };
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
