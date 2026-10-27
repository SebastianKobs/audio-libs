# modular-audio/view/instrument/models

An instrument's view models, no DOM, on a device's: the cards an instrument's patches are edited on, and the racks the device view shows each role's instrument in.

Depends on: `base/util`, `modular-audio/plan/format`, `modular-audio/plan/instrument`, `modular-audio/plan/planner`, `modular-audio/view/device/models`, `modular-audio/view/device/readout`, `modular-audio/view/instrument/readout`.

```ts
import type { InstrumentsReadout } from '../readout/index.ts';
import { InstrumentRacks } from './index.ts';

declare const instrumentsReadout: InstrumentsReadout;
declare const clock: { now(): number };
const racks = new InstrumentRacks({
  instrumentsReadout, // the patch each role plays, its cards
  clock,
  send: (message) => console.log(message.type), // a reset and the test note go out on a bus
  starts: {}, // the test note's own values as it starts, over their defaults
});
racks.rackOf('tap')?.status; // 'tap: pluck', the role and the patch it plays
racks.press('tap'); // sends 'test note', held until its button is let go
racks.lift(); // sends 'test note released'
```

| Export | What it does |
|---|---|
| `new InstrumentCards({ instruments, bank, send })`: `of()` | An instrument's patches as the device view edits them. `of(patch, over?)` gives a card for the patch, or for each pad of a drum rack by its key, a preset's readout on its voice card whose edits go out as the bank's messages (`cards.ts`). |
| `CardValues` | Values from outside over a card's own, as a knob sets them, and what sets them: `values()` and `source` (`cards.ts`). |
| `new InstrumentRacks({ instrumentsReadout, clock, send, starts })`: `rackOf()`, `reset()`, `press()`, `lift()`, `reads()`, `readersOf()`, `note`, `values` | The instruments as the device view shows them. `rackOf(role)` is a role's instrument as a rack of its cards, a pad each by its key and its patch, none with no cards; `reset()` puts every card of its patches back, as messages on a bus (`instrument-racks.ts`). |
| `InstrumentRack` | A role's instrument as a rack: its `key`, its `status`, the patch it plays, and its `pads`, each with its models (`instrument-racks.ts`). |

A card edits the patch in the bank, not an instrument playing it. The test note's pitch and velocity (`note`) are MIDI 1.0's at the edge. Its own values (`values`) start from their defaults with `starts` handed in over them. `press()` holds it from a little after now until `lift()`, both sent as messages on a bus. `reads()` says whether a role's instrument reads one of the note's own values, and `readersOf()` which instruments do, so its row can gray the others.

Tests: `test/cards.test.js` and `test/instrument-racks.test.js`: a card for each patch with its values and their sends; the racks, the reset, the test note and which values each instrument reads.
