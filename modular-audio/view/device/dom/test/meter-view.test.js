// The level meters' unit tests (mockup/src/libs/modular-audio/view/device/dom/meter-view.ts; mockup/src/mixer-surface/meters.ts until LAY12d1): where a level shows on a meter's scale;
// how it falls, a model's since SHAPE5a0a3c (libs/modular-audio/view/device/models/test/meters.test.js). Where the desk takes its peaks is the builder's (builder.test.js). Where a gain shows on a fader, its law, a param's
// taper since U2c4a (libs/base/params/test/taper.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meterPosition } from '../index.ts';

test("a meter's scale, as a console's aligned to digital: even in dB, -18 dBFS at two thirds, the fader's unity mark, full scale at the top", () => {
  const dB = (d) => 10 ** (d / 20);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(meterPosition(dB(-18)), 2 / 3), '-18 dBFS, 0 VU as EBU R68 aligns it: the unity mark');
  assert.ok(near(meterPosition(dB(-36)), 1 / 3), 'even in dB: 18 dB a third');
  assert.ok(near(meterPosition(1), 1), 'full scale: the top');
  assert.equal(meterPosition(2), 1, 'past full scale: the top');
  assert.equal(meterPosition(dB(-60)), 0, 'below -54 dB: the bottom');
  assert.equal(meterPosition(0), 0, 'silence');
});
