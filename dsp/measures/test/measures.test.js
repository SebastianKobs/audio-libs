// The bench measures' unit tests (dsp/measures/): what a recipe's numbers are read by. Fed
// Float32Arrays, they return a time, a level or a pitch as a number; a reading is compared as a number, never a buffer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandLevel, bandShare, fallTime, levelAt, onsetOf, partialLevel, pitchAt } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;

// seeded generator written here (mulberry32): the same noise every run
const seededRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// white noise in -1..1 as a Float32Array, never a plain array: the signals are seconds long
const whiteNoise = (seconds, seed) => {
  const random = seededRandom(seed);
  const samples = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = random() * 2 - 1;
  }
  return samples;
};
const sine = (hz, seconds, amplitude = 1) => {
  const samples = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / RATE);
  }
  return samples;
};
const summed = (a, b) => a.map((sample, i) => sample + b[i]);
const meanSquare = (samples) => {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return sum / samples.length;
};
// sin(2π∫f), f(t) = 55·2^(2·e^(−t/0.02)): a kick's sweep from 220 Hz down to 55
const chirp = (seconds) => {
  const samples = new Float32Array(Math.round(seconds * RATE));
  let phase = 0;
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin(phase);
    phase += (2 * Math.PI * 55 * 2 ** (2 * Math.exp(-i / RATE / 0.02))) / RATE;
  }
  return samples;
};

test('pitchAt: a 440 Hz sine reads 440', () => {
  near(pitchAt(sine(440, 0.5), RATE, 0.25), 440, 'a 440 Hz sine', 0.5);
});

test('pitchAt: the chirp reads 186 at 0.0025 s, 98 at 0.02 s, 55 at 0.15 s', () => {
  const sweep = chirp(0.3);
  near(pitchAt(sweep, RATE, 0.0025), 186, 'the chirp at 0.0025 s', 186 * 0.08);
  near(pitchAt(sweep, RATE, 0.02), 98, 'the chirp at 0.02 s', 98 * 0.08);
  near(pitchAt(sweep, RATE, 0.15), 55, 'the chirp at 0.15 s', 55 * 0.01);
});

test('pitchAt: a lowpass over 0 first, so a 200 Hz sine with a 5 kHz sine on it reads 200 through a 600 Hz lowpass', () => {
  const mixed = summed(sine(200, 0.5), sine(5000, 0.5, 0.3));
  near(pitchAt(mixed, RATE, 0.25, 600), 200, 'the lowpassed mix', 200 * 0.02);
});

test('levelAt: a sine of amplitude 0.5 reads -9.03 dB', () => {
  near(levelAt(sine(1000, 0.5, 0.5), RATE, 0.25), -9.03, 'a sine of 0.5', 0.1);
});

test("levelAt: a window past the buffer's end is clipped to the buffer", () => {
  near(levelAt(sine(1000, 0.5, 0.5), RATE, 0.5), -9.03, "the buffer's end", 0.3);
});

test('fallTime: seeded noise times e^(-t*9.21/0.1), 80 dB down in 0.1 s, reads 0.025 s for 20 dB', () => {
  const noise = whiteNoise(0.3, 7);
  const decaying = noise.map((sample, i) => sample * Math.exp((-(i / RATE) * 9.21) / 0.1));
  near(fallTime(decaying, RATE), 0.025, 'the 20 dB fall', 0.006);
});

test('bandShare: sines at 200 Hz (1) and 2000 Hz (0.5) read 0.2 in 1000 to 4000 Hz', () => {
  const mixed = summed(sine(200, 0.5), sine(2000, 0.5, 0.5));
  near(bandShare(mixed, RATE, 1000, 4000), 0.2, 'the share in 1000 to 4000 Hz', 0.01);
});

test('bandShare, bandLevel: 1 s of seeded white noise reads half in 0 to 12000 Hz, and its own mean square in 0 to 24000 Hz', () => {
  const noise = whiteNoise(1, 11);
  near(bandShare(noise, RATE, 0, 12000), 0.5, 'half the band', 0.03);
  near(bandLevel(noise, RATE, 0, 24000), 10 * Math.log10(meanSquare(noise)), 'the whole band', 0.1);
});

test('bandLevel: from and to take the span of the buffer between them', () => {
  const loudThenQuiet = Float32Array.from([...sine(1000, 0.5, 0.5), ...sine(1000, 0.5, 0.05)]);
  near(bandLevel(loudThenQuiet, RATE, 900, 1100, 0, 0.5), 10 * Math.log10(0.5 * 0.5 * 0.5), 'the loud half', 0.1);
  near(bandLevel(loudThenQuiet, RATE, 900, 1100, 0.5, 1), 10 * Math.log10(0.05 * 0.05 * 0.5), 'the quiet half', 0.1);
});

test('partialLevel: a 330 Hz sine of 0.25 over 0.1 s reads -12.04 dB at 330 Hz and under -60 dB at 180 Hz', () => {
  const tone = sine(330, 0.1, 0.25);
  near(partialLevel(tone, RATE, 330), -12.04, 'the partial at 330 Hz', 0.2);
  assert.ok(partialLevel(tone, RATE, 180) < -60, `read ${partialLevel(tone, RATE, 180)} at 180 Hz, expected under -60`);
});

test('onsetOf: a click at sample 2400 reads 0.05 s', () => {
  const click = new Float32Array(RATE);
  click[2400] = 1;
  near(onsetOf(click, RATE), 0.05, 'the click', 0.0001);
});

test('onsetOf: the first sample at or over the peak less 40 dB, not the first sample that is not zero', () => {
  const hit = new Float32Array(RATE);
  hit[1000] = 0.001; // -60 dB: under the 40 dB
  hit[2000] = 0.02; // -34 dB: over
  hit[3000] = 1;
  near(onsetOf(hit, RATE), 2000 / RATE, 'the first over 40 dB down', 0.0001);
});

test('silence reads NaN, -Infinity, Infinity, -Infinity, 0, -Infinity, Infinity: pitchAt, levelAt, fallTime, bandLevel, bandShare, partialLevel, onsetOf', () => {
  const silence = new Float32Array(4800);
  assert.ok(Number.isNaN(pitchAt(silence, RATE, 0.05)), 'pitchAt');
  assert.equal(levelAt(silence, RATE, 0.05), -Infinity);
  assert.equal(fallTime(silence, RATE), Infinity);
  assert.equal(bandLevel(silence, RATE, 100, 1000), -Infinity);
  assert.equal(bandShare(silence, RATE, 100, 1000), 0);
  assert.equal(partialLevel(silence, RATE, 440), -Infinity);
  assert.equal(onsetOf(silence, RATE), Infinity);
});
