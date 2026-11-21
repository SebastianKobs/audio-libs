// base/util/maths.ts: a value clamped, eased, approaching a target or stepped toward it,
// and an angle or a place wrapped, as each is promised to every package
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approach, clamp, clamp01, modulo, SETTLED, smoothstep, stepToward, wrapToTile } from '../index.ts';
import { isNear, near } from './near.js';

test('smoothstep, as GLSL has it: 0 up to the low edge, 1 from the high one, eased between; edges the other way round, falling', () => {
  assert.deepEqual(
    [smoothstep(2, 4, 1), smoothstep(2, 4, 2), smoothstep(2, 4, 3), smoothstep(2, 4, 4), smoothstep(2, 4, 5)],
    [0, 0, 0.5, 1, 1],
  );
  assert.equal(smoothstep(0, 1, 0.25), 0.15625, 'eased: 3x² - 2x³');
  assert.deepEqual(
    [smoothstep(40, 32, 30), smoothstep(40, 32, 36), smoothstep(40, 32, 41)],
    [1, 0.5, 0],
    'falling from the low edge to the high',
  );
});

test('a value clamped between a low and a high: itself between them, else the edge it passed', () => {
  assert.deepEqual([clamp(-2, -1, 1), clamp(0.5, -1, 1), clamp(3, -1, 1)], [-1, 0.5, 1]);
  assert.deepEqual([clamp(5, 0, Infinity), clamp(-5, -Infinity, 0)], [5, -5], 'an open edge holds nothing back');
});

test('a value clamped between 0 and 1: itself between them, else the edge it passed', () => {
  assert.deepEqual([clamp01(-0.5), clamp01(0.25), clamp01(1.5)], [0, 0.25, 1]);
  assert.deepEqual([clamp01(0), clamp01(1)], [0, 1], 'the edges themselves');
});

test('a value wrapped into half a tile either side of 0: a thing tiled round the view, so a floor never ends', () => {
  assert.deepEqual([wrapToTile(3, 10), wrapToTile(7, 10), wrapToTile(-7, 10)], [3, -3, 3], 'the nearest copy');
  assert.deepEqual([wrapToTile(10, 10), wrapToTile(-10, 10), wrapToTile(23, 10)], [0, 0, 3], 'whole tiles round');
});

test('a value modulo a size, never below 0, as a wheel of that many steps counts: -1 the last step', () => {
  assert.deepEqual([modulo(7, 5), modulo(-1, 5), modulo(-6, 5), modulo(0, 5)], [2, 4, 4, 0]);
  assert.equal(modulo(-0.25, 1), 0.75, 'a fraction too');
});

test("a value approaching its target by a time constant, as Web Audio's setTargetAtTime: each moment the same fraction of the way left", () => {
  assert.equal(approach(1, 0, 0, 0.1), 1, 'where it started from, at first');
  near(approach(1, 0, 0.1, 0.1), Math.exp(-1), 'a time constant on: 1/e of the way left');
  near(approach(0, 2, 0.2, 0.1), 2 - 2 * Math.exp(-2), 'rising the same way');
  assert.ok(
    isNear(approach(1, 0, SETTLED * 0.1, 0.1), 0, 0.01),
    'settled after SETTLED time constants: within 1 % of the way',
  );
});

test('a value stepped toward its target a frame at a time: the step over the time of the way, all of it once the step is the time or more', () => {
  assert.equal(stepToward(0, 2, 0.05, 0.1), 1, 'half the time: half the way');
  assert.equal(stepToward(4, 0, 0.025, 0.1), 3, 'a quarter of the time: a quarter of the way down');
  assert.equal(stepToward(1, 3, 0.2, 0.1), 3, 'a step past the time: all of the way');
  assert.equal(stepToward(1, 3, 0, 0.1), 1, 'no time passed: no step');
});
