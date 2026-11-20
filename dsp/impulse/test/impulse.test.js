// The designed impulse's unit tests (mockup/src/libs/dsp/impulse/): a pre-delay, early taps, echoes growing denser,
// noise in three bands each with its own decay time, a seed a side. Fed a seeded random, its two arrays read as
// numbers, never as buffers. Every reading said in the test's output, so a miss shows each beside what it should be.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMPULSE_DEFAULTS, designedImpulse } from '../index.ts';
import { monoLoss } from '../../measures/index.ts';
import { isNear } from '../../../base/util/test/near.js';

// seeded generator written here (mulberry32): the same draws every run
const seededRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ----- the measures
// where two renders part: the first sample that differs, -1 when none does; a number, never the buffers
const partsAt = (one, other) =>
  one.length === other.length ? one.findIndex((sample, i) => sample !== other[i]) : Math.min(one.length, other.length);
// the sum of squares over from..to (to not included)
const energy = (samples, from, to) => {
  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += samples[i] * samples[i];
  }
  return sum;
};
const peakOf = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
const dB = (powerRatio) => 10 * Math.log10(powerRatio);

// y[n] = b0·x[n] + b1·x[n-1] + b2·x[n-2] - a1·y[n-1] - a2·y[n-2], coefficients from the analog values by k = tan(π·hz/rate)
function biquad(kind, hz, q, rate) {
  const k = Math.tan((Math.PI * hz) / rate);
  const a0 = 1 + k / q + k * k;
  const b = kind === 'lowpass' ? [(k * k) / a0, (2 * k * k) / a0, (k * k) / a0] : [1 / a0, -2 / a0, 1 / a0];
  return { b, a1: (2 * (k * k - 1)) / a0, a2: (1 - k / q + k * k) / a0 };
}
// the state in doubles
function run(samples, { b, a1, a2 }) {
  const out = new Float64Array(samples.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const y = b[0] * x + b[1] * x1 + b[2] * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  return out;
}
// a fourth-order Butterworth: two biquads, Q 1/(2cos(π/8)) and 1/(2cos(3π/8))
const fourthOrder = (samples, kind, hz, rate) =>
  [1 / (2 * Math.cos(Math.PI / 8)), 1 / (2 * Math.cos((3 * Math.PI) / 8))].reduce(
    (through, q) => run(through, biquad(kind, hz, q, rate)),
    samples,
  );

// seconds: both sides through a fourth-order highpass at lo and lowpass at hi, squared and summed, run backward from the
// end (Schroeder's integral: the energy still to come at each sample), in dB against its first value; a least-squares
// line through every sample between -5 and -20 dB; the time −60 / slope
function decayTime(sides, lo, hi, rate) {
  const length = sides[0].length;
  const remaining = new Float64Array(length);
  for (const side of sides) {
    const band = fourthOrder(fourthOrder(side, 'highpass', lo, rate), 'lowpass', hi, rate);
    for (let i = 0; i < length; i++) {
      remaining[i] += band[i] * band[i];
    }
  }
  for (let i = length - 2; i >= 0; i--) {
    remaining[i] += remaining[i + 1];
  }
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < length; i++) {
    const level = dB(remaining[i] / remaining[0]);
    if (level > -5 || level < -20) {
      continue;
    }
    const seconds = i / rate;
    count++;
    sumX += seconds;
    sumY += level;
    sumXY += seconds * level;
    sumXX += seconds * seconds;
  }
  const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
  return -60 / slope;
}

// ----- the readings: each said in the test's output, all checked together
const within = (what, value, expected, tolerance) => ({
  what,
  value,
  expected: `${expected} ± ${tolerance}`,
  ok: isNear(value, expected, tolerance),
});
const withinShare = (what, value, expected, share) => ({
  what,
  value,
  expected: `${expected} ± ${share * 100}%`,
  ok: isNear(value, expected, expected * share),
});
const atMost = (what, value, most) => ({ what, value, expected: `≤ ${most}`, ok: value <= most });
const between = (what, value, least, most) => ({
  what,
  value,
  expected: `${least} to ${most}`,
  ok: value >= least && value <= most,
});
const exactly = (what, value, expected) => ({ what, value, expected: `${expected}`, ok: value === expected });
function expectAll(t, readings) {
  const lines = readings.map(
    ({ what, value, expected, ok }) => `${ok ? 'ok ' : 'MISS'} ${what}: ${Number(value).toPrecision(5)} (${expected})`,
  );
  lines.forEach((line) => t.diagnostic(line));
  const missed = lines.filter((line) => line.startsWith('MISS'));
  assert.ok(missed.length === 0, `\n${lines.join('\n')}`);
}

// an impulse made once however many tests read it: the arrays are never written to
const made = new Map();
function impulseOf(design, rate = 48000, seed = 1) {
  const key = `${JSON.stringify(design)}@${rate}#${seed}`;
  if (!made.has(key)) {
    made.set(key, designedImpulse(design, rate, seededRandom(seed)));
  }
  return made.get(key);
}

const RATE = 48000;

// ----- the shape
test('{ decay: 1 } at 48000 on seed 1: 48960 samples a side, finite, silent for the pre-delay, ending on 0, energy 1, two draws', (t) => {
  let draws = 0;
  const next = seededRandom(1);
  const [left, right] = designedImpulse({ decay: 1 }, RATE, () => {
    draws++;
    return next();
  });
  const onsetOf = (side) => side.findIndex((x) => Math.abs(x) > 1e-4 * peakOf(side));
  expectAll(t, [
    exactly('left length', left.length, 48960),
    exactly('right length', right.length, 48960),
    exactly('samples not finite, left', left.filter((x) => !Number.isFinite(x)).length, 0),
    exactly('samples not finite, right', right.filter((x) => !Number.isFinite(x)).length, 0),
    exactly('energy before sample 960, left', energy(left, 0, 960), 0),
    exactly('energy before sample 960, right', energy(right, 0, 960), 0),
    between('left onset, sample', onsetOf(left), 960, 1680),
    between('right onset, sample', onsetOf(right), 960, 1680),
    exactly('left last sample', left[left.length - 1], 0),
    exactly('right last sample', right[right.length - 1], 0),
    within('left energy', energy(left, 0, left.length), 1, 1e-3),
    within('right energy', energy(right, 0, right.length), 1, 1e-3),
    exactly('draws from random', draws, 2),
  ]);
});

test('the same seed again parts nowhere on either side, another seed somewhere; left and right are two noises, mono loses 3 dB', (t) => {
  const [left, right] = impulseOf({ decay: 1 });
  const [leftAgain, rightAgain] = designedImpulse({ decay: 1 }, RATE, seededRandom(1));
  const [leftOther] = impulseOf({ decay: 1 }, RATE, 2);
  let together = 0;
  for (let i = 0; i < left.length; i++) {
    together += left[i] * right[i];
  }
  const correlation = together / Math.sqrt(energy(left, 0, left.length) * energy(right, 0, right.length));
  expectAll(t, [
    exactly('the same seed, left parts at', partsAt(leftAgain, left), -1),
    exactly('the same seed, right parts at', partsAt(rightAgain, right), -1),
    {
      what: 'seed 2 against seed 1, parts at',
      value: partsAt(leftOther, left),
      expected: '≥ 0',
      ok: partsAt(leftOther, left) !== -1,
    },
    {
      what: 'left against right, parts at',
      value: partsAt(left, right),
      expected: '≥ 0',
      ok: partsAt(left, right) !== -1,
    },
    atMost('correlation of left and right, size', Math.abs(correlation), 0.05),
    within('monoLoss, dB', monoLoss(left, right), -3, 0.5),
  ]);
});

// ----- the decay, band by band
test('{ decay: 2, crossovers: [250, 2000], decays: [1.5, 1, 0.5] } decays in each band as its share says', (t) => {
  const sides = impulseOf({ decay: 2, crossovers: [250, 2000], decays: [1.5, 1, 0.5] });
  expectAll(t, [
    withinShare('88 to 177 Hz, s', decayTime(sides, 88, 177, RATE), 3.0, 0.15),
    withinShare('707 to 1414 Hz, s', decayTime(sides, 707, 1414, RATE), 2.0, 0.1),
    withinShare('5657 to 11314 Hz, s', decayTime(sides, 5657, 11314, RATE), 1.0, 0.1),
  ]);
});

test('the middle band decays in the time asked at 44100 and 48000, from 0.2 s to 4.5 s, and the lengths are pre-delay + decay × rate', (t) => {
  expectAll(t, [
    exactly('decay 1 at 44100, length', impulseOf({ decay: 1 }, 44100)[0].length, 44982),
    withinShare(
      'decay 1 at 44100, 707 to 1414 Hz, s',
      decayTime(impulseOf({ decay: 1 }, 44100), 707, 1414, 44100),
      1.0,
      0.1,
    ),
    exactly('decay 4.5 at 48000, length', impulseOf({ decay: 4.5 })[0].length, 216960),
    withinShare('decay 4.5, 707 to 1414 Hz, s', decayTime(impulseOf({ decay: 4.5 }), 707, 1414, RATE), 4.5, 0.1),
    exactly('decay 0.2 at 48000, length', impulseOf({ decay: 0.2 })[0].length, 10560),
    withinShare('decay 0.2, 707 to 1414 Hz, s', decayTime(impulseOf({ decay: 0.2 }), 707, 1414, RATE), 0.2, 0.15),
  ]);
});

// ----- the onset
test('{ decay: 2, taps: 0 }: the echoes grow denser, the energy rising from 10 ms on and level once dense', (t) => {
  const [left, right] = impulseOf({ decay: 2, taps: 0 });
  const windowAt = (fromMs, toMs) => {
    const from = 960 + (fromMs * RATE) / 1000;
    const to = 960 + (toMs * RATE) / 1000;
    return energy(left, from, to) + energy(right, from, to);
  };
  expectAll(t, [
    {
      what: '10 to 30 ms against 60 to 80 ms, dB',
      value: dB(windowAt(10, 30) / windowAt(60, 80)),
      expected: '≤ -6',
      ok: dB(windowAt(10, 30) / windowAt(60, 80)) <= -6,
    },
    within('100 to 120 ms against 120 to 140 ms, dB', dB(windowAt(100, 120) / windowAt(120, 140)), 0, 2),
  ]);
});

test('{ decay: 2, density: 0 }: silent until the first tap at 5 ms, then all its energy in the 90 ms of taps; with taps: 0 too, all zeros', (t) => {
  const [left, right] = impulseOf({ decay: 2, density: 0 });
  const whole = energy(left, 0, left.length) + energy(right, 0, right.length);
  const taps = energy(left, 1200, 5280) + energy(right, 1200, 5280);
  const [nothingLeft, nothingRight] = impulseOf({ decay: 2, density: 0, taps: 0 });
  expectAll(t, [
    exactly('energy before sample 1200, left', energy(left, 0, 1200), 0),
    exactly('energy before sample 1200, right', energy(right, 0, 1200), 0),
    {
      what: 'share of the energy in samples 1200 to 5280',
      value: taps / whole,
      expected: '≥ 0.99',
      ok: taps / whole >= 0.99,
    },
    exactly('no taps and no late echoes: left energy', energy(nothingLeft, 0, nothingLeft.length), 0),
    exactly('no taps and no late echoes: right energy', energy(nothingRight, 0, nothingRight.length), 0),
  ]);
});

// ----- the band limit
test('{ decay: 1 }: the band is limited at 10 kHz, under 0.3% of the energy left over 16 kHz', (t) => {
  const sides = impulseOf({ decay: 1 });
  const left = energy(sides[0], 0, sides[0].length) + energy(sides[1], 0, sides[1].length);
  const over = sides.reduce((sum, side) => {
    const high = fourthOrder(side, 'highpass', 16000, RATE);
    return sum + energy(high, 0, high.length);
  }, 0);
  expectAll(t, [atMost('share of the energy over 16 kHz', over / left, 0.003)]);
});

// ----- refused
test('a decay of 0, -1 or NaN, or a sample rate that is not over 0, throws', () => {
  for (const decay of [0, -1, NaN]) {
    assert.throws(() => designedImpulse({ decay }, RATE, seededRandom(1)), /decay is more than 0 s/);
  }
  for (const rate of [0, -48000, NaN, Infinity]) {
    assert.throws(() => designedImpulse({ decay: 1 }, rate, seededRandom(1)), /sample rate/);
  }
});

test('the defaults are the room: 8 taps a side, a 20 ms pre-delay, 2000 echoes a second', () => {
  assert.equal(IMPULSE_DEFAULTS.taps, 8);
  assert.equal(IMPULSE_DEFAULTS.preDelay, 0.02);
  assert.equal(IMPULSE_DEFAULTS.density, 2000);
});
