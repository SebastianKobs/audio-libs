# dsp/crusher

A bit and sample-rate reducer on sample arrays, free of any audio API. `crushed()` takes a sample each time its rate's phase runs out, the first at once, holds it until the next, and rounds it to a step of 2 / 2^bits, so full scale from -1 to 1 is 2^bits steps: the sampler's aliasing and a toy's grit. Bits come in fractions, 16 near clean and 4 a grit; the rate is how often a sample is taken, in Hz, an SP-1200's at 26 kHz. The state it keeps, where its rate's phase is and the sample it holds, is handed in, so a signal crushed in blocks comes out as it would whole. A `Crusher` keeps a state for each channel of a block, and a channel with no input is silent.

Depends on: nothing.

```ts
import { Crusher, crushed } from './index.ts';

const output = new Float32Array(128);
crushed(new Float32Array(128), output, { phase: 0, held: 0 }, { bits: 6, rate: 26000, sampleRate: 48000 });

const crusher = new Crusher({ sampleRate: 48000 });
const blocks = [new Float32Array(128), new Float32Array(128)];
crusher.render([new Float32Array(128), undefined], blocks, { bits: 4, rate: 12000 }); // the second channel silent
```

| Export | What it does |
|---|---|
| `crushed()` | One channel crushed into an array, its state carried to the next block (`crusher.ts`). |
| `Crusher` | A block of channels crushed, a state a channel kept from block to block (`crusher.ts`). |
| `CrusherState`, `CrusherSettings` | What a channel carries between blocks, and the bits, the rate and the sample rate a block is crushed at (`crusher.ts`). |

Tests: `test/crusher.test.js`, a sine at 16 bits passing as it came, the steps of 3 and 6 bits on a ramp, the held sample changing as often as the rate says, a state carried across blocks, and a block of channels crushed apart.
