// The biquad kernel's unit tests (mockup/src/libs/dsp/filters/): a second-order filter run over samples, into a new
// array or in place, its state kept in doubles. Fed short arrays whose output follows from the difference equation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBiquad } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const PASS = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };

test('coefficients that only pass the sample on give the input back, as doubles', () => {
  const input = Float32Array.of(0.5, -0.25, 1, 0);
  const output = runBiquad(input, PASS);
  assert.ok(output instanceof Float64Array);
  assert.deepEqual([...output], [...input]);
});

test('an impulse through y = x - 0.5·y[n-1] - 0.25·y[n-2] rings as the difference equation says', () => {
  const output = runBiquad(Float32Array.of(1, 0, 0, 0), { b0: 1, b1: 0, b2: 0, a1: 0.5, a2: 0.25 });
  const expected = [1, -0.5, 0, 0.125];
  expected.forEach((value, i) => near(output[i], value, `sample ${i}`));
});

test('the feedforward taps read the two samples before: y = x[n-1] + 2·x[n-2] on 1, 2, 3 gives 0, 1, 4', () => {
  const output = runBiquad(Float32Array.of(1, 2, 3), { b0: 0, b1: 1, b2: 2, a1: 0, a2: 0 });
  assert.deepEqual([...output], [0, 1, 4]);
});

test('into an array handed in, it fills that one and hands it back; the same array as the input filters in place', () => {
  const input = Float64Array.of(1, 0, 0, 0);
  const coefficients = { b0: 1, b1: 0.5, b2: 0.25, a1: 0.5, a2: 0.25 };
  const separate = runBiquad(input, coefficients);
  const inPlace = Float64Array.from(input);
  const handedBack = runBiquad(inPlace, coefficients, inPlace);
  assert.equal(handedBack, inPlace);
  assert.deepEqual([...inPlace], [...separate]);
  assert.deepEqual([...input], [1, 0, 0, 0]);
});
