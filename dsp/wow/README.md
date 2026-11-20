# dsp/wow

A tape's wow: slow drift that loops. `wowCurve()` is noise lowpassed at about 1 Hz and scaled to an rms of 1 with a mean of 0, so multiplying it by a depth in seconds moves a delay line's time the way a tape's speed wanders. It runs twice round the same draws and keeps the second round, so its end meets its start and the curve loops without a seam. Every draw comes from the random handed in, so the same random gives the same curve.

Depends on: nothing.

```ts
import { wowCurve } from './index.ts';

const curve = wowCurve(8 * 48000, 48000, Math.random); // 8 s of drift, a cutoff of 1 Hz
const delayTimes = curve.map((drift) => 0.02 + 0.0005 * drift); // a delay of 20 ms, moved by up to about 0.5 ms
```

| Export | What it does |
|---|---|
| `wowCurve()` | `frames` samples of drift at a cutoff in Hz, 1 by default, with a mean of 0 and an rms of 1; all zeros where the draws give no drift (`wow.ts`). |

Tests: `test/wow.test.js`, an rms of 1 and a mean of 0, its end meeting its start, the same seed the same curve, the rate following the cutoff, and a random that never varies giving zeros.
