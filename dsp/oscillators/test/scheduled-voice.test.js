// The scheduled voice's unit tests (mockup/src/libs/dsp/oscillators/): a voice made a source, told its start and its stop by message
// in the context's seconds: silent before its start, sounding from its first frame, silent and let go once stopped. No audio:
// fed blocks of Float32Arrays, its output read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScheduledVoice } from '../index.ts';

const RATE = 48000;
const BLOCK = 128;
const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);

// a voice that sounds 1 in every frame it's asked for, and keeps what it was asked for
function steadyVoice() {
  const asked = [];
  return {
    asked,
    render(out, from, to, params, sampleRate) {
      asked.push({ from, to, params, sampleRate });
      out.fill(1, from, to);
    },
  };
}
const blocks = (channels = 1) => [Array.from({ length: channels }, () => new Float32Array(BLOCK))];
const at = (currentTime) => ({ sampleRate: RATE, currentTime });

test("silent until it's started, nothing asked of its voice; kept running", () => {
  const voice = steadyVoice();
  const source = new ScheduledVoice(voice);
  const outputs = blocks();
  assert.equal(source.process(outputs, {}, at(1)), true);
  assert.equal(peak(outputs[0][0]), 0);
  assert.deepEqual(voice.asked, []);
});

test('sounding from the frame of its start, silent before it', () => {
  const voice = steadyVoice();
  const source = new ScheduledVoice(voice);
  source.told({ start: 1 + 64 / RATE });
  const outputs = blocks();
  assert.equal(source.process(outputs, { frequency: new Float32Array([220]) }, at(1)), true);
  assert.equal(peak(outputs[0][0].subarray(0, 64)), 0, 'silent before its start');
  assert.equal(peak(outputs[0][0].subarray(64)), 1, 'sounding from it');
  assert.deepEqual(
    [voice.asked[0].from, voice.asked[0].to, voice.asked[0].sampleRate],
    [64, BLOCK, RATE],
    'its voice asked for those frames at the rate',
  );
  assert.deepEqual(voice.asked[0].params.frequency, new Float32Array([220]), 'handed the params');
});

test('a start in the past sounds from the first frame; one past this block sounds nothing yet', () => {
  const started = new ScheduledVoice(steadyVoice());
  started.told({ start: 0.5 });
  const heard = blocks();
  started.process(heard, {}, at(1));
  assert.equal(peak(heard[0][0]), 1);
  const later = new ScheduledVoice(steadyVoice());
  later.told({ start: 2 });
  const silent = blocks();
  assert.equal(later.process(silent, {}, at(1)), true);
  assert.equal(peak(silent[0][0]), 0);
});

test('stopped within a block: sounding up to its frame, then let go; the next block silent and let go', () => {
  const source = new ScheduledVoice(steadyVoice());
  source.told({ start: 1 });
  source.told({ stop: 1 + 32 / RATE });
  const outputs = blocks();
  assert.equal(source.process(outputs, {}, at(1)), false, 'let go: a stopped source never sounds again');
  assert.equal(peak(outputs[0][0].subarray(0, 32)), 1);
  assert.equal(peak(outputs[0][0].subarray(32)), 0, 'silent from its stop');
  const after = blocks();
  assert.equal(source.process(after, {}, at(1 + BLOCK / RATE)), false);
  assert.equal(peak(after[0][0]), 0);
});

test('a stop is never taken back: the earliest told stands; a stop of 0 is a stop now', () => {
  const source = new ScheduledVoice(steadyVoice());
  source.told({ start: 1 });
  source.told({ stop: 1 + 32 / RATE });
  source.told({ stop: 5 });
  const outputs = blocks();
  source.process(outputs, {}, at(1));
  assert.equal(peak(outputs[0][0].subarray(32)), 0, 'the later stop leaves the earlier');
  const now = new ScheduledVoice(steadyVoice());
  now.told({ start: 1 });
  now.told({ stop: 0 });
  assert.equal(now.process(blocks(), {}, at(1)), false);
});

test("one mono output copied to every channel; a message that isn't a time is left out; no output, kept running", () => {
  const source = new ScheduledVoice(steadyVoice());
  source.told({ start: 'now', stop: Number.NaN });
  source.told(null);
  source.told({ start: 1 });
  const outputs = blocks(2);
  assert.equal(source.process(outputs, {}, at(1)), true, "the bad stop didn't stop it");
  assert.deepEqual(outputs[0][1], outputs[0][0], 'the other channel the same');
  assert.equal(peak(outputs[0][0]), 1);
  assert.equal(source.process([], {}, at(1)), true);
  assert.equal(source.process([[]], {}, at(1)), true);
});
