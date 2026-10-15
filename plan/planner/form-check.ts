// ---------- plan/planner/form-check: a template held to its form ----------
// Each failure said plainly, in this order:
//   1. its inputs and outputs the form's, where it names them;
//   2. each child's role: there, one of the form's, of its kind or form, where it names roles;
//   3. how many of each role, at least and at most;
//   4. the roles in their order, where the form says;
//   5. each wire one the form allows, where it lists them;
//   6. its rules: no loops; every way out ending in a role.
import { feeds, reached, type Wire, type WireFrom, type WireTo } from '../format/index.ts';
import type { Form, FormFrom, FormRole, FormRule, FormTo } from './form.ts';
import type { Kinds } from './kinds.ts';
import type { Template, TemplateChild } from './template.ts';

// What's wrong with a template, held to its form; none where it fulfils it.
export function formProblems(template: Template, form: Form, kinds: Kinds): string[] {
  const children = template.children ?? [];
  const pooled = (template.pools ?? []).map((pool) => pool.child);
  const roles = form.roles ?? [];
  const problems = [
    ...jackProblems(template, form),
    ...(form.roles ? [...children, ...pooled].flatMap((child) => roleProblems(child, roles, kinds)) : []),
    ...roles.flatMap((role) => countProblems(role, children)),
    ...(form.ordered ? orderProblems(children, form) : []),
    ...wireProblems(template, form),
    ...(form.rules ?? []).flatMap((rule) => ruleProblems(rule, template)),
  ];
  return problems.map((problem) => `form ${form.name}: ${problem}`);
}

// its inputs and outputs by name, in order, those the form names
function jackProblems(template: Template, form: Form): string[] {
  return (['inputs', 'outputs'] as const).flatMap((side) => {
    const wanted = form[side];
    const names = (template[side] ?? []).map((jack) => jack.name).join(', ');
    if (wanted === undefined || names === wanted.join(', ')) {
      return [];
    }
    return [`its ${side} ${names || 'none'}, where the form has ${wanted.join(', ') || 'none'}`];
  });
}
// a child's role there, one of the form's, its kind or form the role's
function roleProblems(child: TemplateChild, roles: readonly FormRole[], kinds: Kinds): string[] {
  if (child.role === undefined) {
    return [`${child.name}: no role`];
  }
  const role = roles.find((each) => each.role === child.role);
  if (!role) {
    return [`${child.name}: no role ${child.role} in it`];
  }
  if (role.kind !== undefined && child.kind !== role.kind) {
    return [`${child.name}: a ${child.kind}, not a ${role.kind}`];
  }
  if (role.form !== undefined && kinds.template(child.kind)?.form !== role.form) {
    return [`${child.name}: a ${child.kind}, not of form ${role.form}`];
  }
  return [];
}
// how many children play a role: at least and at most so many
function countProblems({ role, least = 0, most = Infinity }: FormRole, children: readonly TemplateChild[]): string[] {
  const count = children.filter((child) => child.role === role).length;
  if (count < least) {
    return [`role ${role}: ${count} children, at least ${least}`];
  }
  if (count > most) {
    return [`role ${role}: ${count} children, at most ${most}`];
  }
  return [];
}
// each child after those of a later role out of order, said against the latest role before it
function orderProblems(children: readonly TemplateChild[], form: Form): string[] {
  const roles = form.roles ?? [];
  const placeOf = (role: string | undefined): number => roles.findIndex((each) => each.role === role);
  const problems: string[] = [];
  let latest = -1;
  for (const child of children.filter((each) => placeOf(each.role) !== -1)) {
    const place = placeOf(child.role);
    if (place < latest) {
      problems.push(`${child.name}: its role ${child.role} after ${roles[latest]!.role}, out of order`);
    }
    latest = Math.max(latest, place);
  }
  return problems;
}
// each wire one the form allows, by the roles at its ends; any where the form lists none
function wireProblems(template: Template, form: Form): string[] {
  const allowed = form.wires;
  if (!allowed) {
    return [];
  }
  const roleOf = (name: string): string | undefined =>
    [...(template.children ?? []), ...(template.pools ?? []).map((pool) => pool.child)].find(
      (child) => child.name === name,
    )?.role;
  return wiresOf(template)
    .filter(({ from, to }) => !allowed.some((wire) => fromFits(wire.from, from, roleOf) && toFits(wire.to, to, roleOf)))
    .map(({ from, to }) => `a wire from ${endName(from)} into ${endName(to)}: not allowed`);
}
// a template's wires, its pools' among them
function wiresOf(template: Template): Wire[] {
  return [...(template.wires ?? []), ...(template.pools ?? []).flatMap((pool) => pool.wires)];
}
// whether a wire's start fits a form's: the parent's own input, or a role's main output or a tap
function fromFits(allowed: FormFrom, from: WireFrom, roleOf: (name: string) => string | undefined): boolean {
  if ('parent' in allowed) {
    return !('node' in from);
  }
  if (!('node' in from)) {
    return false;
  }
  const output = from.output === 'out' ? 'out' : 'tap';
  return roleOf(from.node) === allowed.role && output === allowed.output;
}
// whether a wire's end fits a form's: the parent's own output, or a role's input, or its param where the form says
function toFits(allowed: FormTo, to: WireTo, roleOf: (name: string) => string | undefined): boolean {
  if ('parent' in allowed) {
    return !('node' in to);
  }
  if (!('node' in to)) {
    return false;
  }
  return roleOf(to.node) === allowed.role && 'param' in to === (allowed.param ?? false);
}
// a wire's end as a failure names it: a child by its name, the parent's own by its jack
function endName(end: WireFrom | WireTo): string {
  if ('node' in end) {
    return end.node;
  }
  return 'input' in end ? `in ${end.input}` : `out ${end.output}`;
}
// a rule held: no loops through any child; every child's way out, by its main outputs, ending in the role, where there's one
function ruleProblems(rule: FormRule, template: Template): string[] {
  const children = template.children ?? [];
  const inside = { wires: template.wires ?? [] };
  if (rule.rule === 'no loops') {
    return children
      .filter((child) =>
        inside.wires.some(
          ({ from, to }) => fromChild(from) === child.name && 'node' in to && feeds(inside, to.node, child.name),
        ),
      )
      .map((child) => `a loop through ${child.name}`);
  }
  const ends = new Set(children.filter((child) => child.role === rule.role).map((child) => child.name));
  if (!ends.size) {
    return []; // none to end in: said as too few
  }
  const mainOut = (wire: Wire): boolean => 'output' in wire.from && wire.from.output === 'out';
  return children
    .filter((child) => !ends.has(child.name))
    .filter((child) => ![...reached(inside, [child.name], mainOut)].some((name) => ends.has(name)))
    .map((child) => `${child.name}: its way out doesn't end in the ${rule.role}`);
}
// the child a wire comes from; none for the parent's own input
function fromChild(from: WireFrom): string | undefined {
  return 'node' in from ? from.node : undefined;
}
