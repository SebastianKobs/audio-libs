// ---------- plan/planner/template: a composite's description, as people write it ----------
// Written as a plan's node, short:
//   - a child by its kind, a block's or another template's, with only the values and settings
//     it changes, by their addresses within it;
//   - its own inputs, outputs, wires, macros and pools as the plan has them;
//   - its child's role in it, and the form it fulfils, where it has one.
// The planner fills in the rest: the specs, a block's jacks, a child's template.
import type { Input, Macro, NoteAddresses, Output, Wire } from '../format/index.ts';

// values by their addresses' text within a node: a number, or one of its choices
export type ValuesByAddress = Readonly<Record<string, number | string>>;
// a child as a template writes it
export interface TemplateChild {
  readonly name: string;
  readonly kind: string;
  readonly role?: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
}
// a pool as a template writes it: its child, the wires each copy is wired by, a voice's note
export interface TemplatePool {
  readonly child: TemplateChild;
  readonly wires: readonly Wire[];
  readonly note?: NoteAddresses;
}
// a template, by its kind, the name other templates give it; a list it doesn't write, none
export interface Template {
  readonly kind: string;
  readonly form?: string;
  readonly inputs?: readonly Input[];
  readonly outputs?: readonly Output[];
  readonly children?: readonly TemplateChild[];
  readonly wires?: readonly Wire[];
  readonly macros?: readonly Macro[];
  readonly pools?: readonly TemplatePool[];
}
