// ---------- dsp/true-peak: the true peak of channels, the points between the samples counted ----------
import { betweenSamplePeaks } from './oversampling.ts';

const DEFAULT_OVERSAMPLING = 8; // BS.1770 asks for 4 at least, which can under-read by a fraction of a dB

/** The loudest point of any channel, as a linear level (1 = full scale), on a copy upsampled `oversampling` times. */
export function measureTruePeak(channels: readonly Float32Array[], oversampling = DEFAULT_OVERSAMPLING): number {
  if (!Number.isInteger(oversampling) || oversampling < 1) {
    throw new Error(`Oversampling is a whole number of 1 or more, not ${oversampling}`);
  }
  let loudest = 0;
  for (const channel of channels) {
    for (const peak of betweenSamplePeaks(channel, oversampling)) {
      loudest = Math.max(loudest, peak);
    }
  }
  return loudest;
}
