# dsp/true-peak

A true-peak meter and limiter on float channels. The true peak is the loudest point of the wave a DAC rebuilds, which can sit between two samples and over both: the meter finds it on a copy upsampled 8 times (a windowed-sinc filter computes the points between the samples; BS.1770 asks for 4 at least, which can under-read by a fraction of a dB). The limiter is one kernel run in the stream, a sample in and a sample out (`LookaheadLimiter`): a soft clip, then the gain at each sample from the loudest upsampled point within its lookahead (a sliding-window minimum of the gain each point needs, ramped down by a moving average so it lands as the peak arrives, and let go by a release), a delay of `latency` samples. On whole channels, `limitTruePeak()` runs the kernel once with the clip off, then measures the result and pulls the gain down further wherever a point is still over, until none is. One gain serves every channel, so the stereo image holds. The samples past either end of the channels count as silence, so a hard start rings over its level, as it would on a DAC.

Depends on: `dsp/filters`, and `dsp/loudness` in its tests alone.

```ts
import { limitTruePeak, LookaheadLimiter, measureTruePeak } from './index.ts';

const left = Float32Array.of(0, 1.4, 0, -1.4);
const { channels } = limitTruePeak({ channels: [left], sampleRate: 44100, ceilingDb: -0.3 });
const truePeak = measureTruePeak(channels); // at or under 10 ** (-0.3 / 20), about 0.966

const live = new LookaheadLimiter({ sampleRate: 48000 });
const heard = [new Float32Array(128)];
live.render([new Float32Array(128)], heard, 128, { gain: 0, ceiling: -1, release: 0.1, clip: 3 }); // a block, `live.latency` samples late
```

The kernel runs live in an audio worklet, as a processor of `modular-audio/build/web-audio`: a block of the browser's audio, its soft clip and its true-peak hold in the stream.

The cost is a filter of 24 taps for each of the 7 points between two samples: about 170 multiply-adds once a sample for the kernel, then once a pass for the meter, one pass where the kernel held, as it does in every normal setup. Ten minutes of stereo takes seconds, not milliseconds.

| Export | What it does |
|---|---|
| `measureTruePeak()` | The loudest point of any channel as a linear level (1 = full scale), on a copy upsampled a whole number of times, 8 by default (`meter.ts`). |
| `limitTruePeak()` | The channels limited, and the gain applied, from a `TruePeakSetup`: ceiling -0.3 dBTP, lookahead 5 ms and release 100 ms unless set; it refuses no channels, channels of different lengths, a rate that isn't a positive whole number, a negative time and a lookahead over 20 ms, and throws where 100 passes leave a point over (`limiter.ts`). |
| `TruePeakSetup` | What it's handed: `channels`, `sampleRate`, and optionally `ceilingDb`, `lookaheadMs`, `releaseMs` (`limiter.ts`). |
| `LimitedChannels` | What it hands back: `channels` and `gain`, the one gain at each sample (`limiter.ts`). |
| `LookaheadLimiter` | The kernel: a soft clip into a limiter that looks ahead, made from a `LookaheadSetup` (sample rate, lookahead up to 20 ms, 5 ms by default); `render()` renders a block of channels at the `LookaheadParams` (gain and clip in dB, ceiling in dBTP, release in s), filling a gain for each frame where asked; `reduced()` is the most it took off since last asked, in dB; `latency` is how many samples the output sits behind the input (`lookahead-limiter.ts`). |
| `softClipped()` | A sample straight up to a threshold, then a tanh bending to a limit, its slope 1 where it starts; an infinite limit hands the sample back untouched (`lookahead-limiter.ts`). |
| `LookaheadSetup`, `LookaheadParams` | What the kernel is made with, and what each block of it is rendered at (`lookahead-limiter.ts`). |

Tests: `test/true-peak.test.js`, the meter on a quarter-rate sine and on tones near half the rate, its edges and refusals; the limiter on sines, tones, square waves and noise, on the 8× meter and BS.1770's 4×, with no lookahead so the second stage works, its ceiling, a quiet signal's gain exactly 1, one gain for both channels, a burst's lookahead and release, its channels the kernel's output, and its refusals. `test/lookahead-limiter.test.js`, the kernel's soft clip, latency, ceiling on nine signals at two lookaheads, one gain for both channels, the clip's share, its loudness read by `integratedLoudness()` from `dsp/loudness` (gain as make-up, a kick and a bed), silence and a missing channel.
