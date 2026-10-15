// ---------- plan/planner/check: a template checked as the planner is handed it ----------
// Held to its form where it names one (form-check.ts), once it's well-formed, every template alike:
//   1. its children's names one of a kind, its macros' too, each child's kind known, none holding the template;
//   2. the values and settings a child changes there inside it;
//   3. each wire's ends there: an input, an output, a param;
//   4. each macro named, its targets params inside, one at least where it has no spec of its own;
//      a voice's note's addresses params inside too.
// Then, once every template is, a spec followed down safely, past no template holding itself:
//   5. each macro onto a choice: its choices the choice's own, as it moves it by position.
// Every failure said, plainly: its template, its child or wire, its rule.
import { addressOf, addressText, type Wire, type WireFrom, type WireTo } from '../format/index.ts';
import type { Form } from './form.ts';
import { formProblems } from './form-check.ts';
import type { Kinds } from './kinds.ts';
import type { Template, TemplateChild } from './template.ts';

// what a note sets in a voice
const NOTE_SOURCES = ['pitch', 'velocity', 'gate'] as const;

// What's wrong with the templates, each failure a line: each one's own; once there are none,
// each macro onto a choice with other choices than the choice's.
export function problemsInAll(
  templates: readonly Template[],
  kinds: Kinds,
  forms: ReadonlyMap<string, Form>,
): string[] {
  const problems = templates.flatMap((template) => problemsIn(template, kinds, forms));
  if (problems.length) {
    return problems;
  }
  return templates.flatMap((template) =>
    choiceProblems(template, kinds).map((problem) => `${template.kind}: ${problem}`),
  );
}

// What's wrong with a template, each failure a line: not well-formed, or, once it is, its form
// not handed in or not fulfilled; none where it's well-formed and fulfils its form.
function problemsIn(template: Template, kinds: Kinds, forms: ReadonlyMap<string, Form>): string[] {
  const problems = wellFormedProblems(template, kinds);
  if (!problems.length && template.form !== undefined) {
    const form = forms.get(template.form);
    problems.push(...(form ? formProblems(template, form, kinds) : [`no form ${template.form}`]));
  }
  return problems.map((problem) => `${template.kind}: ${problem}`);
}

// what keeps a template from being well-formed
function wellFormedProblems(template: Template, kinds: Kinds): string[] {
  const children = kinds.childrenOf(template);
  return [
    ...namesTwice(children.map((child) => child.name)).map((name) => `${name}: a name two children have`),
    ...namesTwice((template.macros ?? []).map((macro) => macro.name)).map(
      (name) => `macro ${name}: a name two macros have`,
    ),
    ...children.flatMap((child) => childProblems(child, template, kinds)),
    ...wiresOf(template).flatMap((wire) => wireProblems(wire, template, kinds)),
    ...macroProblems(template, kinds),
    ...noteProblems(template, kinds),
  ];
}

// each name given twice or more, once, where it's first given
function namesTwice(names: readonly string[]): string[] {
  return names.filter((name, index) => names.indexOf(name) === index && names.lastIndexOf(name) !== index);
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
// each macro named; its targets params inside, a child's by its name, then within it; a target
// to take its spec from where it has none
function macroProblems(template: Template, kinds: Kinds): string[] {
  return (template.macros ?? []).flatMap((macro) => {
    if (typeof macro.name !== 'string') {
      return ['a macro with no name']; // as YAML may write it
    }
    if (!macro.spec && !macro.maps.length) {
      return [`macro ${macro.name}: no spec, and no target to take one from`];
    }
    return macro.maps
      .filter((target) => !paramInside(target.to, template, kinds))
      .map((target) => `macro ${macro.name}: ${addressText(target.to)} is no param`);
  });
}
// Each macro onto a choice: its own choices the same, in the same order.
// It moves a choice by position: another list, or none, would land on other words.
function choiceProblems(template: Template, kinds: Kinds): string[] {
  return (template.macros ?? []).flatMap((macro) => {
    const own = kinds.macroSpec(template, macro)?.choices ?? [];
    return macro.maps
      .filter(({ to }) => {
        const choices = kinds.paramSpecIn(template.kind, to)?.choices;
        return choices !== undefined && !sameChoices(own, choices);
      })
      .map(({ to }) => `macro ${macro.name}: its choices not those of ${addressText(to)}, which it moves by position`);
  });
}
// two lists of choices the same, in the same order
function sameChoices(one: readonly string[], other: readonly string[]): boolean {
  return one.length === other.length && one.every((choice, index) => choice === other[index]);
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
