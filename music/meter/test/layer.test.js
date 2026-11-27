// A layer across the bar line (music/meter/layer.ts): a cycle of its own length, its positions over a span, where it meets the one
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerPositions, meterOf, resolvesAt } from '../index.ts';

const FOUR_FOUR = meterOf('4', 4);

test('3 beats over 4/4: a cycle on 0, 3, 6 and 9, back on a bar’s one after 12 beats, 3 bars', () => {
  const layer = { length: 3 };
  assert.deepEqual(layerPositions(layer, 0, 12), [0, 3, 6, 9]);
  assert.equal(resolvesAt(layer, FOUR_FOUR), 12);
});

test('a dotted 8th over 4/4: every 0.75 of a beat, back on the one after 16 cycles, 3 bars', () => {
  const layer = { length: 0.75 };
  assert.deepEqual(layerPositions(layer, 0, 4), [0, 0.75, 1.5, 2.25, 3, 3.75]);
  assert.equal(resolvesAt(layer, FOUR_FOUR), 12);
});

test('a span begun inside the layer: its cycles from the first at or after the span’s start, before its end', () => {
  assert.deepEqual(layerPositions({ length: 3 }, 4, 10), [6, 9]);
  assert.deepEqual(layerPositions({ length: 3 }, 3, 9), [3, 6]);
});

test('positions inside each cycle, beats into it: a cycle of 3 with a hit on its start and halfway', () => {
  assert.deepEqual(layerPositions({ length: 3, offsets: [0, 1.5] }, 0, 6), [0, 1.5, 3, 4.5]);
  assert.deepEqual(layerPositions({ length: 3, offsets: [1.5, 0] }, 0, 6), [0, 1.5, 3, 4.5], 'in time order');
});

test('where it resolves over other bars and lengths: 3 over 3.5 beats, quarter triplets, 5 16ths', () => {
  assert.equal(resolvesAt({ length: 3 }, meterOf('3+2+2', 8)), 21);
  assert.equal(resolvesAt({ length: 2 / 3 }, FOUR_FOUR), 4, 'half-note triplets, 6 to the bar');
  assert.equal(resolvesAt({ length: 1.25 }, FOUR_FOUR), 20);
  assert.equal(resolvesAt({ length: 4 }, FOUR_FOUR), 4, 'a layer a bar long: the next bar');
});

test('a length no fraction of whole numbers gives never comes back to the one', () => {
  assert.equal(resolvesAt({ length: Math.PI }, FOUR_FOUR), Infinity);
});
