# dsp/true-peak

A true-peak meter and limiter on float channels. The true peak is the loudest point of the wave a DAC rebuilds, which can sit between two samples and over both: the meter finds it on a copy upsampled 8 times (a windowed-sinc filter computes the points between the samples; BS.1770 asks for 4 at least, which can under-read by a fraction of a dB). The limiter works offline, in two stages: the gain at each sample comes from the loudest upsampled point within its lookahead (a sliding-window minimum of the gain each point needs, ramped down by a moving average so it lands as the peak arrives, and let go by a release); then the result is measured again and the gain pulled down further wherever a point is still over, until none is. One gain serves every channel, so the stereo image holds. The samples past either end of the channels count as silence, so a hard start rings over its level, as it would on a DAC.

Depends on: nothing.

```ts
import { limitTruePeak, measureTruePeak } from './index.ts';

const left = Float32Array.of(0, 1.4, 0, -1.4);
const { channels } = limitTruePeak({ channels: [left], sampleRate: 44100, ceilingDb: -0.3 });
const truePeak = measureTruePeak(channels); // at or under 10 ** (-0.3 / 20), about 0.966
```

The cost is a filter of 24 taps for each of the 7 points between two samples, per sample per pass: about 170 multiply-adds, so ten minutes of stereo takes seconds, not milliseconds.

| Export | What it does |
|---|---|
| `measureTruePeak()` | The loudest point of any channel as a linear level (1 = full scale), on a copy upsampled a whole number of times, 8 by default (`meter.ts`). |
| `limitTruePeak()` | The channels limited, and the gain applied, from a `TruePeakSetup`: ceiling -0.3 dBTP, lookahead 5 ms and release 100 ms unless set; it refuses no channels, channels of different lengths, a rate that isn't a positive whole number and a negative time (`limiter.ts`). |
| `TruePeakSetup` | What it's handed: `channels`, `sampleRate`, and optionally `ceilingDb`, `lookaheadMs`, `releaseMs` (`limiter.ts`). |
| `LimitedChannels` | What it hands back: `channels` and `gain`, the one gain at each sample (`limiter.ts`). |

Tests: `test/true-peak.test.js`, the meter on a quarter-rate sine and on tones near half the rate, its edges and refusals; the limiter on sines, tones, square waves and noise, on the 8× meter and BS.1770's 4×, with no lookahead so the second stage works, its ceiling, a quiet signal's gain exactly 1, one gain for both channels, a burst's lookahead and release, and its refusals.
