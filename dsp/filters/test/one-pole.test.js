// The one-pole lowpass's unit tests (mockup/src/libs/dsp/filters/): the coefficients of a first-order lowpass, 6 dB
// an octave, read as their frequency response.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onePoleLowpass } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const dB = (share) => 20 * Math.log10(share);
const response = ({ feedforward: [b0, b1], feedback: [, a1] }, hz) => {
  const w = (2 * Math.PI * hz) / RATE;
  const num = Math.hypot(b0 + b1 * Math.cos(w), -b1 * Math.sin(w));
  const den = Math.hypot(1 + a1 * Math.cos(w), -a1 * Math.sin(w));
  return dB(num / den);
};

test('a one-pole lowpass: flat below, -3 dB at its cutoff, falling 6 dB an octave', () => {
  const filter = onePoleLowpass(2000, RATE);
  near(response(filter, 1), 0, 'flat at DC', 0.01);
  near(response(filter, 2000), -3.01, 'at its cutoff', 0.05);
  const octave = response(filter, 4000) - response(filter, 8000);
  near(octave, 6, 'dB an octave', 1.5);
});

test('a one-pole lowpass asked above what the rate holds stays stable, a little under its top', () => {
  for (const hz of [20000, 24000, 30000]) {
    const { feedback } = onePoleLowpass(hz, 44100);
    assert.ok(Math.abs(feedback[1]) < 1, `${hz}: a pole inside the unit circle`);
    assert.ok(response(onePoleLowpass(hz, 44100), 1000) > -0.1);
  }
});
