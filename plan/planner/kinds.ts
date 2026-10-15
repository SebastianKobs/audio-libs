// ---------- plan/planner/kinds: the kinds a template names, blocks and templates ----------
// What a node of a kind shows from outside, as a template's wires and values name it:
//   - a block's: its jacks, its params, its settings, as declared;
//   - a template's: its jacks, its macros as its params, no settings of its own.
// And whether an address within a kind reaches a param or a setting inside it.
import { BLOCKS, type Block } from '../blocks/index.ts';
import type { Address } from '../format/index.ts';
import type { Template, TemplateChild } from './template.ts';

// a node of a kind, as its parent's wires and values name it
export interface Outside {
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly params: readonly string[];
  readonly settings: readonly string[];
}

// the kinds the planner knows: every block, and the templates it's handed
export class Kinds {
  readonly #templates: ReadonlyMap<string, Template>;

  constructor(templates: readonly Template[]) {
    this.#templates = new Map(templates.map((template) => [template.kind, template]));
  }
  block(kind: string): Block | undefined {
    return (BLOCKS as Readonly<Record<string, Block>>)[kind];
  }
  template(kind: string): Template | undefined {
    return this.#templates.get(kind);
  }
  // what a node of a kind shows from outside; none for a kind not known
  outsideOf(kind: string): Outside | undefined {
    const block = this.block(kind);
    if (block) {
      return {
        inputs: block.inputs.map((jack) => jack.name),
        outputs: block.outputs.map((jack) => jack.name),
        params: block.params.map((spec) => spec.name),
        settings: block.settings.map((spec) => spec.name),
      };
    }
    const template = this.template(kind);
    if (!template) {
      return undefined;
    }
    return {
      inputs: (template.inputs ?? []).map((jack) => jack.name),
      outputs: (template.outputs ?? []).map((jack) => jack.name),
      params: (template.macros ?? []).map((macro) => macro.spec.name),
      settings: [],
    };
  }
  // whether an address within a node of a kind reaches a param of it, or of a child inside
  paramIn(kind: string, address: Address): boolean {
    return this.#reaches(kind, address, 'params');
  }
  // the same for a setting
  settingIn(kind: string, address: Address): boolean {
    return this.#reaches(kind, address, 'settings');
  }
  // a template's children, a pool's among them
  childrenOf(template: Template): TemplateChild[] {
    return [...(template.children ?? []), ...(template.pools ?? []).map((pool) => pool.child)];
  }

  // the last name one of the kind's params or settings; the names before it children on the way down
  #reaches(kind: string, [name, ...rest]: Address, which: 'params' | 'settings'): boolean {
    if (name === undefined) {
      return false;
    }
    if (!rest.length) {
      return this.outsideOf(kind)?.[which].includes(name) ?? false;
    }
    const template = this.template(kind);
    const child = template && this.childrenOf(template).find((each) => each.name === name);
    return child !== undefined && this.#reaches(child.kind, rest, which);
  }
}
