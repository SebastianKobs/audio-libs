# dsp/dynamics

What a compressor does to a steady level, as numbers: the level a browser's compressor node brings a steady sound to, and the make-up gain it adds on top. Everything is in dBFS. The curve is worked out in linear gain, as the node does: straight under the threshold, a knee that starts at slope 1 and bends flatter, then the ratio. It is written from memory of Chromium's compressor kernel, not from its source, so it predicts a level, not a sample. Use it to set a threshold, or to tell what a node will do to a sound before building it.

Depends on: nothing.

```ts
import { compressedLevel, compressorMakeup } from './index.ts';

const settings = { threshold: -18, knee: 0, ratio: 2 };
const out = compressedLevel(-6, settings); // -12 dBFS
const makeup = compressorMakeup(settings); // 5.4 dB, what the node adds back
```

| Export | What it does |
|---|---|
| `compressedLevel()` | The level in dBFS a steady sound at a level comes out at, the make-up not counted (`compressor-curve.ts`). |
| `compressorMakeup()` | The make-up gain in dB the node adds: 0.6 of what full scale is brought down by (`compressor-curve.ts`). |
| `CompressorSettings` | A threshold in dBFS, a knee in dB and a ratio of dB in for each dB out (`compressor-curve.ts`). |

Tests: `test/compressor-curve.test.js`, a hard knee and a soft one, the make-up at a limiting setting, a ratio of 1 compressing nothing, and the curve never falling nor stepping over 0.011 dB from -40 to 0 dBFS.
