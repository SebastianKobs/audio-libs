// The wow curve's unit tests (dsp/wow/): a curve of slow drift, noise lowpassed at about 1 Hz and
// made to loop. Pure: numbers in, a Float32Array out, read by an rms, a mean, a step. Its draws from a generator written here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wowCurve } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const FRAMES = 512000;
const RATE = 8000;
// mulberry32: a small seeded generator, 32 bits of state, in [0, 1)
function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
const rmsOf = (samples) => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
const meanOf = (samples) => samples.reduce((sum, x) => sum + x, 0) / samples.length;
// the rms of the step from one sample to the next, as a rate in Hz: for noise lowpassed at a cutoff, rms(step) × sampleRate / 2π reads the cutoff
const rateOf = (samples) => {
  let squares = 0;
  for (let i = 1; i < samples.length; i++) {
    squares += (samples[i] - samples[i - 1]) ** 2;
  }
  return (Math.sqrt(squares / (samples.length - 1)) * RATE) / (2 * Math.PI);
};

test('the wow curve: an rms of 1 within 1e-6, a mean of 0 within 1e-6', () => {
  const curve = wowCurve(FRAMES, RATE, generator(1));
  assert.equal(curve.length, FRAMES);
  near(rmsOf(curve), 1, 'rms', 1e-6);
  assert.ok(Math.abs(meanOf(curve)) < 1e-6, `mean ${meanOf(curve)}`);
});

test('the wow curve loops: its last and first sample under 0.05 apart', () => {
  const curve = wowCurve(FRAMES, RATE, generator(2));
  const apart = Math.abs(curve[FRAMES - 1] - curve[0]);
  assert.ok(apart < 0.05, `${apart} apart`);
});

test('the same seed twice gives the same curve: the first index where they part is none', () => {
  const first = wowCurve(FRAMES, RATE, generator(3));
  const second = wowCurve(FRAMES, RATE, generator(3));
  let parts = -1;
  for (let i = 0; i < FRAMES; i++) {
    if (first[i] !== second[i]) {
      parts = i;
      break;
    }
  }
  assert.equal(parts, -1, `parted at ${parts}`);
});

test('the wow curve at its cutoff: its rate about 1 Hz by default, about 2 Hz at a cutoff of 2', () => {
  const slow = rateOf(wowCurve(FRAMES, RATE, generator(4)));
  const faster = rateOf(wowCurve(FRAMES, RATE, generator(4), 2));
  assert.ok(slow > 0.75 && slow < 1.3, `${slow} Hz`);
  assert.ok(faster > 1.5 && faster < 2.6, `${faster} Hz`);
});

test('a generator giving 0.5 every time (no draw) gives all zeros, not a division by nothing', () => {
  const curve = wowCurve(FRAMES, RATE, () => 0.5);
  assert.equal(curve.length, FRAMES);
  assert.equal(
    curve.reduce((most, x) => Math.max(most, Math.abs(x)), 0),
    0,
  );
});
