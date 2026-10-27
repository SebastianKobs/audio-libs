# modular-audio/view/instrument/dom

Each role's instrument drawn in the DOM as a device, on a device's drawers, from the instruments' model. The test note has its button here.

Depends on: `base/html`, `modular-audio/view/device/dom`, `modular-audio/view/instrument/models`.

```ts
import type { InstrumentRacks } from '../models/index.ts';
import { InstrumentDevices } from './index.ts';

declare const racks: InstrumentRacks;
const devices = new InstrumentDevices({
  racks,
  look: {
    own: 'Voice', // its voice card's own group's title
    groups: new Map([['source', 'Sources']]), // its modules' groups by role, each its title
    play: { label: 'Play', title: 'Play a test note while held' },
    reset: { label: 'Reset', title: 'Back to how the patch began' },
  },
  head: (element) => element.append('the test note row'), // drawn in the device view's head
  shown: (roles) => console.log(roles), // the roles whose instruments are shown
});
```

| Export | What it does |
|---|---|
| `new InstrumentDevices({ racks, look, head, shown })`: `fill()`, `head()` | Each role's instrument as a device, a chain of the device view's: its bar, the test note's button held as long as it is, its reset, a tab for each pad of a drum rack, the card's face and matrix. `shown()` is told which instruments are shown each time one is, to gray what none of them reads (`instrument-devices.ts`). |
| `InstrumentLook` | How an instrument is shown, in its owner's words: the title of its own group, its modules' groups by role, the test note's button and the reset, each its label and hint (`instrument-devices.ts`). |

Tests: none of its own; the end-to-end tests drive the device view (`mockup/test/e2e/device-view.spec.js`).
