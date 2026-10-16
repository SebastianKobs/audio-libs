// ---------- plan/planner/planner: a plan for whatever is asked ----------
// Handed the templates once, checking each as it's handed in; then a plan for any of them,
// an instrument, a channel, a whole studio, before anything plays:
//   1. a block's params and settings its specs, each at its value: given, or its default;
//   2. a child's template planned into it, the values it's given by their addresses;
//   3. a macro's spec, its own or its first target's; its value onto its targets, a choice by its
//      index: a param a macro moves is the macro's;
//   4. a jack's channels as they come, where its block doesn't fix them;
//   5. a pool's child ready, as each copy will be.
// No note: a voice's note sets its params as it plays.
import {
  addressOf,
  addressText,
  macroValues,
  VERSION,
  type Address,
  type Macro,
  type Node,
  type Param,
  type Plan,
  type ValuesByAddress,
} from '../format/index.ts';
import type { Block } from '../blocks/index.ts';
import type { ParamSpec } from '../../params/index.ts';
import { monoOrStereo, type LooseJack } from './mono-stereo.ts';
import { problemsInAll } from './check.ts';
import { extendedAll } from './extend.ts';
import { withPresets } from './presets.ts';
import type { Form } from './form.ts';
import { Catalog } from './catalog.ts';
import type { Preset, Template, TemplateChild, TemplateMacro, WrittenTemplate } from './template.ts';

// what a plan is asked with: its top node's name, its kind's unless given; values and settings
// changed by their addresses, a preset's
export interface Asked {
  readonly name?: string;
  readonly values?: ValuesByAddress;
  readonly settings?: ValuesByAddress;
}
// what a node is planned with: the values and settings it's given, by their addresses within it,
// and where it is, for a failure to name
interface Given {
  readonly values: ValuesByAddress;
  readonly settings: ValuesByAddress;
  readonly at: Address;
}

// the planner: templates made into plans
export class Planner {
  readonly #catalog: Catalog;

  // The templates, as each is written:
  //   1. each child written with a preset given its kind, from the presets handed in (a theme's);
  //   2. each merged with the one it's built on;
  //   3. checked well-formed and held to its form, then its macros onto choices.
  // Every failure said at once.
  constructor(
    templates: readonly WrittenTemplate[],
    forms: readonly Form[] = [],
    presets: Readonly<Record<string, Preset>> = {},
  ) {
    const resolved = withPresets(templates, presets);
    if (resolved.problems.length) {
      throw new Error(['templates not well-formed:', ...resolved.problems].join('\n'));
    }
    const merged = extendedAll(resolved.templates);
    this.#catalog = new Catalog(merged.templates);
    const byName = new Map(forms.map((form) => [form.name, form]));
    const problems = merged.problems.length ? merged.problems : problemsInAll(merged.templates, this.#catalog, byName);
    if (problems.length) {
      throw new Error(['templates not well-formed:', ...problems].join('\n'));
    }
  }
  // a plan for a template, its top node named as asked
  // a plan for a template, its top node named as asked; what it's asked for at an address it hasn't refused
  plan(kind: string, { name = kind, values = {}, settings = {} }: Asked = {}): Plan {
    if (!this.#catalog.template(kind)) {
      throw new Error(`no template ${kind}`);
    }
    const missing = [
      ...Object.keys(values)
        .filter((key) => !this.#catalog.paramIn(kind, addressOf(key)))
        .map((key) => `no param ${key}`),
      ...Object.keys(settings)
        .filter((key) => !this.#catalog.settingIn(kind, addressOf(key)))
        .map((key) => `no setting ${key}`),
    ];
    if (missing.length) {
      throw new Error([`${kind}: asked for what it has not:`, ...missing].join('\n  '));
    }
    return { version: VERSION, node: this.#node({ name, kind }, { values, settings, at: [] }) };
  }

  // a child planned: a block, or its template; the values its template writes, those given over them
  #node(child: TemplateChild, given: Given): Node {
    const values = { ...child.values, ...given.values };
    const settings = { ...child.settings, ...given.settings };
    const block = this.#catalog.block(child.kind);
    if (block) {
      return blockNode(child, block, { values, settings, at: given.at });
    }
    return this.#composite(child, this.#catalog.template(child.kind)!, { values, settings, at: given.at }); // a kind the check found
  }
  // a template planned: its macros at their values, onto their targets; its children, its pools
  #composite(child: TemplateChild, template: Template, { values, settings, at }: Given): Node {
    const macros = (template.macros ?? []).map((macro) => this.#macro(template, macro, { values, settings, at }));
    const moved = macros.flatMap((macro) =>
      macroValues(macro).map(({ to, value }) => [addressText(to), value] as const),
    );
    const inside = { ...values, ...Object.fromEntries(moved) }; // a param a macro moves is the macro's
    const planned = (each: TemplateChild): Node =>
      this.#node(each, {
        values: under(inside, each.name),
        settings: under(settings, each.name),
        at: [...at, each.name],
      });
    const children = monoOrStereo((template.children ?? []).map(planned), this.#loose(template), {
      wires: template.wires ?? [],
      inputs: template.inputs ?? [],
    });
    const pools = (template.pools ?? []).map(({ child: pooled, wires, note }) => ({
      child: planned(pooled),
      wires,
      ...(note && { note }),
    }));
    return {
      ...named(child),
      kind: template.kind,
      ...(template.form !== undefined && { form: template.form }),
      inputs: template.inputs ?? [],
      outputs: template.outputs ?? [],
      params: [],
      settings: [],
      children,
      wires: template.wires ?? [],
      macros,
      pools,
    };
  }
  // a macro planned: its spec, its own or its first target's; its value given, or written, or its default
  #macro(template: Template, macro: TemplateMacro, { values, at }: Given): Macro {
    const spec = this.#catalog.macroSpec(template, macro)!; // a spec or a target, as the check found
    const { value } = valued(spec, values[macro.name] ?? macro.value, [...at, macro.name]);
    return { spec, value, ...(macro.hint !== undefined && { hint: macro.hint }), maps: macro.maps };
  }
  // the jacks of a template's block children whose channels their blocks don't fix
  #loose(template: Template): LooseJack[] {
    return (template.children ?? []).flatMap(({ name, kind }) => {
      const block = this.#catalog.block(kind);
      if (!block) {
        return [];
      }
      return (['inputs', 'outputs'] as const).flatMap((side) =>
        block[side]
          .filter((jack) => jack.channels === undefined)
          .map((jack) => ({ child: name, side, name: jack.name })),
      );
    });
  }
}

// a block planned: its jacks, mono where it doesn't fix them until worked out; its params and settings at their values
function blockNode(child: TemplateChild, block: Block, { values, settings, at }: Given): Node {
  return {
    ...named(child),
    kind: block.kind,
    inputs: block.inputs.map((jack) => ({ name: jack.name, channels: jack.channels ?? 1 })),
    outputs: block.outputs.map((jack) => ({ name: jack.name, channels: jack.channels ?? 1 })),
    params: block.params.map((spec) => valued(spec, values[spec.name], [...at, spec.name])),
    settings: block.settings.map((spec) => valued(spec, settings[spec.name], [...at, spec.name])),
  };
}
// A param or a setting at its value: given, or its default; refused where it has neither.
// A choice given by its index, as a macro moves it, written as the choice; one past them refused.
function valued(spec: ParamSpec, given: number | string | undefined, at: Address): Param {
  const value = given ?? spec.default;
  if (value === undefined) {
    throw new Error(`${addressText(at)}: no value, and no default`);
  }
  if (typeof value !== 'number' || !spec.choices) {
    return { spec, value };
  }
  const choice = spec.choices[value];
  if (choice === undefined) {
    throw new Error(`${addressText(at)}: no choice ${value}`);
  }
  return { spec, value: choice };
}
// a child's name, and its role and its label where it has them
function named({ name, role, label }: TemplateChild): Pick<Node, 'name' | 'role' | 'label'> {
  return { name, ...(role !== undefined && { role }), ...(label !== undefined && { label }) };
}
// the values under a child's name, by their addresses within it
function under(values: ValuesByAddress, name: string): ValuesByAddress {
  const prefix = `${name}/`;
  return Object.fromEntries(
    Object.entries(values)
      .filter(([address]) => address.startsWith(prefix))
      .map(([address, value]) => [address.slice(prefix.length), value]),
  );
}
