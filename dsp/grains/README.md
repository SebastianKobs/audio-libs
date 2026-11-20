# dsp/grains

Granular freeze and smear on sample arrays, free of any audio API. A `GrainCloud` keeps its input in a ring, `memory` seconds of each channel, unless frozen, and plays short overlapping grains from it. Each grain starts a position back from now, strayed by up to its spray, reads at its pitch in semitones under a Hann window, and lasts its size; grains are spawned at their density a second, 32 sounding at most. Every channel's grains come from the same place, so the stereo image holds, and their sum is scaled by how many overlap, never much past unity. Frozen, it stops listening and the grains play what it held. The stray of each grain is drawn from the random handed in, so one random gives one cloud.

Depends on: `base/util`, in its tests alone.

```ts
import { GrainCloud } from './index.ts';

const cloud = new GrainCloud({ sampleRate: 48000, memory: 2, random: Math.random });
const heard = new Float32Array(128);
cloud.render([new Float32Array(128)], [heard], 128, { freeze: 0, position: 0.25, size: 0.08, density: 12, pitch: 0, spray: 0.02 });
```

| Export | What it does |
|---|---|
| `GrainCloud` | The ring and its grains: `render(inputs, outputs, frames, params)` keeps a block of input and sums its grains into the outputs; `spawned` counts the grains started so far (`grain-cloud.ts`). |
| `GrainCloudSetup`, `GrainParams` | What a cloud is made with (`sampleRate`, `memory`, `random`), and what a block is rendered at: `freeze`, `position`, `size`, `density`, `pitch` and `spray` (`grain-cloud.ts`). |

Tests: `test/grain-cloud.test.js`, silence in and out, the level and the density of the grains, freezing, a pitch an octave up, one image across channels, one seed giving one cloud and another a different one, the default random, and the cap of 32 grains.
