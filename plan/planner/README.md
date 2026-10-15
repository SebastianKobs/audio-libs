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
    macros: [{ spec: { name: 'level', range: [0, 2, 0.01] }, value: 1, maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }] }],
  },
]);                                                         // each template checked as it's handed in
planner.plan('Utility', { name: 'utility', values: { level: 0.5 }, settings: { 'pan/law': 'pan pot' } });
```

How a plan is made:
1. a block's params and settings its specs, each at its value: given by its address, written in the template, or its default; one with none refused, naming it;
2. a child's template planned into it, its values by their addresses within it;
3. a macro's value onto its targets: a param a macro moves is the macro's, whatever else is given for it;
4. a jack's channels as they come, where its block doesn't fix them: an input the most of what's wired into it, an output the most of its node's inputs, worked out again until a loop settles, mono where nothing comes;
5. a pool's child ready, as each copy will be, its wires and its note's addresses kept.

No note: a voice's note sets its params as it plays.

| | |
|---|---|
| `Planner`, `Asked` | handed the templates once, each checked, every failure said at once (`templates not well-formed:`, a line each); `plan(kind, { name, values, settings })`, a plan for a template, its top node named as asked, its kind's unless, its values and settings changed by address, a preset's; a template not handed in refused (`planner.ts`) |
| `Template`, `TemplateChild`, `TemplatePool`, `ValuesByAddress` | a template, by its kind, the form it fulfils where it has one, its jacks, children, wires, macros and pools, a list it doesn't write none; a child by its name and kind, its role, the values and settings it changes; a pool, its child, its copies' wires, a voice's note (`template.ts`) |
| `problemsIn(template, kinds)` | a template well-formed: its children's names one of a kind, each child's kind known, none holding the template, the values and settings a child changes there, each wire's ends there, each macro's targets params inside, a voice's note's addresses too (`check.ts`) |
| `Kinds` | the kinds a template names: a block's or a template's jacks, params and settings as seen from outside, a template's macros its params; whether an address within a kind reaches a param or a setting (`kinds.ts`) |
| `withChannels()` | a loose jack's channels, as they come (`channels.ts`) |

Tested in node, in its `test/` folder, on small templates (`test/templates.js`): the Utility planned as `libs/plan/format/`'s tests wrote it out by hand, so the two are held to each other; values and settings by address, a macro onto its targets; a template of templates; a pool's child; channels through a loop; a value with no default refused; every failure of a broken template said (`test/planner.test.js`).
