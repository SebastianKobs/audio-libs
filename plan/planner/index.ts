// ---------- plan/planner: templates made into plans ----------
// A plan for whatever is asked, once, before anything plays; used by the tool, and by an
// editor later, never by a builder or a view.
// Its parts:
//   - template.ts: a composite's description, written short, and a preset on one; shape.ts, either read
//     from data, its shape checked; extend.ts, a template built on another, merged;
//   - planner.ts: the planner, handed the templates once, a plan for any of them;
//   - check.ts: a template checked well-formed as it's handed in, then held to its form, every failure said;
//   - form.ts: the constraints a template has to fulfil, as data; form-check.ts, a template held to its form;
//   - kinds.ts: the kinds a template names, blocks and templates, as seen from outside;
//   - channels.ts: a jack's channels as they come, where its block doesn't fix them.
export { Planner, type Asked } from './planner.ts';
export type { Preset, Template, TemplateChild, TemplateMacro, TemplatePool } from './template.ts';
export { presetsOf, templateOf } from './shape.ts';
export type { Form, FormFrom, FormRole, FormRule, FormTo, FormWire } from './form.ts';
