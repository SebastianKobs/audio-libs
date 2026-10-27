# formats/wav

A WAV encoder: float channels in, a 16-bit PCM file's bytes out, a RIFF header and the samples interleaved. Each value is clamped to full scale, TPDF-dithered (the sum of two random numbers of ±½ of the last bit each, added before rounding, so a quiet tail fades into soft noise, not grainy steps) and rounded. The random is handed in, so a test seeds it.

Depends on: nothing.

```ts
import { encodeWav } from './index.ts';

const left = Float32Array.of(0, 0.5, 1);
const right = Float32Array.of(0, -0.5, -1);
const bytes = encodeWav({ channels: [left, right], sampleRate: 44100, random: Math.random }); // 44 bytes of header, 12 of samples
```

| Export | What it does |
|---|---|
| `encodeWav()` | The file's bytes (`Uint8Array`) from a `WavSetup`; it refuses no channels, channels of different lengths and a rate that isn't a positive whole number (`wav.ts`). |
| `WavSetup` | What it's handed: `channels` (floats, full scale ±1), `sampleRate` and `random`, a draw in [0, 1) (`wav.ts`). |

Tests: `test/wav.test.js`, the header's every field, the interleaving, the clamp with the dither at its largest, the dither's two draws and its mean on a tone under one bit, the same random the same bytes, the refusals.
