// ---------- plan/planner/check: a template checked as the planner is handed it ----------
// Well-formed, every template alike:
//   1. its children's names one of a kind, each child's kind known, none holding the template;
//   2. the values and settings a child changes there inside it;
//   3. each wire's ends there: an input, an output, a param;
//   4. each macro's targets params inside; a voice's note's addresses too.
// Every failure said, plainly: its template, its child or wire, its rule.
import { addressOf, addressText, type Wire, type WireFrom, type WireTo } from '../format/index.ts';
import type { Kinds } from './kinds.ts';
import type { Template, TemplateChild } from './template.ts';

// what a note sets in a voice
const NOTE_SOURCES = ['pitch', 'velocity', 'gate'] as const;

// What's wrong with a template, each failure a line; none where it's well-formed.
export function problemsIn(template: Template, kinds: Kinds): string[] {
  const children = kinds.childrenOf(template);
  const problems = [
    ...namesTwice(children),
    ...children.flatMap((child) => childProblems(child, template, kinds)),
    ...wiresOf(template).flatMap((wire) => wireProblems(wire, template, kinds)),
    ...macroProblems(template, kinds),
    ...noteProblems(template, kinds),
  ];
  return problems.map((problem) => `${template.kind}: ${problem}`);
}

// a name two children have, said once, at the first
function namesTwice(children: readonly TemplateChild[]): string[] {
  const names = children.map((child) => child.name);
  return names
    .filter((name, index) => names.indexOf(name) === index && names.lastIndexOf(name) !== index)
    .map((name) => `${name}: a name two children have`);
}
// a child's kind unknown, or holding the template; a value or a setting it changes not there
function childProblems(child: TemplateChild, template: Template, kinds: Kinds): string[] {
  if (!kinds.outsideOf(child.kind)) {
    return [`${child.name}: no block or template ${child.kind}`];
  }
  const holding = pathTo(template.kind, child.kind, kinds, []);
  if (holding) {
    return [`${child.name}: holds itself, through ${holding.join(' → ')}`];
  }
  return [
    ...Object.keys(child.values ?? {})
      .filter((key) => !kinds.paramIn(child.kind, addressOf(key)))
      .map((key) => `${child.name}: no param ${key} to change`),
    ...Object.keys(child.settings ?? {})
      .filter((key) => !kinds.settingIn(child.kind, addressOf(key)))
      .map((key) => `${child.name}: no setting ${key} to change`),
  ];
}
// the kinds from a child's kind down to the template it's in, where it holds it; none where it doesn't
function pathTo(held: string, kind: string, kinds: Kinds, seen: readonly string[]): string[] | undefined {
  if (kind === held) {
    return [...seen, kind];
  }
  const template = kinds.template(kind);
  if (!template || seen.includes(kind)) {
    return undefined;
  }
  for (const child of kinds.childrenOf(template)) {
    const path = pathTo(held, child.kind, kinds, [...seen, kind]);
    if (path) {
      return path;
    }
  }
  return undefined;
}
// a template's wires, its pools' among them
function wiresOf(template: Template): Wire[] {
  return [...(template.wires ?? []), ...(template.pools ?? []).flatMap((pool) => pool.wires)];
}
// each end of a wire there
function wireProblems({ from, to }: Wire, template: Template, kinds: Kinds): string[] {
  return [fromProblem(from, template, kinds), toProblem(to, template, kinds)].filter(
    (problem) => problem !== undefined,
  );
}
function fromProblem(from: WireFrom, template: Template, kinds: Kinds): string | undefined {
  if (!('node' in from)) {
    const there = (template.inputs ?? []).some((input) => input.name === from.input);
    return there ? undefined : `a wire from in ${from.input}: no such input`;
  }
  const outside = outsideOfChild(from.node, template, kinds);
  if (!outside) {
    return `a wire from ${from.node}: no such child`;
  }
  return outside.outputs.includes(from.output) ? undefined : `a wire from ${from.node}: no output ${from.output}`;
}
function toProblem(to: WireTo, template: Template, kinds: Kinds): string | undefined {
  if (!('node' in to)) {
    const there = (template.outputs ?? []).some((output) => output.name === to.output);
    return there ? undefined : `a wire into out ${to.output}: no such output`;
  }
  const outside = outsideOfChild(to.node, template, kinds);
  if (!outside) {
    return `a wire into ${to.node}: no such child`;
  }
  if ('param' in to) {
    return outside.params.includes(to.param) ? undefined : `a wire into ${to.node}: no param ${to.param}`;
  }
  return outside.inputs.includes(to.input) ? undefined : `a wire into ${to.node}: no input ${to.input}`;
}
// what a child shows from outside, by its name, the first of that name; none where there's no such child
function outsideOfChild(name: string, template: Template, kinds: Kinds): ReturnType<Kinds['outsideOf']> {
  const child = kinds.childrenOf(template).find((each) => each.name === name);
  return child && kinds.outsideOf(child.kind);
}
// each macro's targets params inside: a child's by its name, then within it
function macroProblems(template: Template, kinds: Kinds): string[] {
  return (template.macros ?? []).flatMap((macro) =>
    macro.maps
      .filter((target) => !paramInside(target.to, template, kinds))
      .map((target) => `macro ${macro.spec.name}: ${addressText(target.to)} is no param`),
  );
}
// a voice's note's addresses params inside its pool's child
function noteProblems(template: Template, kinds: Kinds): string[] {
  return (template.pools ?? []).flatMap(({ child, note }) =>
    NOTE_SOURCES.flatMap((source) =>
      (note?.[source] ?? [])
        .filter((address) => !kinds.paramIn(child.kind, address))
        .map((address) => `pool ${child.name}: its note's ${source} into ${addressText(address)}, no param`),
    ),
  );
}
// whether an address within a template reaches a param of a child inside it
function paramInside([name, ...rest]: readonly string[], template: Template, kinds: Kinds): boolean {
  const child = kinds.childrenOf(template).find((each) => each.name === name);
  return child !== undefined && kinds.paramIn(child.kind, rest);
}
