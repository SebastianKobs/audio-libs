# dsp/measures

What a rendered sound is read by: a hit in a `Float32Array` becomes a time, a level, a pitch or a share of the spectrum, and two channels become what a mono sum loses. They are the numbers a sound's recipe is held to ("starts 50 ms in", "sings G4", "keeps its width in mono"). Times are in seconds from the buffer's start and levels in dB relative to full scale. Nothing here touches audio, so a test reads a buffer rendered offline as numbers. The `fft()` the spectral readings use is part of the face, as is `lagOf()`, the delay a click comes back with through a filter that holds its sound back.

Depends on: nothing.

```ts
import { bandShare, lagOf, monoLoss, onsetOf, pitchAt } from './index.ts';

const hit = new Float32Array(48000);
hit[2400] = 1;
const startsAt = onsetOf(hit, 48000); // 0.05 s
const lowShare = bandShare(hit, 48000, 0, 1000); // 0 to 1: its share of the spectrum under 1 kHz
const heard = pitchAt(hit, 48000, 0.05); // NaN: no cycle holds a click
const lost = monoLoss(hit, hit); // 0 dB: a channel and itself lose nothing
const late = lagOf(hit, 100); // 2300 samples: the loudest sample, counted from where a click went in
```

| Export | What it does |
|---|---|
| `onsetOf()` | The time of the first sample at or over the peak less 40 dB by default; Infinity for silence (`measures.ts`). |
| `levelAt()` | The rms in dB over a 10 ms window by default, centered on a time and clipped to the buffer (`measures.ts`). |
| `fallTime()` | From the loudest rms window to the first after which every window is 20 dB under it by default (`measures.ts`). |
| `pitchAt()` | Hz from the length of the cycle between two rising zero crossings around a time, a lowpass run first where one is asked; NaN where no cycle holds it (`measures.ts`). |
| `bandLevel()`, `bandShare()` | A band's mean square in dB, and its share of the spectrum from 0 to 1, over a span of the buffer (`measures.ts`). |
| `partialLevel()` | The level in dB of a steady sine at exactly one frequency, from a Hann-windowed sum (`measures.ts`). |
| `monoLoss()` | What a mono sum loses in dB: 0 for two equal channels, about -3 for unrelated noise, -Infinity for a channel and its inverse (`mix-checks.ts`). |
| `spectralSlope()` | The spectrum's slope in dB an octave, a least-squares line through its level against the log of the frequency (`mix-checks.ts`). |
| `hitsDiffer()` | Whether the difference of two hits is louder than a floor under the first, -60 dB by default (`mix-checks.ts`). |
| `fft()` | A radix-2 fast Fourier transform in place, on real and imaginary arrays whose length is a power of two (`mix-checks.ts`). |
| `lagOf()` | The samples from where a click went in to where its echo is loudest; 0 where nothing came back (`lag.ts`). |

Tests: `test/measures.test.js`, the time, level, fall, pitch, band and partial readings on sines, noise and a chirp, and each on silence. `test/mix-checks.test.js`, the mono loss, the spectral slope and the hits that differ. `test/lag.test.js`, the lag of a click.
