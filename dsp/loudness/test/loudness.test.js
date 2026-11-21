// The loudness meter's unit tests (dsp/loudness/): an integrated loudness in LUFS after ITU-R
// BS.1770-4, fed Float32Arrays, its number read. No audio in node; a level is compared as a number, never a buffer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { integratedLoudness, kWeighted } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const TOLERANCE = 0.1; // LU
const dbfs = (db) => 10 ** (db / 20);
// a sine as Float32Array, never a plain array: the signals are tens of seconds long
const sine = (hz, seconds, rate, level) => {
  const samples = new Float32Array(Math.round(seconds * rate));
  const amplitude = dbfs(level);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / rate);
  }
  return samples;
};
const joined = (...parts) => {
  const samples = new Float32Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    samples.set(part, at);
    at += part.length;
  }
  return samples;
};
const rms = (samples) => {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
};
// built once, shared by the cases below
const loud48 = sine(1000, 20, 48000, -23);
const loud44 = sine(1000, 20, 44100, -23);
const quiet48 = sine(1000, 20, 48000, -33);
const fullScale = sine(1000, 20, 48000, 0);
const silentChannel = new Float32Array(fullScale.length);
const gated = joined(sine(1000, 10, 48000, -36), sine(1000, 60, 48000, -23), sine(1000, 10, 48000, -36));

test('a 1 kHz sine at -23 dBFS in both of two channels, 20 s at 48000, reads -23.0', () => {
  near(integratedLoudness([loud48, loud48], 48000), -23, 'stereo -23 dBFS at 48000', TOLERANCE);
});

test('the same at 44100 reads -23.0: the filters follow the sample rate', () => {
  near(integratedLoudness([loud44, loud44], 44100), -23, 'stereo -23 dBFS at 44100', TOLERANCE);
});

test('at -33 dBFS it reads -33.0', () => {
  near(integratedLoudness([quiet48, quiet48], 48000), -33, 'stereo -33 dBFS', TOLERANCE);
});

test('a 1 kHz sine at full scale in one channel alone reads -3.0', () => {
  near(integratedLoudness([fullScale, silentChannel], 48000), -3, 'one channel at full scale', TOLERANCE);
});

test('10 s at -36 dBFS, 60 s at -23, 10 s at -36 reads -23.0: the relative gate drops the quiet parts', () => {
  near(integratedLoudness([gated, gated], 48000), -23, 'gated', TOLERANCE);
});

test('silence reads -Infinity', () => {
  const silence = new Float32Array(20 * 48000);
  assert.equal(integratedLoudness([silence, silence], 48000), -Infinity);
});

test('less than one 400 ms block reads -Infinity', () => {
  const short = sine(1000, 0.2, 48000, -23);
  assert.equal(integratedLoudness([short, short], 48000), -Infinity);
});

test('the K-weighting: a shelf lifting the highs about 4 dB, a highpass cutting below 38 Hz', () => {
  const level = (hz, rate) => {
    const weighted = kWeighted(sine(hz, 2, rate, -20), rate);
    // skip the first second: the filters settle
    return 20 * Math.log10(rms(weighted.subarray(rate)) / rms(sine(hz, 1, rate, -20)));
  };
  for (const rate of [48000, 44100]) {
    near(level(1000, rate), 0.69, `1 kHz at ${rate}`, TOLERANCE);
    near(level(10000, rate), 4, `10 kHz at ${rate}`, TOLERANCE);
    assert.ok(level(20, rate) < -4, `20 Hz at ${rate} is cut: ${level(20, rate)} dB`);
  }
});
