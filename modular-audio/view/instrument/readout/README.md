# modular-audio/view/instrument/readout

The instruments as the device view reads them, on a device's readout, in the device view's words: the patch each role plays and a role's cards, read when the instruments' models want them. What's done goes out on a bus as each plan's message.

Depends on: `modular-audio/view/device/readout`.

```ts
import type { InstrumentCard, InstrumentsReadout } from './index.ts';

declare const cardOfPluck: InstrumentCard;
const readout: InstrumentsReadout = {
  instruments: { tap: 'pluck' }, // the patch each role plays
  cardsOf: (role) => (role === 'tap' ? [cardOfPluck] : []), // a role's cards, one for each patch it plays
};
```

| Export | What it does |
|---|---|
| `InstrumentsReadout`: `instruments`, `cardsOf()` | The instruments as the device view asks for them: the patch each role plays, and a role's instrument's cards, one for each patch it plays (`instruments.ts`). |
| `InstrumentCard` | A card of an instrument: the patch it edits, a drum rack's pad's key, its plan's readout and its `send`, which sends what's done on it as a message on a bus (`instruments.ts`). |

Tests: none, as types only: what answers them is tested in `modular-audio/view/instrument/models/test/cards.test.js`.
