// The true-peak meter's and limiter's unit tests (mockup/src/libs/dsp/true-peak/): the points between the samples
// counted on an upsampled copy, and a limiter that leaves none of them over its ceiling
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitTruePeak, LookaheadLimiter, measureTruePeak } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 44100;
const INTERPOLATION_REACH = 12; // samples each side of a point the detector reads
const CEILING_DB = -0.3;
const CEILING = 10 ** (CEILING_DB / 20);

function toDb(linear) {
  return 20 * Math.log10(linear);
}

function tone(frequency, amplitude, phase, frames) {
  return Float32Array.from(
    { length: frames },
    (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * (i / RATE) + phase),
  );
}

function square(frequency, amplitude, frames) {
  return Float32Array.from({ length: frames }, (_, i) =>
    Math.sin(2 * Math.PI * frequency * (i / RATE)) >= 0 ? amplitude : -amplitude,
  );
}

// a small repeatable generator, so no library is needed to seed one
function seededNoise(seed, amplitude, frames) {
  let state = seed >>> 0;
  return Float32Array.from({ length: frames }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return amplitude * (state / 2147483648 - 1);
  });
}

function samplePeak(channels) {
  return Math.max(
    ...channels.map((channel) => channel.reduce((loudest, value) => Math.max(loudest, Math.abs(value)), 0)),
  );
}

// a raised-cosine fade in and out, so a start from silence doesn't ring, as the points past the ends count as 0
function faded(channel) {
  const fade = 500;
  return channel.map((value, i) => {
    const edge = Math.min(i, channel.length - 1 - i);
    return edge >= fade ? value : value * 0.5 * (1 - Math.cos((Math.PI * edge) / fade));
  });
}

// samples at 3 dB under the peak: a quarter-rate sine whose samples fall 45 degrees either side of its crest
const hiddenCrest = (amplitude) => tone(RATE / 4, amplitude, Math.PI / 4, RATE);

test('the meter: a sine at a quarter of the rate, its samples 3 dB under its crest, reads its crest', () => {
  const channels = [faded(hiddenCrest(1))];
  near(samplePeak(channels), Math.SQRT1_2, 'sample peak', 1e-6);
  near(measureTruePeak(channels), 1, 'true peak, 8x', 1e-3);
  near(measureTruePeak(channels, 4), 1, 'true peak, 4x', 1e-3);
});

test('the meter: a tone at 0.4 of the rate, any phase, reads its amplitude within a tenth of a dB', () => {
  for (const phase of [0, 0.7, 1.9, 3.1]) {
    const peak = measureTruePeak([faded(tone(0.4 * RATE, 0.8, phase, 4000))]);
    assert.ok(Math.abs(toDb(peak / 0.8)) < 0.1, `phase ${phase} read ${toDb(peak / 0.8)} dB off`);
  }
});

test('the meter: one time over reads the sample peak, the loudest channel counts, silence reads 0', () => {
  const quiet = tone(1000, 0.2, 0, 500);
  const loud = tone(1000, 0.6, 0, 500);
  near(measureTruePeak([quiet, loud], 1), samplePeak([loud]), 'sample peak');
  assert.ok(measureTruePeak([quiet, loud]) >= measureTruePeak([quiet]));
  assert.equal(measureTruePeak([new Float32Array(100)]), 0);
});

test('the meter: counts the points past either end of the file as zero, so a hard start rings over its level, and refuses a rate of oversampling that is not a whole number', () => {
  assert.ok(measureTruePeak([Float32Array.of(0.9, 0.9, 0.9, 0.9)]) > 0.9, 'a step up from silence overshoots');
  assert.ok(measureTruePeak([hiddenCrest(1)]) > 1.005, 'a hard start rings');
  assert.throws(() => measureTruePeak([new Float32Array(10)], 0), /whole number/);
  assert.throws(() => measureTruePeak([new Float32Array(10)], 2.5), /whole number/);
});

const HOT_SIGNALS = {
  'a quarter-rate sine hiding its crest, 1.5 up': () => [hiddenCrest(1.5)],
  'a tone at 0.45 of the rate': () => [tone(0.45 * RATE, 1.4, 0.3, RATE)],
  'a tone at 0.49 of the rate': () => [tone(0.49 * RATE, 1.4, 1.1, RATE)],
  'a square wave at 100 Hz, 1.3 up': () => [square(100, 1.3, RATE)],
  'a square wave at 100 Hz at exactly full scale': () => [square(100, 1, RATE)],
  'two channels of different loudness': () => [hiddenCrest(1.2), tone(997, 2, 0.4, RATE)],
  'loud noise': () => [seededNoise(7, 1.6, RATE)],
};

for (const [name, make] of Object.entries(HOT_SIGNALS)) {
  test(`the limiter: ${name}, no point left over the ceiling on the 8x meter or on BS.1770's 4x`, () => {
    const { channels } = limitTruePeak({ channels: make(), sampleRate: RATE });
    assert.ok(measureTruePeak(channels) <= CEILING, `8x read ${toDb(measureTruePeak(channels))} dBTP`);
    assert.ok(
      measureTruePeak(channels, 4) <= CEILING * (1 + 1e-6),
      `4x read ${toDb(measureTruePeak(channels, 4))} dBTP`,
    );
  });
}

test('the limiter: with no lookahead the gain jumps from sample to sample, and the second stage pulls down what that leaves over', () => {
  const rough = { sampleRate: RATE, lookaheadMs: 0, releaseMs: 0 };
  for (const channels of [
    [seededNoise(11, 1.6, RATE)],
    [square(1000, 1.5, RATE)],
    [hiddenCrest(1.5), seededNoise(5, 1.3, RATE)],
  ]) {
    const limited = limitTruePeak({ ...rough, channels }).channels;
    assert.ok(measureTruePeak(limited) <= CEILING, `8x read ${toDb(measureTruePeak(limited))} dBTP`);
  }
});

test('the limiter: a sustained hot sine settles just under the ceiling, not far below it', () => {
  const { channels } = limitTruePeak({ channels: [hiddenCrest(1.5)], sampleRate: RATE });
  const truePeak = toDb(measureTruePeak(channels));
  assert.ok(truePeak > CEILING_DB - 0.5, `true peak ${truePeak} dBTP`);
});

test("the limiter: the ceiling is the setup's, in dB", () => {
  const { channels } = limitTruePeak({ channels: [hiddenCrest(1.5)], sampleRate: RATE, ceilingDb: -6 });
  assert.ok(measureTruePeak(channels) <= 10 ** (-6 / 20));
});

test('the limiter: quiet material passes untouched, its gain exactly 1', () => {
  const quiet = [tone(440, 0.5, 0, 5000), tone(660, 0.4, 1, 5000)];
  const { channels, gain } = limitTruePeak({ channels: quiet, sampleRate: RATE });
  assert.ok(gain.every((each) => each === 1));
  assert.deepEqual(channels, quiet);
});

test('the limiter: both channels get one gain, so the stereo image holds', () => {
  const left = hiddenCrest(1.5);
  const right = tone(300, 0.1, 0, RATE);
  const { channels, gain } = limitTruePeak({ channels: [left, right], sampleRate: RATE });
  for (const i of [0, 1000, 20000, 40000]) {
    near(channels[1][i], right[i] * gain[i], 'the right channel', 1e-6);
  }
});

test('the limiter: a loud burst in silence is met ahead of it by the lookahead and let go by the release', () => {
  const frames = RATE * 2;
  const burstAt = RATE / 2;
  const input = new Float32Array(frames);
  input.set(tone(0.2 * RATE, 1.8, 0, 2000), burstAt);
  const lookahead = Math.round(0.005 * RATE);
  const { gain } = limitTruePeak({ channels: [input], sampleRate: RATE, lookaheadMs: 5, releaseMs: 100 });
  // the detector reads 12 samples ahead of a point, so the gain starts that much before the lookahead
  assert.equal(gain[burstAt - lookahead - INTERPOLATION_REACH - 2], 1, 'untouched before the lookahead');
  assert.ok(gain[burstAt - 2] < 1, 'already falling just before the burst');
  assert.ok(gain[burstAt + 50] < 0.6, 'down for the burst');
  assert.ok(gain[frames - 1] > 0.999, 'let go again after it');
});

test("the limiter: its channels are the lookahead limiter's output, latency samples on, at its ceiling with the clip off", () => {
  const input = [hiddenCrest(1.5), seededNoise(3, 1.2, RATE)];
  const limiter = new LookaheadLimiter({ sampleRate: RATE, lookahead: 0.005 });
  const length = RATE + limiter.latency;
  const fed = input.map((channel) => Float32Array.from({ length }, (_, i) => channel[i] ?? 0));
  const heard = input.map(() => new Float32Array(length));
  limiter.render(fed, heard, length, { gain: 0, ceiling: CEILING_DB, release: 0.1, clip: Infinity });
  const { channels } = limitTruePeak({ channels: input, sampleRate: RATE });
  let most = 0;
  for (let channel = 0; channel < 2; channel++) {
    for (let i = 0; i < RATE; i++) {
      most = Math.max(most, Math.abs(channels[channel][i] - heard[channel][i + limiter.latency]));
    }
  }
  assert.equal(most, 0, `the most difference ${most}`);
});

test('the limiter: the same input gives the same output', () => {
  const make = () => limitTruePeak({ channels: [hiddenCrest(1.5), seededNoise(3, 1.2, RATE)], sampleRate: RATE });
  assert.deepEqual(make(), make());
});

test('the limiter: the file keeps its length, and an empty channel passes', () => {
  const { channels, gain } = limitTruePeak({ channels: [new Float32Array(0)], sampleRate: RATE });
  assert.equal(channels[0].length, 0);
  assert.equal(gain.length, 0);
});

test('the limiter refuses no channels, channels of different lengths, a rate that is not a positive whole number, a negative time, a lookahead over 20 ms', () => {
  const ok = { channels: [new Float32Array(10)], sampleRate: RATE };
  assert.throws(() => limitTruePeak({ ...ok, channels: [] }), /channel/);
  assert.throws(() => limitTruePeak({ ...ok, channels: [new Float32Array(10), new Float32Array(9)] }), /same length/);
  assert.throws(() => limitTruePeak({ ...ok, sampleRate: 44100.5 }), /sample rate/);
  assert.throws(() => limitTruePeak({ ...ok, sampleRate: 0 }), /sample rate/);
  assert.throws(() => limitTruePeak({ ...ok, lookaheadMs: -1 }), /lookahead/);
  assert.throws(() => limitTruePeak({ ...ok, lookaheadMs: 20.5 }), /lookahead is 0 to 20 ms/);
  assert.doesNotThrow(() => limitTruePeak({ ...ok, lookaheadMs: 20 }));
  assert.throws(() => limitTruePeak({ ...ok, releaseMs: -1 }), /release/);
});
