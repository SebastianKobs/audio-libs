# dsp/operator-levels

A Yamaha DX's levels as the numbers an FM operator kernel takes. The published patches give a modulator's level from 0 to 99 and a feedback from 0 to 7. `sixOperatorIndex()` and `fourOperatorIndex()` turn the level into a modulation index in radians: the chip's top at total level 0, 0.75 dB down a step. `operatorFeedback()` turns the feedback into a share of the operator's own output. The six-operator top is Chowning and Bristow's pi times 2 to the 33/16, 13.1227 radians; the four-operator top, 8 pi, is one forum post's and should be checked against the chip's manual. A four-operator chip's level is assumed to map to total level as a six-operator one's does.

Depends on: nothing.

```ts
import { fourOperatorIndex, operatorFeedback, sixOperatorIndex, totalLevel } from './index.ts';

const loudest = sixOperatorIndex(99); // 13.1227 radians
const quieter = sixOperatorIndex(80); // 2.5298 radians
const four = fourOperatorIndex(99); // 25.1327 radians, 8 pi
const feedback = operatorFeedback(6); // 0.25
const step = totalLevel(10); // 96, from the table under level 20
```

| Export | What it does |
|---|---|
| `totalLevel()` | A level from 0 to 99 as the chip's total level, 0 the loudest: 99 less the level from 20 up, a table under it (`operator-levels.ts`). |
| `TOTAL_LEVEL_UNDER_20` | The total level of levels 0 to 19, 127 less Dexed's table (`operator-levels.ts`). |
| `sixOperatorIndex()` | A modulator's level 0 to 99 on a six-operator chip as its index in radians (`operator-levels.ts`). |
| `fourOperatorIndex()` | The same on a four-operator chip (`operator-levels.ts`). |
| `operatorFeedback()` | A feedback 0 to 7 as the kernel's share of the operator's own output: 0 at 0, else 2 to the power of the feedback less 8 (`operator-levels.ts`). |

Tests: `test/operator-levels.test.js`, the total level and its table under 20, the six-operator index against the published table from level 99 down to 0, the four-operator index, and the feedback.
