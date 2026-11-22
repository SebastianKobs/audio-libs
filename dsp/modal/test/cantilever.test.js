// The cantilever's unit tests (dsp/modal/): a uniform beam clamped at one end and free at the other, its bending
// modes' ratios as Rayleigh found them, its shapes held at the clamp, ±2 at the tip, normalized and orthogonal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cantileverRatio, cantileverShape } from '../index.ts';

// ∫₀¹ f by Simpson's rule: the curve a parabola over each pair of slices
function integral(f, slices = 2000) {
  const width = 1 / slices;
  let sum = f(0) + f(1);
  for (let i = 1; i < slices; i++) {
    sum += (i % 2 === 1 ? 4 : 2) * f(i * width);
  }
  return (sum * width) / 3;
}

test("the modes' ratios to the first, as Rayleigh found them", () => {
  const expected = [1, 6.2669, 17.5475, 34.3861, 56.8426];
  expected.forEach((ratio, mode) => {
    assert.ok(Math.abs(cantileverRatio(mode) - ratio) < 1e-4, `mode ${mode}: ${cantileverRatio(mode)}`);
  });
});

test('each shape is held at the clamp, still and level, and swings ±2 at the free end', () => {
  for (let mode = 0; mode < 6; mode++) {
    assert.ok(Math.abs(cantileverShape(mode, 0)) < 1e-12, `mode ${mode} at the clamp`);
    // level at the clamp: the shape grows as the square of the distance, so twice as far is four times as much
    const growth = cantileverShape(mode, 2e-3) / cantileverShape(mode, 1e-3);
    assert.ok(Math.abs(growth - 4) < 0.1, `mode ${mode} grows ${growth} times from 1 to 2 thousandths`);
    assert.ok(Math.abs(Math.abs(cantileverShape(mode, 1)) - 2) < 1e-9, `mode ${mode} at the tip`);
  }
  assert.ok(cantileverShape(0, 1) > 0, 'the first one up at the tip');
});

test('the shapes are normalized and orthogonal over the length', () => {
  for (let first = 0; first < 5; first++) {
    for (let second = first; second < 5; second++) {
      const product = integral((x) => cantileverShape(first, x) * cantileverShape(second, x));
      const expected = first === second ? 1 : 0;
      assert.ok(Math.abs(product - expected) < 1e-6, `modes ${first} and ${second}: ${product}`);
    }
  }
});
