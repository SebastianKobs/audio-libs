// Where a level shows on a meter's scale (libs/modular-audio/view/device/dom/meter-view.ts), in node: even in dB, a console's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meterPosition } from '../index.ts';
import { isNear } from '../../../../../base/util/test/near.js';

test("a meter's scale, as a console's aligned to digital: even in dB, -18 dBFS at two thirds, the fader's unity mark, full scale at the top", () => {
  const dB = (d) => 10 ** (d / 20);
  isNear(meterPosition(dB(-18)), 2 / 3, '-18 dBFS, 0 VU as EBU R68 aligns it: the unity mark');
  isNear(meterPosition(dB(-36)), 1 / 3, 'even in dB: 18 dB a third');
  isNear(meterPosition(1), 1, 'full scale: the top');
  assert.equal(meterPosition(2), 1, 'past full scale: the top');
  assert.equal(meterPosition(dB(-60)), 0, 'below -54 dB: the bottom');
  assert.equal(meterPosition(0), 0, 'silence');
});
