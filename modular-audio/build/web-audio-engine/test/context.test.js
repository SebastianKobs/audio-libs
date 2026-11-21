// The audio context a plan is built in, on a clock (modular-audio/build/web-audio-engine/context.ts), on the
// stand-in for Web Audio: made at a low latency; a clock's time put on the context's, never into its past.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio/test/audio-stand-in.js';
import { FIREFOX_LAGS, offlineShaperWith } from '../../web-audio/test/offline-shaper.js';
import { ClockedContext } from '../index.ts';
import { CHROMIUM_LAGS, NO_WORKLETS } from '../../web-audio/index.ts';

test("a context made at a low latency; a clock's time put on its time, never into its past: a sound due now starts with the next chunk", () => {
  let asked;
  class Context extends StandInContext {
    constructor(options) {
      super(() => 10);
      asked = options;
    }
  }
  const clocked = new ClockedContext({ AudioContext: Context, toContext: (t) => t - 2 });
  assert.deepEqual(asked, { latencyHint: 'interactive' });
  assert.ok(clocked.audioContext instanceof Context);
  assert.equal(clocked.at(13), 11, "the clock's time, on the context's");
  assert.equal(clocked.at(5), 10, 'never into its past');
});

test('processors loaded into the context: its worklets none until they have, then those that loaded, made in this context', async () => {
  class Context extends StandInContext {
    constructor() {
      super(() => 0);
    }
  }
  const clocked = new ClockedContext({ AudioContext: Context });
  assert.equal(clocked.worklets, NO_WORKLETS, 'none until loaded');
  const loading = clocked.loadProcessors({ crusher: 'crusher.js' });
  assert.equal(clocked.worklets, NO_WORKLETS, 'still none while loading');
  await loading;
  assert.deepEqual(clocked.audioContext.audioWorklet.added, ['crusher.js']);
  assert.notEqual(clocked.worklets, NO_WORKLETS);
  const made = [];
  globalThis.AudioWorkletNode = class {
    constructor(...args) {
      made.push(args);
    }
  };
  try {
    const options = { numberOfInputs: 1 };
    assert.ok(clocked.worklets.node(clocked.audioContext, 'crusher', options));
    assert.deepEqual(made, [[clocked.audioContext, 'crusher', options]], "made by the browser's own class");
    assert.equal(clocked.worklets.node(clocked.audioContext, 'grains', options), null, 'one never loaded');
  } finally {
    delete globalThis.AudioWorkletNode;
  }
});

test("the shapers' lags: Chromium's until the context has measured them offline, then the browser's own", async () => {
  class Context extends StandInContext {
    constructor() {
      super(() => 0);
    }
  }
  const clocked = new ClockedContext({ AudioContext: Context, OfflineAudioContext: offlineShaperWith(FIREFOX_LAGS) });
  assert.equal(clocked.shaperLags, CHROMIUM_LAGS, "Chromium's until measured");
  const measuring = clocked.measureShaperLags();
  assert.equal(clocked.shaperLags, CHROMIUM_LAGS, "still Chromium's while measuring");
  await measuring;
  assert.deepEqual(clocked.shaperLags, FIREFOX_LAGS, "the browser's own");
});

test("no offline context handed in: nothing to measure with, Chromium's lags kept", async () => {
  class Context extends StandInContext {
    constructor() {
      super(() => 0);
    }
  }
  const clocked = new ClockedContext({ AudioContext: Context });
  await clocked.measureShaperLags();
  assert.equal(clocked.shaperLags, CHROMIUM_LAGS);
});
