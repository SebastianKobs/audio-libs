// The operator levels' unit tests (dsp/operator-levels/): a DX's 0 to 99 as a modulation index in
// radians, its feedback 0 to 7 as the kernel's share. The six-operator figures are the yala page's table (Chowning and
// Bristow's); the four-operator top, 8π, is one forum post's, to check against the chip's manual.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL_LEVEL_UNDER_20, fourOperatorIndex, operatorFeedback, sixOperatorIndex, totalLevel } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test("the total level: 99 less the level from 20 up, Dexed's table (from 127) under it", () => {
  assert.equal(TOTAL_LEVEL_UNDER_20.length, 20);
  assert.equal(totalLevel(99), 0);
  assert.equal(totalLevel(20), 79);
  assert.equal(totalLevel(19), 81);
  assert.equal(totalLevel(0), 127);
  assert.equal(totalLevel(10), 96);
});

test("a six-operator index: 13.1227 radians at level 99, the yala table's 6.0168 at 90 down to 0.4472 at 60", () => {
  for (const [level, index] of [
    [99, 13.1227],
    [90, 6.0168],
    [80, 2.5298],
    [70, 1.0636],
    [60, 0.4472],
    [50, 0.188],
  ]) {
    near(sixOperatorIndex(level), index, `level ${level}`, 0.001);
  }
});

test('a six-operator index under 20: 0.013975 at 20, 0.003204 at 10, 0.000218 at 0', () => {
  for (const [level, index] of [
    [20, 0.013975],
    [10, 0.003204],
    [0, 0.000218],
  ]) {
    near(sixOperatorIndex(level), index, `level ${level}`, 0.00001);
  }
});

test('a four-operator index: 8π at level 99, 10.567 at 89, 7.472 at 85, π at 75', () => {
  for (const [level, index] of [
    [99, 25.1327],
    [89, 10.567],
    [85, 7.472],
    [75, 3.1416],
  ]) {
    near(fourOperatorIndex(level), index, `level ${level}`, 0.001);
  }
});

test('the operator feedback: 0 at 0, then 2 to the (feedback less 8): 1/128 at 1, 0.25 at 6, 0.5 at 7', () => {
  assert.equal(operatorFeedback(0), 0);
  assert.equal(operatorFeedback(1), 1 / 128);
  assert.equal(operatorFeedback(6), 0.25);
  assert.equal(operatorFeedback(7), 0.5);
});
