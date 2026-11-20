// The mix checks' unit tests (mockup/src/libs/dsp/measures/): what's lost in the mono sum, the spectrum's slope,
// whether two hits of a drum differ. Fed Float32Arrays, read as numbers and booleans, never a buffer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitsDiffer, monoLoss, spectralSlope } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

// seeded generator written here (mulberry32): the same noise every run
const seededRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// white noise in -1..1 as a Float32Array, never a plain array: the signals are seconds long
const whiteNoise = (seconds, rate, seed) => {
  const random = seededRandom(seed);
  const samples = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = random() * 2 - 1;
  }
  return samples;
};
const inverted = (samples) => samples.map((sample) => -sample);
const scaled = (samples, gain) => samples.map((sample) => sample * gain);
const sine = (hz, seconds, rate) => {
  const samples = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * hz * i) / rate);
  }
  return samples;
};
const onePoleLowpass = (samples, hz, rate) => {
  const coefficient = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  const out = new Float32Array(samples.length);
  let state = 0;
  for (let i = 0; i < samples.length; i++) {
    state += coefficient * (samples[i] - state);
    out[i] = state;
  }
  return out;
};

const noiseLeft = whiteNoise(2, 48000, 1);
const noiseRight = whiteNoise(2, 48000, 2);

test('monoLoss: a channel and itself lose 0 dB', () => {
  near(monoLoss(noiseLeft, noiseLeft), 0, 'a channel and itself', 0.01);
});

test('monoLoss: a channel and its inverse cancel to -Infinity', () => {
  assert.equal(monoLoss(noiseLeft, inverted(noiseLeft)), -Infinity);
});

test('monoLoss: two unrelated white noises of 2 s lose -3 dB', () => {
  near(monoLoss(noiseLeft, noiseRight), -3, 'unrelated noises', 0.5);
});

const whiteEightSeconds = whiteNoise(8, 48000, 3);

test('spectralSlope: white noise of 8 s at 48000 reads 0 dB an octave', () => {
  near(spectralSlope(whiteEightSeconds, 48000), 0, 'white noise', 0.5);
});

test('spectralSlope: the same through a one-pole lowpass at 20 Hz reads -6 dB an octave', () => {
  near(spectralSlope(onePoleLowpass(whiteEightSeconds, 20, 48000), 48000), -6, 'brown-like noise', 1);
});

test('spectralSlope: a sine alone does not throw and reads a number', () => {
  assert.equal(Number.isNaN(spectralSlope(sine(1000, 2, 48000), 48000)), false);
});

const hit = onePoleLowpass(whiteNoise(0.5, 48000, 4), 2000, 48000);

test('hitsDiffer: a hit and itself do not differ', () => {
  assert.equal(hitsDiffer(hit, hit), false);
});

test('hitsDiffer: a hit and the same 0.5 dB quieter differ', () => {
  assert.equal(hitsDiffer(hit, scaled(hit, 10 ** (-0.5 / 20))), true);
});

test('hitsDiffer: two hits differing only below -80 dB do not differ', () => {
  const faint = scaled(whiteNoise(0.5, 48000, 5), 1e-6); // about -110 dB under the hit
  const almost = hit.map((sample, i) => sample + faint[i]);
  assert.equal(hitsDiffer(hit, almost), false);
});
