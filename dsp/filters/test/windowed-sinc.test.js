// The windowed sinc's unit tests (dsp/filters/): a sinc under a Kaiser window, the tap of an interpolating
// filter, read at its points: 1 at its middle, 0 at each whole sample, nearly 0 at the window's edge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowedSinc } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const REACH = 8; // samples each side

test('a windowed sinc is 1 at its middle and 0 at every whole sample away from it', () => {
  near(windowedSinc(0, REACH), 1, 'the middle');
  for (const distance of [1, -1, 3, -5, 7]) {
    near(windowedSinc(distance, REACH), 0, `${distance} samples out`, 1e-12);
  }
});

test("a windowed sinc is even, and falls to nearly nothing at the window's edge", () => {
  for (const distance of [0.25, 0.5, 2.5, 6.75]) {
    near(windowedSinc(-distance, REACH), windowedSinc(distance, REACH), `${distance} either side`);
  }
  assert.ok(
    Math.abs(windowedSinc(REACH - 0.5, REACH)) < 1e-3,
    `${windowedSinc(REACH - 0.5, REACH)} half a sample inside the edge`,
  );
});

test('half a sample out, a windowed sinc is the sinc there held under a Kaiser window of beta 8', () => {
  // [calc: sinc(0.5) = 2 / pi; the window there, 0.5 / 8 of the way out, is Bessel(8 * sqrt(1 - 0.0625^2)) / Bessel(8), Bessel the
  // modified one of order 0: Bessel(7.9843) / Bessel(8)]
  const window = 0.98548;
  near(windowedSinc(0.5, REACH), (2 / Math.PI) * window, 'half a sample', 1e-4);
});
