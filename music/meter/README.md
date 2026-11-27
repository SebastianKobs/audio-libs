# music/meter

Musical time as a score counts it, in beats, a beat a quarter note: a meter from its grouping, a bar's grid with each beat cut in its own subdivisions, swing as a ratio, a player's timing as offsets per position, layers whose cycles cross the bar line, and beats to milliseconds at a tempo. Pure values and functions, apart from any real-time clock: `sequencing/clock/` turns time into seconds as it plays, this is the score's time.

Depends on: `base/util`.

```ts
import { barBeats, gridPositions, meterOf, resolvesAt, swungPosition, timedPosition } from './index.ts';

const meter = meterOf('3+2+2', 8); // a bar of 3.5 beats, its groups on 0, 1.5 and 2.5
barBeats(meter); // 3.5
const grid = gridPositions(meterOf('4', 4), [4, 4, 3, 2]); // 16ths, 16ths, triplets, 8ths
swungPosition(0.5, { ratio: 2, on: '8ths' }); // 2/3: the off-beat 8th on the third triplet
const laidBack = { subdivision: 4, offsets: [0, 8, 0, 12], unit: 'ms' } as const;
timedPosition(grid[1]!, laidBack, 120); // 0.266: 8 ms late at 120 bpm
resolvesAt({ length: 0.75 }, meterOf('4', 4)); // 12: a dotted 8th meets the one again after 3 bars
```

| Export | What it does |
|---|---|
| `meterOf()`, `Meter` | A meter from a grouping written as whole numbers joined by +, `3+2+2`, and a unit's note value, 4 a quarter, 8 an 8th, 16 a 16th. A grouping or a unit that isn't one is refused, saying what it got (`meter.ts`). |
| `barBeats()`, `groupStarts()` | A bar's length in beats, 3.5 for 3+2+2 in 8ths; each group's start in beats, the first on the one (`meter.ts`). |
| `pulses()`, `Pulse` | Each unit of a bar, its start and its weight: 2 the bar's one, 1 another group's start, 0 any other. The strong positions are those of weight 1 and more (`meter.ts`). |
| `gridPositions()`, `GridPosition` | A bar's grid: each beat cut in the same count or in its own, a list a count a beat, each position its start, its beat, its index in the beat and the beat's count. A short last beat keeps only what lies inside the bar (`grid.ts`). |
| `swungPosition()`, `straightPosition()`, `Swing` | Swing as a ratio on 8ths or 16ths, the first of each pair to the second, 1 straight and 2 a triplet: a straight position to where it sounds swung, and back (`swing.ts`). |
| `clockSwingOf()`, `swingRatioOf()` | A ratio as `sequencing/clock/`'s swing, 0 straight and 1 a triplet, 3(r − 1)/(r + 1); and back. Both bend time by `base/util`'s `swung()` (`swing.ts`). |
| `timingOffset()`, `timedPosition()`, `TimingTemplate` | A timing template: an offset for each index of a beat cut in so many, in beats or in ms at a tempo. A position's offset in beats, none for a beat cut otherwise; the position moved by it (`timing.ts`). |
| `layerPositions()`, `resolvesAt()`, `Layer` | A layer across the bar line, a cycle of its own length with positions inside it: its positions over a span, and the beat where a cycle and a bar first start together again, Infinity where they never do (`layer.ts`). |
| `beatsToMs()`, `msToBeats()` | Beats to milliseconds at a tempo in quarters a minute, and back (`tempo.ts`). |

Tests: `test/meter.test.js`, groupings, their bars, groups and pulses; `test/grid.test.js`, a bar's grid; `test/swing.test.js`, swing by its ratio and the clock's; `test/timing.test.js`, timing templates; `test/layer.test.js`, layers across the bar line; `test/tempo.test.js`, beats and milliseconds.
