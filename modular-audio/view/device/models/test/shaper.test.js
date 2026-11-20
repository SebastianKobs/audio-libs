// A shaper's curve as a view draws it (mockup/src/libs/modular-audio/view/device/models/shaper.ts), from its knobs as they're set:
// what the sound comes out at across its input, -1 to 1, bent as it's driven.
// And each of the plain blocks a device of its own: a knob for each ranged param, a choice for each with choices, in its block's order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Choice, Knob, shaperDrawing, ViewBuilder } from '../index.ts';
import { BLOCKS } from '../../../../plan/blocks/index.ts';
import { planReadoutOf } from '../../readout/test/plan-readout.js';
import { lone } from './lone-block.js';

test("each of the plain blocks a device: a knob for each ranged param, a choice for each with choices, in its block's order", () => {
  for (const kind of ['shaper', 'eq band', 'compressor', 'wow', 'room']) {
    const device = new ViewBuilder(planReadoutOf(lone(kind)), () => {}).device([]);
    assert.equal(device.kind, kind);
    assert.deepEqual(
      device.controls.map(({ name }) => name),
      BLOCKS[kind].params.map(({ name }) => name),
      kind,
    );
    for (const [index, spec] of BLOCKS[kind].params.entries()) {
      assert.ok(device.controls[index] instanceof (spec.choices ? Choice : Knob), `${kind}/${spec.name}`);
    }
  }
});

test("the shaper's drive a knob in dB, as a gain's is shown", () => {
  const device = new ViewBuilder(planReadoutOf(lone('shaper')), () => {}).device([]);
  const drive = device.controls.find(({ name }) => name === 'drive');
  assert.equal(drive.unit, 'dB');
  assert.equal(drive.text, '0.0', 'a share of 1: 0 dB');
});

test("the shaper's curve drawn from its device's knobs: through the middle, bending as it's driven", () => {
  const plan = lone('shaper');
  const at = (drive) => {
    const device = new ViewBuilder(planReadoutOf(plan, { values: { drive } }), () => {}).device([]);
    return shaperDrawing(device, { steps: 33 });
  };
  const soft = at(1);
  const hard = at(16);
  assert.equal(soft.levels.length, 33);
  assert.equal(soft.levels[16], 0);
  assert.ok(hard.levels.at(-1) < soft.levels.at(-1), 'driven harder: its top bent lower');
  assert.ok(hard.levels.every((level) => Math.abs(level) <= 1));
});
