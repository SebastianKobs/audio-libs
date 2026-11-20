// A saturation's curve as a view draws it (mockup/src/libs/modular-audio/view/device/models/saturation.ts), from its knobs and its
// style as they're set: what the sound comes out at across its input, -1 to 1, its curve driven, its level taken back.
// And each of the Drive's blocks a device of its own: a knob for each ranged param, a choice for each with choices, in its block's order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Choice, Knob, saturationDrawing, ViewBuilder } from '../index.ts';
import { BLOCKS } from '../../../../plan/blocks/index.ts';
import { planReadoutOf } from '../../readout/test/plan-readout.js';
import { lone } from './lone-block.js';

test("each of the Drive's blocks a device: a knob for each ranged param, a choice for each with choices, in its block's order", () => {
  for (const kind of ['saturation', 'one pole', 'tilt', 'shaper lag']) {
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

test("a saturation's drive a knob in dB, as a gain's is shown", () => {
  const device = new ViewBuilder(planReadoutOf(lone('saturation')), () => {}).device([]);
  const drive = device.controls.find(({ name }) => name === 'drive');
  assert.equal(drive.unit, 'dB');
  assert.equal(drive.text, '0.0', 'a share of 1: 0 dB');
});

test("the saturation's curve drawn from its knobs and its style: through the middle, its knee nearer it as it's driven", () => {
  const plan = lone('saturation');
  const at = (values) =>
    saturationDrawing(new ViewBuilder(planReadoutOf(plan, { values }), () => {}).device([]), { steps: 33 });
  const gentle = at({ drive: 1, auto: 0 });
  const hard = at({ drive: 10 ** (24 / 20), auto: 0 });
  assert.equal(gentle.levels.length, 33);
  assert.equal(gentle.levels[16], 0);
  const bent = ({ levels }) => levels[20] / levels.at(-1); // a quarter of the way up, against the top
  assert.ok(bent(hard) > bent(gentle), 'driven harder: flat sooner');
  const triode = at({ drive: 10 ** (12 / 20), auto: 0, style: 'triode' });
  assert.ok(Math.abs(triode.levels[0]) > Math.abs(triode.levels.at(-1)), 'the triode lopsided: its bottom bends later');
});
