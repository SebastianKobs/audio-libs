# dsp/filters

Filters on plain arrays: a second-order filter run over samples, and coefficients worked out from a cutoff for the filters the browser has no node for. `runBiquad()` is the difference equation of a biquad, direct form I, with its state in doubles: a low corner at 32-bit float would ring with rounding. It fills a new array, or the one handed in, which may be the input itself, so it filters in place. `onePoleLowpass()` is a first-order lowpass that falls 6 dB an octave: no biquad type does, so it comes as the coefficients of an IIR filter node, the bilinear transform of 1 / (1 + s/ω) with its cutoff prewarped so it is -3 dB where asked. A cutoff past what the rate holds is kept a little under it, as a pole past the Nyquist frequency is unstable.

Depends on: nothing.

```ts
import { onePoleLowpass, runBiquad } from './index.ts';

const smoothed = runBiquad(Float32Array.of(1, 0, 0, 0), { b0: 1, b1: 0, b2: 0, a1: 0.5, a2: 0.25 }); // 1, -0.5, 0, 0.125
const { feedforward, feedback } = onePoleLowpass(2000, 48000); // -3 dB at 2 kHz
// new IIRFilterNode(context, { feedforward: [...feedforward], feedback: [...feedback] })
```

| Export | What it does |
|---|---|
| `runBiquad()` | The samples run through a `Biquad`'s `y[n] = b0·x[n] + b1·x[n-1] + b2·x[n-2] - a1·y[n-1] - a2·y[n-2]`, as doubles, into an array handed in or a new one (`biquad.ts`). |
| `Biquad` | The five coefficients `b0`, `b1`, `b2`, `a1` and `a2` (`biquad.ts`). |
| `onePoleLowpass()` | The coefficients of a 6 dB an octave lowpass at a cutoff in Hz for a sample rate; the cutoff is held at 45% of the rate at most (`one-pole.ts`). |
| `IirCoefficients` | What an IIR filter node takes: the feedforward and the feedback, `y[n] = b0·x[n] + b1·x[n-1] - a1·y[n-1]` (`one-pole.ts`). |

Tests: `test/biquad.test.js`, the difference equation's feedback and feedforward taps, doubles out, a handed-in array and in place. `test/one-pole.test.js`, the response flat at DC, -3 dB at the cutoff and 6 dB an octave above, and a cutoff past the rate staying stable.
