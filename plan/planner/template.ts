// ---------- plan/planner/template: a composite's description, as people write it ----------
// Written as a plan's node, short:
//   - a child by its kind, a block's or another template's, with only the values and settings
//     it changes, by their addresses within it;
//   - its own inputs, outputs, wires and pools as the plan has them;
//   - a macro by its name, its spec its first target's where it writes none;
//   - its child's role in it, and the form it fulfils, where it has one.
// The planner fills in the rest: the specs, a block's jacks, a child's template.
import type { ParamSpec } from '../../params/index.ts';
import type { Input, MacroTarget, NoteAddresses, Output, ValuesByAddress, Wire } from '../format/index.ts';

// a child as a template writes it
export interface TemplateChild {
  readonly name: string;
  readonly kind: string;
  readonly role?: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
}
// A child written with a preset, by its name: the preset's kind, values and settings, its own over them
// (presets.ts).
export interface PresetChild extends Omit<TemplateChild, 'kind'> {
  readonly preset: string;
}
// A preset on a template, as a theme writes one: the template's kind, and the values and settings
// it changes, by their addresses within it.
export interface Preset {
  readonly kind: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
}
// A macro as a template writes it: its name and its targets; where it writes none of its own,
// its spec its first target's, its value its spec's default.
export interface TemplateMacro {
  readonly name: string;
  readonly spec?: Omit<ParamSpec, 'name'>;
  readonly value?: number | string;
  readonly hint?: string;
  readonly maps: readonly MacroTarget[];
}
// a pool as a template writes it: its child, the wires each copy is wired by, a voice's note
export interface TemplatePool {
  readonly child: TemplateChild;
  readonly wires: readonly Wire[];
  readonly note?: NoteAddresses;
}
// A template, by its kind, the name other templates give it; a list it doesn't write, none.
// Built on another where it names one (extends): its base's whole, then its own (extend.ts).
export interface Template {
  readonly kind: string;
  readonly extends?: string;
  readonly form?: string;
  readonly inputs?: readonly Input[];
  readonly outputs?: readonly Output[];
  readonly children?: readonly TemplateChild[];
  readonly wires?: readonly Wire[];
  readonly macros?: readonly TemplateMacro[];
  readonly pools?: readonly TemplatePool[];
}
// A template as written, read from data or handed to the planner: each child by its kind or by a preset.
export interface WrittenTemplate extends Omit<Template, 'children'> {
  readonly children?: readonly (TemplateChild | PresetChild)[];
}
