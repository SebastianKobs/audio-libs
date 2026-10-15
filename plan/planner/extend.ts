// ---------- plan/planner/extend: a template built on another ----------
// A template names the one it's built on (extends), as a rack is saved on another:
//   - its base's jacks and form, where it writes none of its own;
//   - its base's children, wires, macros and pools first, then its own.
// A base built on another is merged first, down to one built on none.
// Merged before the planner's checks, so the checks see one template and a plan comes out flat.
// What keeps it from merging said: a base not handed in, a block's kind among them; a loop.
import type { Template } from './template.ts';

// The templates, each merged with its base; or, where one can't be, what's wrong, each a line.
export function extendedAll(templates: readonly Template[]): { templates: Template[]; problems: string[] } {
  const byKind = new Map(templates.map((template) => [template.kind, template]));
  const problems = templates.flatMap((template) => extendProblems(template, byKind));
  if (problems.length) {
    return { templates: [...templates], problems };
  }
  return { templates: templates.map((template) => extended(template, byKind)), problems: [] };
}

// a template's base not handed in; its bases leading back to it, a loop
function extendProblems(template: Template, byKind: ReadonlyMap<string, Template>): string[] {
  if (template.extends === undefined) {
    return [];
  }
  if (!byKind.has(template.extends)) {
    return [`${template.kind}: extends ${template.extends}, no template handed in`];
  }
  const bases = basesOf(template, byKind);
  const back = bases.indexOf(template.kind);
  if (back === -1) {
    return [];
  }
  return [`${template.kind}: extends ${bases.slice(0, back + 1).join(', which extends ')}: a loop`];
}
// the kinds a template's bases lead through, its own base first, until one built on none or one met again
function basesOf(template: Template, byKind: ReadonlyMap<string, Template>): string[] {
  const bases: string[] = [];
  for (let base = template.extends; base !== undefined && !bases.includes(base); base = byKind.get(base)?.extends) {
    bases.push(base);
  }
  return bases;
}
// a template merged with its base, its base merged first
function extended(template: Template, byKind: ReadonlyMap<string, Template>): Template {
  if (template.extends === undefined) {
    return template;
  }
  const base = extended(byKind.get(template.extends)!, byKind); // handed in, no loop: as checked
  const form = template.form ?? base.form;
  return {
    kind: template.kind,
    ...(form !== undefined && { form }),
    inputs: template.inputs ?? base.inputs ?? [],
    outputs: template.outputs ?? base.outputs ?? [],
    ...joined(base, template),
  };
}
// a base's children, wires, macros and pools first, then the template's own
function joined(base: Template, template: Template): Pick<Template, 'children' | 'wires' | 'macros' | 'pools'> {
  return {
    children: [...(base.children ?? []), ...(template.children ?? [])],
    wires: [...(base.wires ?? []), ...(template.wires ?? [])],
    macros: [...(base.macros ?? []), ...(template.macros ?? [])],
    pools: [...(base.pools ?? []), ...(template.pools ?? [])],
  };
}
