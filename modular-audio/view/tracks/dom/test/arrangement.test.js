// libs/modular-audio/view/tracks/dom/arrangement/pixels.ts: the time in view in pixels, as the
// arrangement's drawer lays it out
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP_PX, placeAt, xOf } from '../arrangement/pixels.ts';

test("a place's x in view, 8 px a 16th from the place at its left edge", () => {
  assert.equal(STEP_PX, 8);
  assert.equal(xOf(100, 52), 48 * STEP_PX, 'the present a bar from the right edge of a view four bars wide');
});

test('the place under an x in the time in view, the other way from xOf', () => {
  assert.equal(placeAt(xOf(77, 52), 52), 77);
  assert.equal(placeAt(0, 52), 52);
});
