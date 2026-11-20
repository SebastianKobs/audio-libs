// ---------- build/web-audio/shaper-lags: how late an oversampled WaveShaper comes out ----------
// No spec fixes its resampling filters, so each browser's lag differs: a click rendered offline through a WaveShaper at each
// oversampling, read back (libs/dsp/measures/'s lagOf()).
// Measured once a context, by whoever owns it (ClockedContext), and handed to the builder; until then, and where nothing can
// render offline, Chromium's.
// It reads no globals: the browser's OfflineAudioContext class is handed in.
import { lagOf } from '../../../dsp/measures/index.ts';
import { OVERSAMPLE } from '../../plan/blocks/index.ts';

export type Oversampling = (typeof OVERSAMPLE.choices)[number];
// samples, by oversampling
export type Lags = Readonly<Record<Oversampling, number>>;
// the browser's OfflineAudioContext class, as it's handed in
export type OfflineContexts = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext;

export const CHROMIUM_LAGS: Lags = Object.freeze({ none: 0, '2x': 128, '4x': 192 }); // measured 2026-11-06; WebKit's the same, Firefox's 8 at 2x and 4x
const CLICK_AT = 128; // samples into the render
const LENGTH = 1024; // samples rendered: past any browser's lag

// the lags at a sample rate, measured; Chromium's where a render fails
export async function measuredLags(sampleRate: number, Offline: OfflineContexts): Promise<Lags> {
  try {
    const [none, twice, four] = await Promise.all(
      OVERSAMPLE.choices.map((oversample) => lagThrough(oversample, sampleRate, Offline)),
    );
    return { none: none!, '2x': twice!, '4x': four! };
  } catch {
    return CHROMIUM_LAGS;
  }
}

// a click through a straight curve at an oversampling, how late it comes out
async function lagThrough(oversample: Oversampling, sampleRate: number, Offline: OfflineContexts): Promise<number> {
  const offline = new Offline(1, LENGTH, sampleRate);
  const click = offline.createBuffer(1, LENGTH, sampleRate);
  click.getChannelData(0)[CLICK_AT] = 0.5;
  const source = offline.createBufferSource();
  source.buffer = click;
  const shaper = offline.createWaveShaper();
  shaper.curve = new Float32Array([-1, 0, 1]);
  shaper.oversample = oversample;
  source.connect(shaper).connect(offline.destination);
  source.start();
  return lagOf((await offline.startRendering()).getChannelData(0), CLICK_AT);
}
