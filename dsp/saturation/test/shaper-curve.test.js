// The shaper curve's unit tests (mockup/src/libs/dsp/saturation/): a waveshaper's curve from its drive and its
// shape. No audio in node: the curve's table read as numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shaperCurve, CURVE_POINTS } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

// the curve at an input between -1 and 1, as a WaveShaper reads it
const through = (curve, x) => {
  const at = ((x + 1) / 2) * (curve.length - 1);
  const i = Math.min(curve.length - 2, Math.floor(at));
  return curve[i] + (curve[i + 1] - curve[i]) * (at - i);
};

test("the shaper's curve: odd, through the middle, a point at 0 so silence stays silent", () => {
  const curve = shaperCurve(4, 0.3);
  assert.equal(curve.length, CURVE_POINTS);
  assert.equal(CURVE_POINTS % 2, 1);
  assert.equal(curve[(CURVE_POINTS - 1) / 2], 0);
  for (const x of [0.1, 0.5, 0.9]) {
    near(through(curve, x) + through(curve, -x), 0, `odd at ${x}`, 1e-6);
  }
});

test('the shaper passes a quiet sound as it comes and bends a loud one, never louder than it came', () => {
  for (const drive of [1, 4, 16]) {
    for (const shape of [0, 0.5, 1]) {
      const curve = shaperCurve(drive, shape);
      near(through(curve, 0.001) / 0.001, 1, `drive ${drive} shape ${shape}: quiet at unity`, 0.02);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        assert.ok(Math.abs(curve[i]) <= Math.abs(x) + 1e-6, `drive ${drive} shape ${shape}: louder at ${x}`);
      }
    }
  }
  assert.ok(
    through(shaperCurve(16, 0), 1) < through(shaperCurve(2, 0), 1),
    'more drive, a full-scale peak bent further',
  );
});

test("the shaper's shape: a harder knee holds the sound straighter up to it, then flatter past it", () => {
  const soft = shaperCurve(4, 0);
  const hard = shaperCurve(4, 1);
  assert.ok(through(hard, 0.15) > through(soft, 0.15), 'below the knee: straighter');
  const slope = (curve) => through(curve, 1) - through(curve, 0.8);
  assert.ok(slope(hard) < slope(soft), 'past the knee: flatter, near a clip');
});
