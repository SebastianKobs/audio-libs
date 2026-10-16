// The level meters' unit tests (mockup/src/libs/view/dom/meter-view.ts; mockup/src/mixer-surface/meters.ts until LAY12d1): where a level shows on a meter's scale,
// and how it falls. Where the desk takes its peaks is the engine's (engine.test.js). Where a gain shows on a fader, its law, a param's
// taper since U2c4a (libs/synth/test/taper.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meterFall, meterPosition } from '../index.ts';

test("a meter's fall, as a DIN peak meter's: up at once to a peak, back down 20 dB in 1.5 s, silence below -80 dB", () => {
  assert.equal(meterFall(0, 0.5, 0.016), 0.5, 'up at once');
  assert.ok(Math.abs(20 * Math.log10(meterFall(1, 0, 1.5)) + 20) < 1e-9, '1.5 s: 20 dB down');
  assert.equal(meterFall(0.5, 0.6, 1), 0.6, 'a louder peak while it falls: up to it');
  assert.equal(meterFall(1e-4, 0, 0.1), 0, 'below -80 dB: silence');
});

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
