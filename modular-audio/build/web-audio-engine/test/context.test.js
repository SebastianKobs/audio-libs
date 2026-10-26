// The audio context a plan is built in, on a clock (mockup/src/libs/modular-audio/build/web-audio-engine/context.ts), on the
// stand-in for Web Audio: made at a low latency; a clock's time put on the context's, never into its past.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio/test/audio-stand-in.js';
import { ClockedContext } from '../index.ts';

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
