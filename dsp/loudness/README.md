# dsp/loudness

An integrated loudness in LUFS on float channels, after ITU-R BS.1770-4: the number a streaming service or a broadcaster reads. The channels are K-weighted first, a shelf lifting the highs about 4 dB and a highpass near 38 Hz, so the number follows what is heard. The mean square of 400 ms blocks overlapping 75% is then gated, once at -70 LUFS and once 10 LU under what is left. Each filter is worked out from its analog values for the sample rate at hand, so any rate reads right and no table of one rate's coefficients is kept.

Depends on: `dsp/filters`.

```ts
import { integratedLoudness, kWeighted } from './index.ts';

const sine = Float32Array.from({ length: 20 * 48000 }, (_, i) => 0.07 * Math.sin((2 * Math.PI * 1000 * i) / 48000));
const lufs = integratedLoudness([sine, sine], 48000); // about -23, a sine at -23 dBFS in both channels
const heard = kWeighted(sine, 48000); // the samples as the meter hears them
```

How it works:

1. Each channel runs through the shelf, then the highpass, as `runBiquad()` of `dsp/filters` runs them, its state in doubles.
2. Each channel's mean square is taken over blocks of 400 ms, a block every 100 ms; the blocks' powers are summed over the channels, each weighted 1.
3. Blocks under -70 LUFS are dropped; the mean of the rest sets a gate 10 LU under it; the blocks over that gate are averaged.

| Export | What it does |
|---|---|
| `integratedLoudness()` | The loudness of channels at a sample rate in LUFS; -Infinity for silence, for less than one block, or for nothing above the gates (`loudness.ts`). |
| `kWeighted()` | One channel after the K-weighting, the shelf then the highpass, as floats (`loudness.ts`). |

Tests: `test/loudness.test.js`, a 1 kHz sine at -23 and -33 dBFS at two rates, one channel alone, the gate dropping quiet parts, silence and a signal shorter than a block, and the K-weighting's shelf and highpass.
