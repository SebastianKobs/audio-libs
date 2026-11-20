// The curve blocks' drawings registered by their kinds (mockup/src/libs/modular-audio/view/device/models/custom-views.ts):
// a device of a shaper's kind gets a shaper's drawing, a saturation's its own, any other kind none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curveDrawings, saturationDrawing, shaperDrawing, ViewBuilder } from '../index.ts';
import { planReadoutOf } from '../../readout/test/plan-readout.js';
import { lone } from './lone-block.js';

const deviceOf = (kind) => new ViewBuilder(planReadoutOf(lone(kind)), () => {}).device([]);

test("a device of the shaper's kind gets the shaper's drawing, a saturation's its own, drawn from its knobs", () => {
  const drawings = curveDrawings();
  for (const [kind, drawing] of [
    ['shaper', shaperDrawing],
    ['saturation', saturationDrawing],
  ]) {
    const device = deviceOf(kind);
    const drawn = drawings.of(device)(device, { steps: 33 });
    assert.deepEqual(drawn, drawing(device, { steps: 33 }), kind);
    assert.equal(drawn.levels.length, 33, kind);
  }
});

test('a device of another kind gets no drawing; each call a registry of its own, as no model keeps state as it loads', () => {
  assert.equal(curveDrawings().of(deviceOf('tilt')), undefined);
  assert.notEqual(curveDrawings(), curveDrawings());
});
