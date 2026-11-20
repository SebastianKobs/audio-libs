// How late an oversampled WaveShaper comes out (mockup/src/libs/modular-audio/build/web-audio/shaper-lags.ts), measured by a click
// rendered offline through it at each oversampling: read from the offline context handed in, Chromium's where the render fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHROMIUM_LAGS, measuredLags } from '../index.ts';
import { FIREFOX_LAGS, offlineShaperWith } from './offline-shaper.js';

test("a click rendered through a shaper at each oversampling, read back: Firefox's lags, one render each", async () => {
  const counted = { renders: 0 };
  assert.deepEqual(await measuredLags(44100, offlineShaperWith(FIREFOX_LAGS, counted)), FIREFOX_LAGS);
  assert.equal(counted.renders, 3);
});

test('measured again, measured anew: nothing is kept between calls, the context that asks keeps what it found', async () => {
  const counted = { renders: 0 };
  const Offline = offlineShaperWith(FIREFOX_LAGS, counted);
  await measuredLags(44100, Offline);
  await measuredLags(44100, Offline);
  assert.equal(counted.renders, 6);
});

test("a render that fails gives Chromium's lags, 128 samples at 2x and 192 at 4x", async () => {
  class Failing {
    createBuffer() {
      throw new Error('no offline audio');
    }
  }
  assert.deepEqual(await measuredLags(44100, Failing), CHROMIUM_LAGS);
  assert.deepEqual(CHROMIUM_LAGS, { none: 0, '2x': 128, '4x': 192 });
});
