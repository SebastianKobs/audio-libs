// The level meters as models (mockup/src/libs/modular-audio/view/device/models/meters.ts, limiter-history.ts): how a level bar
// falls, as a DIN peak meter's, each bar's level kept by its key; the limiter's history, a column each interval, the loudest of its frames.
// Where a level shows on a meter's scale is its drawer's (libs/modular-audio/view/device/dom/test/meter-view.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LimiterHistory, meterFall, Meters } from '../index.ts';

test("a meter's fall, as a DIN peak meter's: up at once to a peak, back down 20 dB in 1.5 s, silence below -80 dB", () => {
  assert.equal(meterFall(0, 0.5, 0.016), 0.5, 'up at once');
  assert.ok(Math.abs(20 * Math.log10(meterFall(1, 0, 1.5)) + 20) < 1e-9, '1.5 s: 20 dB down');
  assert.equal(meterFall(0.5, 0.6, 1), 0.6, 'a louder peak while it falls: up to it');
  assert.equal(meterFall(1e-4, 0, 0.1), 0, 'below -80 dB: silence');
});

test("each strip's level, by its key: up at once to its peak, then falling as a peak meter's; 0 for one never heard", () => {
  const levels = new Meters();
  assert.equal(levels.of('you'), 0);
  assert.equal(levels.fall('you', 0.5, 0.1), 0.5, 'up at once');
  const fallen = levels.fall('you', 0, 0.75);
  assert.ok(fallen < 0.5 && fallen > 0.05, `10 dB down after 0.75 s: ${fallen}`);
  assert.equal(levels.of('you'), fallen, 'kept');
});

test("the limiter's history: silent at first; each column the loudest of its frames, pushed once its interval is spent, the oldest let go", () => {
  const history = new LimiterHistory({ columns: 3, column: 0.1 });
  const silent = { in: 0, out: 0, gr: 0 };
  assert.deepEqual(history.columns, [silent, silent, silent]);
  history.heard({ in: 0.5, out: 0.4, gr: 1 }, 0.06);
  assert.deepEqual(history.columns, [silent, silent, silent], 'its interval not spent yet');
  history.heard({ in: 0.3, out: 0.2, gr: 2 }, 0.06);
  assert.deepEqual(history.columns, [silent, silent, { in: 0.5, out: 0.4, gr: 2 }], 'the loudest of its frames');
  history.heard({ in: 0.1, out: 0.1, gr: 0 }, 0.25);
  assert.deepEqual(
    history.columns,
    [{ in: 0.5, out: 0.4, gr: 2 }, { in: 0.1, out: 0.1, gr: 0 }, silent],
    'a long frame: its peaks in one column, then silence, the oldest let go',
  );
});
