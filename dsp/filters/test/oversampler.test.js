// The oversampler's unit tests (dsp/filters/): a shape run at a multiple of the rate between two windowed-sinc
// filters, up and down. A sine through no shape comes back as it went in, late by the latency it names; the
// partials a shape makes past the rate's Nyquist are taken off before they fold back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Oversampler } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const unchanged = (x) => x;

function through(oversampler, shape, input) {
  return Float64Array.from(input, (x) => oversampler.process(x, shape));
}

function sine(hz, length, level = 0.5) {
  return Float64Array.from({ length }, (_, n) => level * Math.sin((2 * Math.PI * hz * n) / RATE));
}

// the amplitude of a frequency over whole periods from `start`
function amplitudeAt(samples, hz, start, length) {
  let [s, c] = [0, 0];
  for (let n = start; n < start + length; n++) {
    s += samples[n] * Math.sin((2 * Math.PI * hz * n) / RATE);
    c += samples[n] * Math.cos((2 * Math.PI * hz * n) / RATE);
  }
  return (2 * Math.hypot(s, c)) / length;
}

test('through no shape a sine comes back as it went in, late by the latency it names', () => {
  const oversampler = new Oversampler(8);
  const input = sine(1000, 4800);
  const output = through(oversampler, unchanged, input);
  for (let n = 1000; n < 4800; n++) {
    near(output[n], input[n - oversampler.latency], `sample ${n}`, 1e-3);
  }
});

test('passes the audible band flat: 15 kHz within a tenth of a dB', () => {
  const output = through(new Oversampler(8), unchanged, sine(15000, 9600));
  const gain = amplitudeAt(output, 15000, 4800, 4800) / 0.5;
  assert.ok(Math.abs(20 * Math.log10(gain)) < 0.1, `${20 * Math.log10(gain)} dB`);
});

test('takes off the partials a shape makes past Nyquist: a cube of 15 kHz leaves its 45 kHz, not a fold at 3 kHz', () => {
  const cube = (x) => x * x * x;
  const input = sine(15000, 9600, 0.9);
  const folded = amplitudeAt(Float64Array.from(input, cube), 3000, 4800, 4800); // at the rate itself: 45 kHz folds to 3
  const oversampled = amplitudeAt(through(new Oversampler(8), cube, input), 3000, 4800, 4800);
  assert.ok(20 * Math.log10(oversampled / folded) < -60, `${20 * Math.log10(oversampled / folded)} dB`);
});

test('runs its shape the factor’s times a sample', () => {
  let calls = 0;
  const oversampler = new Oversampler(8);
  oversampler.process(0.1, (x) => {
    calls++;
    return x;
  });
  assert.equal(calls, 8);
});
