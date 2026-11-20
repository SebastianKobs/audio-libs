// The lookahead limiter's unit tests (mockup/src/libs/dsp/true-peak/): a soft clip into a limiter looking ahead
// 1.5 to 5 ms, run in the stream, a sample in and a sample out, its ceiling -1 dB true peak judged by the meter.
// Fed Float32Arrays in blocks of 128 and its output read. Every reading is said in the test's output, so a miss
// shows each beside what it should be.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LookaheadLimiter, measureTruePeak, softClipped } from '../index.ts';
import { isNear } from '../../../base/util/test/near.js';

const RATE = 48000;
const BLOCK = 128;
const DEFAULTS = { gain: 0, ceiling: -1, release: 0.1, clip: 3 };

// ----- the measures
const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
const dB = (ratio) => 20 * Math.log10(ratio);
const truePeakDb = (channels) => dB(measureTruePeak(channels));
const countNotFinite = (samples) => samples.reduce((count, x) => count + (Number.isFinite(x) ? 0 : 1), 0);
const leastOf = (samples) => samples.reduce((least, x) => Math.min(least, x), Infinity);
const firstIndexWhere = (samples, test) => samples.findIndex(test);
// a seeded random, 0 to 1 (a linear congruence, so no library is needed)
function seeded(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// ----- the readings: each said in the test's output, all checked together
const within = (what, value, expected, tolerance) => ({
  what,
  value,
  expected: `${expected} ± ${tolerance}`,
  ok: isNear(value, expected, tolerance),
});
const atMost = (what, value, most) => ({ what, value, expected: `≤ ${most}`, ok: value <= most });
const atLeast = (what, value, least) => ({ what, value, expected: `≥ ${least}`, ok: value >= least });
const between = (what, value, least, most) => ({
  what,
  value,
  expected: `${least} to ${most}`,
  ok: value >= least && value <= most,
});
function expectAll(t, readings) {
  const lines = readings.map(
    ({ what, value, expected, ok }) => `${ok ? 'ok ' : 'MISS'} ${what}: ${Number(value).toPrecision(6)} (${expected})`,
  );
  lines.forEach((line) => t.diagnostic(line));
  const missed = lines.filter((line) => line.startsWith('MISS'));
  assert.ok(missed.length === 0, `\n${lines.join('\n')}`);
}

// ----- the signals
const sine = (hz, level, length = RATE) =>
  Float32Array.from({ length }, (_, i) => level * Math.sin((2 * Math.PI * hz * i) / RATE));
const noise = (level, length, seed) => {
  const draw = seeded(seed);
  return Float32Array.from({ length }, () => level * (draw() * 2 - 1));
};

// channels fed through a new limiter in blocks of 128, then latency + 64 frames of silence so a cut-off wave isn't read as a peak
function limited(channels, { lookahead = 0.005, params = {}, tail = true } = {}) {
  const limiter = new LookaheadLimiter({ sampleRate: RATE, lookahead });
  const length = channels[0].length + (tail ? limiter.latency + 64 : 0);
  const fed = channels.map((channel) => {
    const padded = new Float32Array(length);
    padded.set(channel);
    return padded;
  });
  const outputs = channels.map(() => new Float32Array(length));
  for (let from = 0; from < length; from += BLOCK) {
    const frames = Math.min(BLOCK, length - from);
    limiter.render(
      fed.map((channel) => channel.subarray(from, from + frames)),
      outputs.map((channel) => channel.subarray(from, from + frames)),
      frames,
      { ...DEFAULTS, ...params },
    );
  }
  return { outputs, limiter };
}

// ----- the soft clip
test('softClipped: straight under its threshold, never over its limit, no kink between', (t) => {
  const slope = (softClipped(0.8001, 0.8, 1.2) - softClipped(0.8, 0.8, 1.2)) / 0.0001;
  let falls = 0;
  let previous = softClipped(-3, 0.8, 1.2);
  for (let i = 1; i <= 600; i++) {
    const clipped = softClipped(-3 + i * 0.01, 0.8, 1.2);
    falls += clipped < previous ? 1 : 0;
    previous = clipped;
  }
  expectAll(t, [
    within('0.5 under the threshold', softClipped(0.5, 0.8, 1.2), 0.5, 0),
    within('-0.5 under the threshold', softClipped(-0.5, 0.8, 1.2), -0.5, 0),
    between('100 far over', softClipped(100, 0.8, 1.2), 1.19, 1.2),
    atMost('100 never over the limit', softClipped(100, 0.8, 1.2), 1.2),
    within('slope from 0.8 to 0.8001', slope, 1, 0.001),
    within('steps where it falls, -3 to 3 by 0.01', falls, 0, 0),
    within('limit equal to the threshold', softClipped(2, 0.8, 0.8), 0.8, 0),
    within('limit equal to the threshold, negative', softClipped(-2, 0.8, 0.8), -0.8, 0),
  ]);
});

test("softClipped: a limit of Infinity hands every sample back untouched, as an export mustn't clip", (t) => {
  expectAll(t, [
    within('3 under an infinite limit', softClipped(3, 0.8, Infinity), 3, 0),
    within('-3 under an infinite limit', softClipped(-3, 0.8, Infinity), -3, 0),
    within('100 under an infinite limit', softClipped(100, 0.8, Infinity), 100, 0),
  ]);
});

test('a clip of Infinity: a sine at 2 comes out 264 samples late with its shape, its true peak under -1.0', (t) => {
  const input = sine(997, 2);
  const { outputs } = limited([input], { params: { clip: Infinity } });
  const out = outputs[0];
  // the gain falls slowly enough that the output stays a sine: compare its shape to the input's, scaled
  const at = 20000;
  const ratio = out[at + 264] / input[at];
  let most = 0;
  for (let i = at; i < at + 20; i++) {
    most = Math.max(most, Math.abs(out[i + 264] / input[i] - ratio));
  }
  expectAll(t, [
    atMost('dBTP', truePeakDb(outputs), -1.0),
    atMost('the gain wobble over 20 samples', most, 0.001),
    between('the gain it settled at', ratio, 0.3, 0.5),
  ]);
});

// ----- the latency
test('latency: 264 at the default, 96 at a lookahead of 0.0015; an impulse of 0.5 at 1000 comes out at 1264, the largest there', (t) => {
  const impulse = new Float32Array(3000);
  impulse[1000] = 0.5;
  const { outputs } = limited([impulse]);
  const out = outputs[0];
  const at = out.indexOf(peak(out));
  expectAll(t, [
    within('latency at 5 ms', new LookaheadLimiter({ sampleRate: RATE }).latency, 264, 0),
    within('latency at 1.5 ms', new LookaheadLimiter({ sampleRate: RATE, lookahead: 0.0015 }).latency, 96, 0),
    within('the impulse comes out at', at, 1264, 0),
    within('its level', out[1264], 0.5, 0),
    within('the next sample is its own silence', out[1265], 0, 0),
  ]);
});

// ----- under the ceiling nothing changes
test('under the ceiling nothing changes: a 1 kHz sine at 0.5 comes out bit-equal, 264 samples late, reduced() 0', (t) => {
  const input = sine(1000, 0.5);
  const { outputs, limiter } = limited([input]);
  const out = outputs[0];
  const latency = limiter.latency;
  let firstDifference = -1;
  for (let i = 0; i < input.length && firstDifference === -1; i++) {
    if (out[i + latency] !== input[i]) {
      firstDifference = i;
    }
  }
  expectAll(t, [
    within('the first index where out[i + 264] !== in[i]', firstDifference, -1, 0),
    within('the first 264 samples out, their peak', peak(out.subarray(0, latency)), 0, 0),
    within('reduced()', limiter.reduced(), 0, 0),
  ]);
});

// ----- the ceiling holds
const SIGNALS = {
  'a 997 Hz sine at 2': () => sine(997, 2),
  'a 1 kHz square at ±1.5': () =>
    Float32Array.from({ length: RATE }, (_, i) => (Math.sin((2 * Math.PI * 1000 * i) / RATE + 0.1) >= 0 ? 1.5 : -1.5)),
  'seeded noise at ±2': () => noise(2, RATE, 21),
  'seeded noise at ±8': () => noise(8, RATE, 22),
  'a sine at a quarter of the rate, 45° on, at 1.3': () =>
    Float32Array.from({ length: RATE }, (_, i) => 1.3 * Math.sin((Math.PI / 2) * i + Math.PI / 4)),
  'a click of 3 every 4800 samples from sample 100': () =>
    Float32Array.from({ length: RATE }, (_, i) => (i >= 100 && (i - 100) % 4800 === 0 ? 3 : 0)),
  'a 19 kHz sine at 1.5': () => sine(19000, 1.5),
  'seeded noise at ±6 for 300 samples of every 3000, ±0.2 between': () => {
    const draw = seeded(23);
    return Float32Array.from({ length: RATE }, (_, i) => (i % 3000 < 300 ? 6 : 0.2) * (draw() * 2 - 1));
  },
  'a sweep from 20 Hz to 20 kHz over the second at 1.8': () =>
    Float32Array.from({ length: RATE }, (_, i) => {
      const seconds = i / RATE;
      return 1.8 * Math.sin(2 * Math.PI * (20 * seconds + 9990 * seconds * seconds));
    }),
};

test('the ceiling holds at a lookahead of 5 ms and of 1.5 ms: every true peak between -1.0 and -1.05 dBTP', (t) => {
  const readings = [];
  for (const lookahead of [0.005, 0.0015]) {
    for (const [name, make] of Object.entries(SIGNALS)) {
      const { outputs } = limited([make()], { lookahead });
      const reading = truePeakDb(outputs);
      readings.push(between(`${name}, lookahead ${lookahead}: dBTP`, reading, -1.05, -1.0));
    }
  }
  expectAll(t, readings);
});

// ----- one gain for both channels, ahead of the peak, let go after
test("one gain for both channels: the right one is turned down ahead of the left's burst, 0.0709 at its least, let go after", (t) => {
  const length = 24000;
  const left = new Float32Array(length);
  for (let i = 9600; i < 14400; i++) {
    left[i] = 2 * Math.sin((2 * Math.PI * 441 * (i - 9600)) / RATE); // from phase 0 at its start
  }
  const right = new Float32Array(length).fill(0.1);
  const { outputs } = limited([left, right]);
  const [heardLeft, heardRight] = outputs;
  const first = firstIndexWhere(left, (x) => Math.abs(x) > 0.8904); // the input's: where the gain is wanted
  expectAll(t, [
    within('right at sample 9584', heardRight[9584], 0.1, 1e-6),
    between('right at first + 144', heardRight[first + 144], 0.075, 0.095),
    within('right at first + 264', heardRight[first + 264], 0.0709, 0.001),
    within("right's least sample while it sounds", leastOf(heardRight.subarray(264, length)), 0.0709, 0.001),
    within('right at sample 19463, a release on', heardRight[19463], 0.0893, 0.001),
    atMost("left's largest sample", peak(heardLeft), 0.8905),
  ]);
});

// ----- the clip's share
test("the clip's share: a 997 Hz sine at 4 is taken down 3.0 dB by the limiter at clip 3, under 0.6 at 0, 12.9 at 24, the ceiling kept", (t) => {
  const reading = (clip) => {
    const { outputs, limiter } = limited([sine(997, 4)], { params: { clip } });
    return { reduced: limiter.reduced(), truePeak: truePeakDb(outputs) };
  };
  const [three, zero, twentyFour] = [3, 0, 24].map(reading);
  expectAll(t, [
    within('reduced() at clip 3', three.reduced, 3.0, 0.1),
    atMost('reduced() at clip 0', zero.reduced, 0.6),
    within('reduced() at clip 24', twentyFour.reduced, 12.9, 0.3),
    atMost('dBTP at clip 3', three.truePeak, -1.0),
    atMost('dBTP at clip 0', zero.truePeak, -1.0),
    atMost('dBTP at clip 24', twentyFour.truePeak, -1.0),
  ]);
});

// ----- silence, a channel missing, finite
test("silence in is zeros out; an input channel missing leaves that output silent; no sample that isn't finite", (t) => {
  const silent = limited([new Float32Array(2000)]).outputs[0];
  const loud = sine(997, 2, 4000);
  const limiter = new LookaheadLimiter({ sampleRate: RATE });
  const left = new Float32Array(BLOCK);
  const right = new Float32Array(BLOCK);
  let rightPeak = 0;
  let leftPeak = 0;
  let notFinite = 0;
  for (let from = 0; from + BLOCK <= loud.length; from += BLOCK) {
    limiter.render([loud.subarray(from, from + BLOCK)], [left, right], BLOCK, DEFAULTS);
    rightPeak = Math.max(rightPeak, peak(right));
    leftPeak = Math.max(leftPeak, peak(left));
    notFinite += countNotFinite(left) + countNotFinite(right);
  }
  const hard = limited([noise(8, RATE, 41), noise(8, RATE, 42)], { params: { gain: 24 } }).outputs;
  expectAll(t, [
    within('silence in, its peak out', peak(silent), 0, 0),
    within("the missing channel's peak", rightPeak, 0, 0),
    atLeast('the present channel sounds', leftPeak, 0.1),
    within('samples not finite, a channel missing', notFinite, 0, 0),
    within('samples not finite, noise at ±8 with gain 24', countNotFinite(hard[0]) + countNotFinite(hard[1]), 0, 0),
  ]);
});
