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
import { fromData, type Shape } from '../../util/index.ts';

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

// A template's shape, as read from data: its kind; its form and its base, words;
// what its lists' items need: a jack its name, a child its name and its kind or a preset,
// a wire its two ends, a macro its targets, a pool its child and its wires.
const TEMPLATE_SHAPE: Shape = {
  fields: {
    kind: 'word',
    form: 'word',
    extends: 'word',
    inputs: { listOf: { needs: ['name'] } },
    outputs: { listOf: { needs: ['name'] } },
    children: { listOf: { needs: ['name', ['kind', 'preset']] } },
    wires: { listOf: { needs: ['from', 'to'] } },
    macros: { listOf: { needs: ['maps'] } },
    pools: { listOf: { needs: ['child', 'wires'] } },
  },
  needs: ['kind'],
};
// Presets by name, as a theme writes them: each a template's kind, its values and settings
// by address, each a number or a word.
const PRESETS_SHAPE: Shape = {
  byName: {
    fields: { kind: 'word', values: { byName: 'word or number' }, settings: { byName: 'word or number' } },
    needs: ['kind'],
  },
};

// A template read from data, as it is once it's of a template's shape; refused where it isn't.
export function templateOf(data: unknown, source: string): WrittenTemplate {
  return fromData(data, TEMPLATE_SHAPE, { source, what: 'a template' });
}
// Presets by name read from data, as they are once they're of presets' shape; refused where they aren't.
export function presetsOf(data: unknown, source: string): Readonly<Record<string, Preset>> {
  return fromData(data, PRESETS_SHAPE, { source, what: 'presets' });
}
