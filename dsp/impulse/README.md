# dsp/impulse

A reverb's impulse response, designed rather than recorded: two arrays of floats, a left and a right, to fill a convolver's buffer. It builds a pre-delay of silence, a few early taps, then echoes whose rate grows with the square of time until they are dense, velvet noise of single clicks of random sign. The echoes are split into three bands that each die at a time of their own, so highs fade sooner than lows, as in a real room. The whole is band-limited, faded out at its end so no click marks the cut, and scaled to energy 1 so noise comes back as loud as it went in. Every draw comes from the random handed in: two, a seed a side, made into a generator by `seeded()` of `base/util`, so the same random gives the same room.

Depends on: `base/util`, `dsp/filters`, `dsp/measures`, the last in its tests alone.

```ts
import { designedImpulse, IMPULSE_DEFAULTS } from './index.ts';

// a seeded generator in real use: the same one, the same room
const [left, right] = designedImpulse({ decay: 2, density: 1500 }, 48000, Math.random);
// the rest of a design is IMPULSE_DEFAULTS: 8 taps a side, a 20 ms pre-delay, 2000 echoes a second
```

| Export | What it does |
|---|---|
| `designedImpulse()` | The two sides of an impulse from an `ImpulseDesign`, a sample rate and a random; it refuses a decay or a rate that isn't over 0 (`impulse.ts`). |
| `ImpulseDesign` | The design: a `decay` in seconds for the middle band to fall 60 dB, and optionally a pre-delay, the early taps, their spread and gain, the density and the time it is dense by, the crossovers, each band's share of the decay and the band limit (`impulse.ts`). |
| `IMPULSE_DEFAULTS` | The design's other fields as they start (`impulse.ts`). |

Tests: `test/impulse.test.js`, the shape (length, silent pre-delay, energy 1, two draws), the same seed again and another, left and right two noises that lose 3 dB in mono, the decay of each band at two rates, the onset growing denser, the taps alone, the band limit, and the refusals. The mono check reads `monoLoss()` from `dsp/measures`.
