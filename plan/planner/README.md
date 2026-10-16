# plan/planner

Templates made into plans: a plan for whatever is asked, an instrument, a channel, a whole studio, once, before anything plays. A package of its own since LAY7a. Used by the tool, and by an editor later; never by a builder or a view, which are handed the plan (`libs/plan/format/`).

A template is written as a plan's node, short: a child by its kind, a block's (`libs/plan/blocks/`) or another template's, with only the values and settings it changes; its own inputs, outputs, wires, macros and pools as the plan writes them. The planner fills in the rest.

```ts
import { Planner } from './index.ts';
const planner = new Planner([
  {
    kind: 'Utility',
    inputs: [{ name: 'in', channels: 2 }], outputs: [{ name: 'out', channels: 2 }],
    children: [{ name: 'gain', kind: 'gain' }, { name: 'pan', kind: 'pan' }],
    wires: [/* in → gain → pan → out, by names */],
    macros: [{ name: 'level', maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }] }], // its spec the gain's
  },
]);                                                         // each template checked as it's handed in
planner.plan('Utility', { name: 'utility', values: { level: 0.5 }, settings: { 'pan/law': 'pan pot' } });
```

How a plan is made:
1. a block's params and settings its specs, each at its value: given by its address, written in the template, or its default; one with none refused, naming it;
2. a child's template planned into it, its values by their addresses within it;
3. a macro's spec its own, or its first target's under its name where it writes none; its value given, written, or its spec's default; onto its targets, a choice by its index, written there as the choice: a param a macro moves is the macro's, whatever else is given for it;
4. a jack's channels as they come, where its block doesn't fix them: an input the most of what's wired into it, an output the most of its node's inputs, worked out again until a loop settles, mono where nothing comes;
5. a pool's child ready, as each copy will be, its wires and its note's addresses kept.

No note: a voice's note sets its params as it plays.

A template that names a form is held to it as it's handed in, once it's well-formed (LAY7b). A form is data: its own inputs and outputs by name, where it names them (an effect's one input and one output, LAY9a); its children by role, free of roles where it names none, each role's kind or form and how many, at least and at most; in the roles' order where it says; the wires it allows, from a role's main output or a tap, or the parent's own input, into a role's input or param, or the parent's own output; and rules by name, no loops, every way out ending in a role (the master). A channel's and a desk's forms are the desk's own (LAY10); these tests have small ones.

| | |
|---|---|
| `Planner`, `Asked` | handed the templates once, the forms and the presets beside them, each child written with a preset given the preset's kind, values and settings, its own over them, a preset not handed in said (`presets.ts`, LAY10b1), each built on another merged with it, each checked and held to its form, every failure said at once (`templates not well-formed:`, a line each); `plan(kind, { name, values, settings })`, a plan for a template, its top node named as asked, its kind's unless, its values and settings changed by address, a preset's; a template not handed in refused, and a value or a setting asked for at an address it hasn't, every one said (`planner.ts`) |
| `Form`, `FormRole`, `FormWire`, `FormFrom`, `FormTo`, `FormRule` | a form, by its name: its jacks, any where it names none; its roles, none where it names none, ordered where it says, the wires it allows, any where it lists none, its rules (`form.ts`); a template held to it, each failure said: a child's role there, the form's, of its kind or form; how many, a pool one of its role; their order; each wire one it allows; no loops; every way out, by main outputs, ending in the role, a pool's child and its wires among them (`form-check.ts`) |
| `Template`, `TemplateChild`, `TemplateMacro`, `TemplatePool`, `Preset`, `PresetChild`, `WrittenTemplate` | a template, by its kind, the template it's built on where it names one (`extends`), the form it fulfils where it has one, its jacks, children, wires, macros and pools, a list it doesn't write none; a child by its name and kind, its role, the values and settings it changes, by address (`libs/plan/format/`'s `ValuesByAddress`); a pool, its child, its copies' wires, a voice's note; a macro by its name and targets, its spec and value where it writes them; a preset on a template, its kind, its values and settings by address, as a theme writes it; a child written with a preset, and a template as written, each child by its kind or a preset (`template.ts`) |
| `extendedAll(templates)` | each template built on another merged with it before the checks: its base's jacks and form where it writes none, its base's children, wires, macros and pools first, then its own, a base on a base merged first; a base not handed in, or extensions in a loop, said (`extend.ts`, LAY9b) |
| `templateOf(data, source)`, `presetsOf(data, source)` | a template, or presets by name, read from data, YAML's, its shape checked before the planner's own check: a template's kind, form and base words, each list a list, each item an object with what it needs, a child its kind or a preset; a preset's kind a word, its values and settings by address; every failure said, naming its file; their shapes written as data beside their types, checked by `libs/util/`'s `fromData()` (`template.ts`, since LAY11d; `shape.ts`'s own checks from LAY9a) |
| `problemsInAll(templates, kinds, forms)` | each template well-formed, then held to its form where it names one, its form not handed in said: its children's names one of a kind, each child's kind known, none holding the template, the values and settings a child changes there, each wire's ends there, its macros' names one of a kind, each macro named, its targets params inside, one at least where it has no spec, a voice's note's addresses too; then, once every template is, each macro onto a choice holding that choice's own choices, in order, as it moves it by position (`check.ts`) |
| `Kinds` | the kinds a template names: a block's or a template's jacks, params and settings as seen from outside, a template's macros its params; whether an address within a kind reaches a param or a setting; a param's spec by its address, a macro's its own or its first target's (`kinds.ts`) |
| `monoOrStereo()` | whether a loose jack carries mono or stereo, as it comes (`mono-stereo.ts`, `channels.ts`'s `withChannels()` until LAY11e) |

Tested in node, in its `test/` folder, on small templates (`test/templates.js`): the Utility planned as `libs/plan/format/`'s tests wrote it out by hand, so the two are held to each other; values and settings by address, a macro onto its targets; a template of templates; a pool's child; channels through a loop; a value with no default refused; every failure of a broken template said; a desk of channels fulfilling their forms planned, and every failure of a template held to a channel's or a desk's small form said; an effect's form, its jacks; a macro's spec its target's; a macro onto a choice with other choices refused; a template's shape; a template built on another, a base not handed in, a loop; what's asked at an address the template hasn't refused; presets' shape; a child written with a preset; a form's counts and rules over its pools too (`test/planner.test.js`).
