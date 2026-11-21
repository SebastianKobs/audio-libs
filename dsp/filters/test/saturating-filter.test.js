// The saturating filter's unit tests (dsp/filters/): a ladder (24 dB) and a state-variable (12 dB) with a soft clip
// in the loop, oversampled 2x, singing from its own noise; and the filter a channel, let go once told to stop. No audio: fed
// Float32Arrays, its output read. Every reading said in the test's output, so a miss shows each beside what it should be.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LATENCY, SaturatingFilter, SaturatingFilterChannels } from '../index.ts';
import { isNear } from '../../../base/util/test/near.js';

const RATE = 48000;
// a random 0 to 1 from a seed, a linear congruential one: the same seed, the same draws, another seed another
function seededRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const LADDER = { frequency: 1000, detune: 0, resonance: 0, drive: 1, compensation: 0, mode: 0 };
const LOWPASS = 1;
const BANDPASS = 2;
const HIGHPASS = 3;

// ----- the measures
const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
const rms = (samples) => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
const dB = (ratio) => 20 * Math.log10(ratio);
const cents = (hz, against) => 1200 * Math.log2(hz / against);
const sine = (hz, length, level = 1) =>
  Float32Array.from({ length }, (_, i) => level * Math.sin((2 * Math.PI * hz * i) / RATE));
// where two renders part: the first sample that differs, -1 when none does; a number, never the buffers (a failing deepEqual on a second of samples builds a diff of some 70 GB: it took WSL down, 2026-11-12)
const partsAt = (one, other) =>
  one.length === other.length ? one.findIndex((sample, i) => sample !== other[i]) : Math.min(one.length, other.length);

// a partial's amplitude: a Hann-windowed single-bin DFT, 2 × |Σ w·x·e^(−i2π·hz·n/rate)| / Σ w
function partial(samples, from, length, hz) {
  let re = 0;
  let im = 0;
  let weights = 0;
  for (let n = 0; n < length; n++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / length);
    const turn = (2 * Math.PI * hz * n) / RATE;
    re += w * samples[from + n] * Math.cos(turn);
    im -= w * samples[from + n] * Math.sin(turn);
    weights += w;
  }
  return (2 * Math.hypot(re, im)) / weights;
}

// Hz, from the upward zero crossings, each placed between its two samples: (count − 1) / (last − first)
function pitchOf(samples, from, to) {
  let count = 0;
  let first = 0;
  let last = 0;
  for (let i = from + 1; i < to; i++) {
    if (!(samples[i - 1] < 0 && samples[i] >= 0)) {
      continue;
    }
    const at = i - 1 + samples[i - 1] / (samples[i - 1] - samples[i]);
    if (count === 0) {
      first = at;
    }
    last = at;
    count++;
  }
  return ((count - 1) / (last - first)) * RATE;
}

// a signal through a new filter, on seed 1 unless another random is handed
function filtered(params, input, length, random = seededRandom(1)) {
  const filter = new SaturatingFilter({ sampleRate: RATE, random });
  const output = new Float32Array(length);
  filter.render(input, output, 0, length, params);
  return output;
}

// dB: a 2 s sine through a new filter on seed 1, its partial over the second second against its amplitude
function gainAt(params, hz, amplitude = 0.003) {
  const output = filtered(params, sine(hz, 2 * RATE, amplitude), 2 * RATE);
  return dB(partial(output, RATE, RATE, hz) / amplitude);
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
    ({ what, value, expected, ok }) => `${ok ? 'ok ' : 'MISS'} ${what}: ${Number(value).toPrecision(5)} (${expected})`,
  );
  lines.forEach((line) => t.diagnostic(line));
  const missed = lines.filter((line) => line.startsWith('MISS'));
  assert.ok(missed.length === 0, `\n${lines.join('\n')}`);
}

// ----- the ladder
test("the ladder's cutoff where it's set: four poles 3 dB down each at it, 24 dB an octave above", (t) => {
  const at500 = { ...LADDER, frequency: 500 };
  expectAll(t, [
    within('500 Hz', gainAt(at500, 500), -12.04, 0.1),
    within('62.5 Hz', gainAt(at500, 62.5), -0.27, 0.1),
    within('2000 Hz', gainAt(at500, 2000), -49.3, 0.5),
    within('4000 Hz', gainAt(at500, 4000), -72.7, 1),
  ]);
});

test("the ladder's detune moves its cutoff in cents: 500 Hz up 1200 is 1000", (t) => {
  expectAll(t, [within('1000 Hz', gainAt({ ...LADDER, frequency: 500, detune: 1200 }, 1000), -12.04, 0.1)]);
});

test("the ladder's low end thins as its resonance rises, and its compensation gives it back", (t) => {
  const at1600 = (resonance, compensation = 0) => gainAt({ ...LADDER, frequency: 1600, resonance, compensation }, 100);
  expectAll(t, [
    within('resonance 0', at1600(0), -0.07, 0.2),
    within('resonance 0.5', at1600(0.5), -10.1, 0.3),
    within('resonance 0.9', at1600(0.9), -13.9, 0.3),
    within('resonance 0.9, compensation 1', at1600(0.9, 1), 0, 0.3),
    within('resonance 0.9, compensation 0.5', at1600(0.9, 0.5), -4.4, 0.3),
  ]);
});

test("the ladder's peak at its cutoff rises with its resonance", (t) => {
  const at1000 = (resonance) => gainAt({ ...LADDER, resonance }, 1000);
  expectAll(t, [within('resonance 0.5', at1000(0.5), -5.1, 0.3), within('resonance 0.8', at1000(0.8), 6.4, 0.3)]);
});

// the ladder left alone for 4 s, no input, read over its last second
const CUTOFFS = [110, 1000, 4000];
const sung = (params) => filtered(params, undefined, 4 * RATE);
const lastSecond = (samples) => samples.subarray(samples.length - RATE);

test('the ladder at full resonance sings out of nothing: a sine at its cutoff, its level held by the clip', (t) => {
  const readings = [];
  for (const frequency of CUTOFFS) {
    const song = sung({ ...LADDER, frequency, resonance: 1 });
    const pitch = pitchOf(song, 3 * RATE, 4 * RATE);
    const first = partial(song, 3 * RATE, RATE, pitch);
    readings.push(
      within(`${frequency} Hz: pitch in cents`, cents(pitch, frequency), 0, 3),
      within(`${frequency} Hz: peak`, peak(lastSecond(song)), 0.146, 0.02),
      atMost(`${frequency} Hz: third partial, dB`, dB(partial(song, 3 * RATE, RATE, 3 * pitch) / first), -50),
      atMost(`${frequency} Hz: second partial, dB`, dB(partial(song, 3 * RATE, RATE, 2 * pitch) / first), -70),
    );
  }
  expectAll(t, readings);
});

test('the ladder sings softer just past its threshold and not at all under it', (t) => {
  const readings = [];
  for (const frequency of CUTOFFS) {
    readings.push(
      within(
        `${frequency} Hz, resonance 0.95: peak`,
        peak(lastSecond(sung({ ...LADDER, frequency, resonance: 0.95 }))),
        0.102,
        0.015,
      ),
      atMost(
        `${frequency} Hz, resonance 0.9: rms`,
        rms(lastSecond(sung({ ...LADDER, frequency, resonance: 0.9 }))),
        1e-5,
      ),
    );
  }
  expectAll(t, readings);
});

test('the ladder at 1000 Hz is singing at half its level within 0.2 s', (t) => {
  const song = sung({ ...LADDER, resonance: 1 });
  const half = peak(lastSecond(song)) / 2;
  const onset = song.findIndex((x) => Math.abs(x) >= half) / RATE;
  expectAll(t, [atMost('onset to half its level, s', onset, 0.2)]);
});

test("the ladder's song is as loud as 1/drive: at drive 0.25, four times as loud", (t) => {
  expectAll(
    t,
    CUTOFFS.map((frequency) =>
      within(
        `${frequency} Hz: peak`,
        peak(lastSecond(sung({ ...LADDER, frequency, resonance: 1, drive: 0.25 }))),
        0.585,
        0.06,
      ),
    ),
  );
});

test('the ladder saturates a loud sine by its drive, odd partials only', (t) => {
  const readings = [];
  for (const drive of [0.1, 1, 4]) {
    const output = filtered({ ...LADDER, frequency: 10000, drive }, sine(100, RATE), RATE);
    const from = RATE / 2;
    const first = partial(output, from, RATE / 2, 100);
    const third = dB(partial(output, from, RATE / 2, 300) / first);
    readings.push(atMost(`drive ${drive}: second partial, dB`, dB(partial(output, from, RATE / 2, 200) / first), -80));
    const peaked = peak(output.subarray(from)) * drive;
    if (drive === 0.1) {
      readings.push(atMost('drive 0.1: third partial, dB', third, -55));
    }
    if (drive === 1) {
      readings.push(
        within('drive 1: peak × drive', peaked, 0.76, 0.02),
        within('drive 1: third partial, dB', third, -23.5, 1.5),
      );
    }
    if (drive === 4) {
      readings.push(
        between('drive 4: peak × drive', peaked, 0.95, 1.02),
        within('drive 4: third partial, dB', third, -11.3, 1.5),
      );
    }
  }
  expectAll(t, readings);
});

test('a quiet sine passes the ladder at unity at any drive', (t) => {
  expectAll(
    t,
    [4, 0.25].map((drive) =>
      within(`drive ${drive}`, gainAt({ ...LADDER, frequency: 10000, drive }, 100, 0.0005), 0, 0.1),
    ),
  );
});

test('oversampled: a 5 kHz sine clipped leaves nothing folded at 13 kHz, where its seventh partial would land', (t) => {
  const output = filtered({ ...LADDER, frequency: 20000 }, sine(5000, RATE), RATE);
  const folded = dB(partial(output, RATE / 2, RATE / 2, 13000) / partial(output, RATE / 2, RATE / 2, 5000));
  expectAll(t, [atMost('13 kHz against 5 kHz, dB', folded, -100)]);
});

test('the ladder opened wide is flat but for its four poles', (t) => {
  expectAll(t, [within('10 kHz at cutoff 21600', gainAt({ ...LADDER, frequency: 21600 }, 10000), -2.55, 0.15)]);
});

test('the filter is LATENCY samples late: an impulse comes out largest 16 samples on', (t) => {
  const impulse = new Float32Array(400);
  impulse[100] = 0.003;
  const output = filtered({ ...LADDER, frequency: 21600 }, impulse, impulse.length);
  const largest = output.reduce((most, x, i) => (Math.abs(x) > Math.abs(output[most]) ? i : most), 0);
  assert.equal(LATENCY, 15);
  expectAll(t, [within('largest at sample', largest, 116, 1)]);
});

// ----- the state-variable
test("the state-variable's lowpass: 6 dB down at its cutoff, 12 dB an octave above", (t) => {
  const at = (hz) => gainAt({ ...LADDER, mode: LOWPASS }, hz);
  expectAll(t, [
    within('1000 Hz', at(1000), -6.02, 0.1),
    within('4000 Hz', at(4000), -24.7, 0.5),
    within('8000 Hz', at(8000), -36.7, 1),
    within('62.5 Hz', at(62.5), -0.03, 0.2),
  ]);
});

test("the state-variable's resonance peaks its cutoff and keeps its low end", (t) => {
  const at = (hz) => gainAt({ ...LADDER, mode: LOWPASS, resonance: 0.8 }, hz);
  expectAll(t, [within('1000 Hz', at(1000), 12.4, 0.3), within('62.5 Hz', at(62.5), 0.03, 0.2)]);
});

test("the state-variable's bandpass and highpass", (t) => {
  const band = (hz) => gainAt({ ...LADDER, mode: BANDPASS }, hz);
  const high = (hz) => gainAt({ ...LADDER, mode: HIGHPASS }, hz);
  expectAll(t, [
    within('bandpass 1000 Hz', band(1000), -6.02, 0.1),
    within('bandpass 4000 Hz', band(4000), -12.6, 0.5),
    within('bandpass 250 Hz', band(250), -12.6, 0.5),
    within('highpass 1000 Hz', high(1000), -6.02, 0.1),
    within('highpass 4000 Hz', high(4000), -0.5, 0.3),
    within('highpass 250 Hz', high(250), -24.6, 0.5),
  ]);
});

test('the state-variable sings at full resonance, not under its threshold', (t) => {
  const readings = [];
  for (const frequency of CUTOFFS) {
    const song = sung({ ...LADDER, mode: LOWPASS, frequency, resonance: 1 });
    const pitch = pitchOf(song, 3 * RATE, 4 * RATE);
    const first = partial(song, 3 * RATE, RATE, pitch);
    readings.push(
      within(`${frequency} Hz: pitch in cents`, cents(pitch, frequency), 0, 10),
      within(`${frequency} Hz: peak`, peak(lastSecond(song)), 0.645, 0.07),
      atMost(`${frequency} Hz: third partial, dB`, dB(partial(song, 3 * RATE, RATE, 3 * pitch) / first), -35),
      atMost(
        `${frequency} Hz, resonance 0.9: rms`,
        rms(lastSecond(sung({ ...LADDER, mode: LOWPASS, frequency, resonance: 0.9 }))),
        1e-5,
      ),
    );
  }
  expectAll(t, readings);
});

// ----- both
test('held under a cutoff swept at 1 kHz: noise at full scale stays finite and bounded in every mode', (t) => {
  const length = 2 * RATE;
  const draw = seededRandom(3);
  const noise = Float32Array.from({ length }, () => draw() * 2 - 1);
  const frequency = Float32Array.from({ length }, (_, i) => 2600 + 2400 * Math.sin((2 * Math.PI * 1000 * i) / RATE));
  const readings = [];
  for (const mode of [0, LOWPASS, BANDPASS, HIGHPASS]) {
    const output = filtered({ ...LADDER, frequency, resonance: 0.9, mode }, noise, length);
    readings.push(
      atMost(`mode ${mode}: samples not finite`, output.filter((x) => !Number.isFinite(x)).length, 0),
      atMost(`mode ${mode}: peak`, peak(output), mode === 0 ? 1.1 : 4),
    );
  }
  expectAll(t, readings);
});

test('seeded: the same seed sings the same song, another seed another; none handed, it still sings', (t) => {
  const song = (random) => filtered({ ...LADDER, resonance: 1 }, undefined, RATE, random);
  const one = song(seededRandom(7));
  assert.equal(partsAt(song(seededRandom(7)), one), -1, 'the same seed, the same song');
  assert.notEqual(partsAt(song(seededRandom(8)), one), -1, 'another seed, another song');
  const unseeded = new SaturatingFilter({ sampleRate: RATE });
  const output = new Float32Array(RATE);
  unseeded.render(undefined, output, 0, RATE, { ...LADDER, resonance: 1 });
  expectAll(t, [atLeast('no random handed: peak of its last half second', peak(output.subarray(RATE / 2)), 0.146 / 2)]);
});

// ----- the filter a channel
const BLOCK = 128;
const PARAMS = (values = {}) => ({ ...LADDER, ...values });
// blocks run through a filter a channel, each channel's output kept; `inputs` makes a block's input channels
function processed(channels, blocks, inputs, params, currentTime = 0) {
  const heard = [[], []];
  let kept = true;
  for (let block = 0; block < blocks; block++) {
    const outputs = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
    kept = channels.process(inputs(block), outputs, params, currentTime);
    outputs.forEach((channel, c) => heard[c].push(...channel));
  }
  return { heard: heard.map((samples) => Float32Array.from(samples)), kept };
}
const channelsOn = (seed) =>
  new SaturatingFilterChannels({ sampleRate: RATE, randomOf: (channel) => seededRandom(seed + channel) });

test('a filter a channel: silence in one channel staying near silent', () => {
  const left = (block) =>
    Float32Array.from({ length: BLOCK }, (_, i) => Math.sin((2 * Math.PI * 300 * (block * BLOCK + i)) / RATE));
  const { heard } = processed(channelsOn(1), 100, (block) => [left(block), new Float32Array(BLOCK)], PARAMS());
  assert.ok(peak(heard[0]) > 0.5, `left ${peak(heard[0])}`);
  assert.ok(peak(heard[1]) < 1e-4, `right ${peak(heard[1])}`);
});

test('with no input it runs on, finite; once told to stop it writes zeros and is let go', () => {
  const channels = channelsOn(2);
  const running = processed(channels, 10, () => [], PARAMS({ resonance: 1 }));
  assert.equal(running.kept, true);
  assert.equal(running.heard[0].filter((x) => !Number.isFinite(x)).length, 0);
  channels.told({ stop: 0 });
  const stopped = processed(channels, 1, () => [], PARAMS({ resonance: 1 }));
  assert.equal(stopped.kept, false, 'let go');
  assert.equal(peak(stopped.heard[0]), 0);
  assert.equal(peak(stopped.heard[1]), 0);
});

test('a stop in the middle of a block writes zeros from there, and a stop is never taken back', () => {
  const channels = channelsOn(3);
  channels.told({ stop: 32 / RATE });
  const outputs = [new Float32Array(BLOCK)];
  const kept = channels.process([], outputs, PARAMS({ resonance: 1 }), 0);
  assert.equal(kept, false, 'let go within the block');
  assert.equal(peak(outputs[0].subarray(32)), 0, 'zeros from its stop');
  channels.told({ stop: 10 });
  channels.told('not a time');
  channels.told(null);
  const later = [new Float32Array(BLOCK)];
  assert.equal(channels.process([], later, PARAMS(), 1), false, 'still stopped');
  assert.equal(peak(later[0]), 0);
});

test('on one seed it sings the same song twice, each channel on a seed of its own', () => {
  const song = () => processed(channelsOn(5), 100, () => [], PARAMS({ resonance: 1 })).heard;
  const [left, right] = song();
  const [again] = song();
  assert.equal(partsAt(again, left), -1, 'the same seed, the same song');
  assert.ok(peak(left) > 0, 'it sings');
  assert.notEqual(partsAt(right, left), -1, 'each channel on a seed of its own');
});

test('with no random handed in it still sings, on Math.random', () => {
  const channels = new SaturatingFilterChannels({ sampleRate: RATE });
  const { heard } = processed(channels, 400, () => [], PARAMS({ resonance: 1 }));
  assert.ok(peak(heard[0].subarray(heard[0].length / 2)) > 0.146 / 2);
});
