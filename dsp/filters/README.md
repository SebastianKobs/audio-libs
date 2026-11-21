# dsp/filters

Filters on plain arrays: a second-order filter run over samples, coefficients worked out from a cutoff for the filters the browser has no node for, a filter that saturates and sings, and the tap an interpolating filter is made of. `runBiquad()` is the difference equation of a biquad, direct form I, with its state in doubles: a low corner at 32-bit float would ring with rounding. It fills a new array, or the one handed in, which may be the input itself, so it filters in place. `onePoleLowpass()` is a first-order lowpass that falls 6 dB an octave: no biquad type does, so it comes as the coefficients of an IIR filter node, the bilinear transform of 1 / (1 + s/ω) with its cutoff prewarped so it is -3 dB where asked. A cutoff past what the rate holds is kept a little under it, as a pole past the Nyquist frequency is unstable. A `SaturatingFilter` is a ladder (24 dB a lowpass) or a state-variable (12 dB: lowpass, bandpass, highpass) with a tanh where its input meets its feedback, solved within the sample so the loop turns at the cutoff exactly, run at twice the rate between two half-bands so the clip's partials don't fold. A circuit's breath of noise, drawn from the random handed in, goes in: past a resonance of 0.909 it sings out of nothing, a sine at its cutoff, its level held by the clip; its drive pushes the sound into the clip and takes it back, and its compensation gives the ladder's thinned lows back. It is `LATENCY` samples late. `SaturatingFilterChannels` makes one for each channel of a block, each on a random of its own, and lets go once told to stop. An `Oversampler` runs a shape, a function of one sample, at a multiple of the rate between two windowed-sinc filters, so what the shape makes past the rate's Nyquist is taken off before it folds back; it is `latency` samples late, a whole number. `windowedSinc()` is a sinc under a Kaiser window, the weight of one sample in a filter that reads a point between samples: the half-bands' taps, the oversampler's, and a true-peak meter's.

Depends on: nothing.

```ts
import { onePoleLowpass, runBiquad, SaturatingFilter, windowedSinc } from './index.ts';

const smoothed = runBiquad(Float32Array.of(1, 0, 0, 0), { b0: 1, b1: 0, b2: 0, a1: 0.5, a2: 0.25 }); // 1, -0.5, 0, 0.125
const { feedforward, feedback } = onePoleLowpass(2000, 48000); // -3 dB at 2 kHz
// new IIRFilterNode(context, { feedforward: [...feedforward], feedback: [...feedback] })

const filter = new SaturatingFilter({ sampleRate: 48000 });
const out = new Float32Array(128);
filter.render(undefined, out, 0, 128, { frequency: 1000, detune: 0, resonance: 1, drive: 1, compensation: 0, mode: 0 }); // singing
const tap = windowedSinc(0.5, 12); // half a sample out, in a window 12 samples each side
```

| Export | What it does |
|---|---|
| `runBiquad()` | The samples run through a `Biquad`'s `y[n] = b0·x[n] + b1·x[n-1] + b2·x[n-2] - a1·y[n-1] - a2·y[n-2]`, as doubles, into an array handed in or a new one (`biquad.ts`). |
| `Biquad` | The five coefficients `b0`, `b1`, `b2`, `a1` and `a2` (`biquad.ts`). |
| `onePoleLowpass()` | The coefficients of a 6 dB an octave lowpass at a cutoff in Hz for a sample rate; the cutoff is held at 45% of the rate at most (`one-pole.ts`). |
| `IirCoefficients` | What an IIR filter node takes: the feedforward and the feedback, `y[n] = b0·x[n] + b1·x[n-1] - a1·y[n-1]` (`one-pole.ts`). |
| `SaturatingFilter`, `SaturatingFilterSetup`, `SaturatingParams`, `LATENCY` | A saturating filter on one channel: `render(input, output, from, to, params)` fills frames `from` to `to` at `frequency`, `detune` in cents, `resonance`, `drive`, `compensation` and `mode` (0 the ladder, 1 to 3 the state-variable's lowpass, bandpass and highpass), each a number for the block or an array a sample each; no input is silence. `LATENCY` is how many samples late it comes out (`saturating-filter.ts`). |
| `Oversampler`, `Shape` | A shape run `factor` times as fast: `process(input, shape)` takes a sample in and gives the next out, the shape called `factor` times on the band-limited points between; `latency` the samples it comes out late, twice its reach (16 samples each side by default) (`oversampler.ts`). |
| `SaturatingFilterChannels`, `SaturatingFilterChannelsSetup` | A saturating filter for each channel of a block, `randomOf(channel)` its noise's random; `told({ stop })` sets a stop in the context's seconds, never taken back, and `process()` writes zeros from it and answers false once it has passed; never told, it answers true (`saturating-filter-channels.ts`). |
| `windowedSinc()` | A sinc at a distance in samples under a Kaiser window of beta 8, a reach in samples each side (`windowed-sinc.ts`). |

Tests: `test/oversampler.test.js`, a sine back as it went in after its latency, 15 kHz flat within a tenth of a dB, and a cube's partials past Nyquist taken off, folding 60 dB under what they would. `test/biquad.test.js`, the difference equation's feedback and feedforward taps, doubles out, a handed-in array and in place. `test/one-pole.test.js`, the response flat at DC, -3 dB at the cutoff and 6 dB an octave above, and a cutoff past the rate staying stable. `test/saturating-filter.test.js`, the ladder's poles, detune, thinned lows and compensation, its singing and its level held by the clip, its drive and odd partials, nothing folded, `LATENCY`, the state-variable's three modes, both bounded under a swept cutoff, one random giving one song, and the filter a channel let go once told to stop. `test/windowed-sinc.test.js`, 1 at the middle, 0 at each whole sample, even, and the Kaiser window's weight half a sample out.
