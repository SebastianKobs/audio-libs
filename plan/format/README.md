# plan/format

What a plan is: the data the builder and the views are handed, and read without the planner. A package of its own since LAY5a, the first of `libs/plan/`. Timeless: what to build, its values and settings as it starts. It describes itself, so nothing else is needed to build it or show it. Stored as JSON.

One kind of thing, a node, with an optional inside:
- **a block**, no inside: its kind the block's, `oscillator`, `gain`, `pan`;
- **a composite**, an inside: its kind its template's, `Utility`; its children by name, the wires between them, its macros (its own params) and its pools.

```ts
import type { Plan } from './index.ts';
const utility: Plan = {
  version: 1,
  node: {
    name: 'utility', kind: 'Utility',
    inputs: [{ name: 'in', channels: 2 }], outputs: [{ name: 'out', channels: 2 }],
    params: [], settings: [],
    inside: {
      children: [gain, pan],                                    // each a node, named
      wires: [
        { from: { input: 'in' }, to: { node: 'gain', input: 'in' } },   // the parent's own input
        { from: { node: 'gain', output: 'out' }, to: { node: 'pan', input: 'in' } },
        { from: { node: 'pan', output: 'out' }, to: { output: 'out' } },
      ],
      macros: [{ spec: { name: 'level', range: [0, 4, 0.01] }, value: 1, maps: [{ to: ['gain', 'gain'], factor: 1, offset: 0 }] }],
      pools: [],
    },
  },
};
```

| | |
|---|---|
| `Plan` | a plan: its format's version, and its top node, whatever was asked for, an instrument, a channel, a whole studio; every address starts there (`plan.ts`) |
| `Node` | a node: its name, one of a kind in its parent; its kind, a block's or a template's; the form it fulfils and its role in its parent, where they're given; its inputs, outputs, params and settings; its inside, a composite's (`node.ts`) |
| `Input`, `Output`, `Channels` | a node's input or output: its name and its channels, mono or stereo; a tap is an output (`input-output.ts`) |
| `Param`, `Setting` | the same shape: its spec whole (`libs/params/`), its value as it starts, a number or one of its choices, its hint; a param edited or automated as it plays, a setting chosen as it's built, a change a rebuild (`param.ts`) |
| `Inside` | a composite's: its children in the plan's order, its wires, its macros, its pools (`inside.ts`) |
| `Wire`, `WireFrom`, `WireTo` | from a child's output or the parent's own input, into a child's input, a child's param (modulation) or the parent's own output; by names within one inside (`wire.ts`) |
| `Macro`, `MacroTarget` | a composite's own param, a number, mapped onto its children's by their addresses: times a factor, held in a range, plus an offset (`macro.ts`) |
| `mapOnto(target, value)`, `macroValues(macro, value)` | a value mapped onto a target, the synth's terms on it too (`libs/synth/`'s `mappedValue()`); a macro's value onto each of its targets, as a builder sets them, its own unless given one (`macro.ts`, LAY5b) |
| `Pool`, `NoteAddresses` | children that come and go: the child ready, named as the pool; the wires each copy is wired by; a copy named the pool's name and its number from 1; a pool of voices, the addresses its notes set, pitch, velocity and gate (`pool.ts`) |
| `copyOf(pool, number)`, `poolOfCopy(inside, name)` | a pool's copy, its child under the copy's name, its wires with the copy's name for the pool's, numbered from 1; the pool a copy is of, by the copy's name (`pool.ts`, LAY5b) |
| `Address`, `addressText()`, `addressOf()`, `under(name, address)` | where a param or a setting is: its path by names from under the plan's top node, written with slashes, `desk/channel 3/utility/level`, and back; a parent's name put in front; a name with a slash refused (`address.ts`) |
| `nodeAt(plan, names)`, `paramAt(plan, address)`, `settingAt(plan, address)` | found by its address, walked down by names, a pool's copy by its name and number: a node; a param, a node's own or a composite's macro; a setting; none where nothing's there (`param-at.ts`, LAY5b) |
| `reached(inside, names, through)`, `feeds(inside, from, to)` | what feeds what over one inside's wires, its children not opened: what the names reach, they among it, a wire into a param too, only the wires `through()` lets through; whether one reaches another, itself among it, the loop check (`routing.ts`, LAY5b) |
| `VERSION`, `versionOf(stored)` | this format's version, 1; a stored plan's, read as it's loaded, one with none, not a whole number or newer refused, naming what it found (`version.ts`) |

Tested in node, in its `test/` folder: its examples, an effect, an instrument and a desk, typed as plans so the type check holds them to the format (`test/plans.ts`), stored as JSON and read back; the version; addresses, what's found by them, macros, pools' copies and what feeds what on them (`test/format.test.js`).
