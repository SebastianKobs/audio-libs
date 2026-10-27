# modular-audio/view/device/readout

What a device view reads of a plan, and what it sends: the plan's values, starts, roles, slots, copies and meters by address, read when they're wanted, and each edit sent as a message for the plan on a bus. Whatever answers a readout fits it by its shape; a view never plays into the sound itself.

Depends on: `base/util`, `modular-audio/plan/format`.

```ts
import type { Plan } from '../../../plan/format/index.ts';
import { PresetReadout } from './index.ts';

declare const plan: Plan;
const readout = new PresetReadout({
  plan: () => plan, // the plan at the preset as it is now
  values: () => ({ 'osc 1/tune': 12 }), // the preset's values by address, now
  start: () => ({ 'osc 1/tune': 0 }), // and as it began, which a reset brings back
});
readout.valueOf(['osc 1', 'tune']); // 12
readout.startOf(['osc 1', 'tune']); // 0
readout.roleOf(['osc 1', 'tune']); // { by: 'live' }, where no macro moves it
```

| Export | What it does |
|---|---|
| `PlanReadout`: `plan`, `valueOf()`, `startOf()`, `roleOf()`, `peakOf()`, `readingOf()`, `copiesOf()`, `slotOf()` | What the views read of a plan as it plays, by address: its values, starts, roles, slots, copies and meters (`plan.ts`). |
| `Role` | How a value is set: `live`, here in a view; `automated`, by what its track plays (its source where it names one, `recorded` where its automation is in the arrangement's lanes); or `fixed`, as built (`plan.ts`). |
| `Slot` | What a device does in its slot (`job`) and what sets it there, where its notes or its owner do (`setBy`) (`plan.ts`). |
| `Command` | What's done in a view, by address: a param's value, which its owner records through the sequencer and sets, or a setting's, which builds what's built again, not recorded (`plan.ts`). |
| `new PresetReadout(owner)`: `plan`, `valueOf()`, `startOf()`, `roleOf()` | A plan's readout for a plan whose values a preset gives, as a patch gives its voice card's: each value the preset's, its start as it began. How it's set is its owner's word, else the macro that moves it, else live; it hears no sound, holds no copies and fills no slots (`preset.ts`). |

Tests: none of its own, as types and a thin reader: the models' tests drive it (`libs/modular-audio/view/device/models/test/moves.test.js`).
