// The operator voice's unit tests (dsp/oscillators/): a phase-modulation voice of up to four operators with feedback,
// eight waves, and the eight algorithms' routes. No audio: fed numbers and arrays, its output read. Every reading said in the test's
// output, so a miss shows each beside what it should be.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNear } from '../../../base/util/test/near.js';
import { OPERATOR_ALGORITHMS, OperatorVoice } from '../index.ts';

const RATE = 48000;

// ----- the measures
const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
const dB = (ratio) => 20 * Math.log10(ratio);

// a partial's amplitude over whole periods, no window: 2 × |Σ x·e^(−i2π·hz·n/rate)| / N
function partial(samples, from, length, hz) {
  let re = 0;
  let im = 0;
  for (let n = 0; n < length; n++) {
    const turn = (2 * Math.PI * hz * n) / RATE;
    re += samples[from + n] * Math.cos(turn);
    im -= samples[from + n] * Math.sin(turn);
  }
  return (2 * Math.hypot(re, im)) / length;
}

// the params of a voice, as the processor's descriptors default them, over what's handed
const PARAMS = (values = {}) => ({
  frequency: 200,
  detune: 0,
  feedback: 0,
  ratio1: 1,
  detune1: 0,
  level1: 1,
  wave1: 0,
  ratio2: 1,
  detune2: 0,
  level2: 0,
  wave2: 0,
  ratio3: 1,
  detune3: 0,
  level3: 0,
  wave3: 0,
  ratio4: 1,
  detune4: 0,
  level4: 0,
  wave4: 0,
  ...values,
});

// 2 s through a new voice, as Float32Array
function rendered(options, values, length = 2 * RATE) {
  const voice = new OperatorVoice(options);
  const out = new Float32Array(length);
  voice.render(out, 0, length, PARAMS(values), RATE);
  return out;
}

// a partial of the second second of a 2 s render
const partialOf = (samples, hz) => partial(samples, RATE, RATE, hz);

// ----- the readings: each said in the test's output, all checked together
const within = (what, value, expected, tolerance) => ({
  what,
  value,
  expected: `${expected} ± ${tolerance}`,
  ok: isNear(value, expected, tolerance),
});
const atMost = (what, value, most) => ({ what, value, expected: `≤ ${most}`, ok: value <= most });
const atLeast = (what, value, least) => ({ what, value, expected: `≥ ${least}`, ok: value >= least });
function expectAll(t, readings) {
  const lines = readings.map(
    ({ what, value, expected, ok }) => `${ok ? 'ok ' : 'MISS'} ${what}: ${Number(value).toPrecision(5)} (${expected})`,
  );
  lines.forEach((line) => t.diagnostic(line));
  const missed = lines.filter((line) => line.startsWith('MISS'));
  assert.ok(missed.length === 0, `\n${lines.join('\n')}`);
}

// ----- one operator, a pair
test('one operator at 200 Hz is a sine: its first sample 0, its peak at most 1', (t) => {
  const out = rendered({}, {});
  expectAll(t, [
    within('partial at 200', partialOf(out, 200), 1, 0.001),
    atMost('partial at 400', partialOf(out, 400), 1e-4),
    within('first sample', out[0], 0, 0),
    atMost('peak', peak(out), 1),
  ]);
});

test("a pair, the modulator at 7 times and index 1: the carrier's sidebands at the Bessel functions J0 to J3 of 1", (t) => {
  const out = rendered({}, { ratio2: 7, level2: 1 });
  expectAll(t, [
    within('200 Hz, J0', partialOf(out, 200), 0.7652, 0.002),
    within('1600 Hz, J1', partialOf(out, 1600), 0.4401, 0.002),
    within('1200 Hz, J1', partialOf(out, 1200), 0.4401, 0.002),
    within('3000 Hz, J2', partialOf(out, 3000), 0.1149, 0.002),
    within('2600 Hz, J2', partialOf(out, 2600), 0.1149, 0.002),
    within('4400 Hz, J3', partialOf(out, 4400), 0.0196, 0.002),
  ]);
});

test('the pitch holds as the index rises: the same wave every period, only its brightness moves', (t) => {
  const readings = [];
  const brightness = [];
  for (const level2 of [0, 2, 5]) {
    const out = rendered({}, { level2 });
    let most = 0;
    for (let i = RATE; i < 2 * RATE - 240; i++) {
      most = Math.max(most, Math.abs(out[i] - out[i + 240]));
    }
    readings.push(atMost(`index ${level2}: most difference from a period on`, most, 1e-6));
    brightness.push(partialOf(out, 1000));
  }
  expectAll(t, [
    ...readings,
    atMost('partial at 1000 at index 0', brightness[0], 1e-4),
    atLeast("partial at 1000 at index 2, over index 0's ceiling", brightness[1], 1e-4),
    atLeast('partial at 1000 at index 5, over index 2', brightness[2], brightness[1] + 1e-9),
  ]);
});

// ----- feedback
test("feedback on operator 4 alone: a sine bending toward a saw, Kepler's series in its partials, tapped after the level", (t) => {
  const alone = { carriers: [4] };
  const without = rendered(alone, { frequency: 100, level4: 1, feedback: 0 });
  const bent = rendered(alone, { frequency: 100, level4: 1, feedback: 1 });
  const halved = rendered(alone, { frequency: 100, level4: 0.5, feedback: 2 });
  expectAll(t, [
    atMost('feedback 0: partial at 200', partialOf(without, 200), 1e-4),
    within('feedback 1: second against first, dB', dB(partialOf(bent, 200) / partialOf(bent, 100)), -7.9, 0.5),
    within('feedback 1: third against first, dB', dB(partialOf(bent, 300) / partialOf(bent, 100)), -12.6, 0.5),
    atMost('feedback 1: peak', peak(bent), 1.001),
    within(
      'level 0.5, feedback 2: second against first, dB',
      dB(partialOf(halved, 200) / partialOf(halved, 100)),
      -7.9,
      0.5,
    ),
  ]);
});

// ----- routing
test("routing: an operator is modulated by every one in its route, each by this sample's output; a route up the wrong way throws", (t) => {
  const routes = [[2, 4], [3], [], []];
  const out = rendered({ routes }, { ratio3: 2, ratio4: 3, level1: 1, level2: 1.5, level3: 0.8, level4: 0.5 }, 4800);
  let most = 0;
  for (let i = 0; i < 4800; i++) {
    const phi = (2 * Math.PI * 200 * i) / RATE;
    const expected = Math.sin(phi + 1.5 * Math.sin(phi + 0.8 * Math.sin(2 * phi)) + 0.5 * Math.sin(3 * phi));
    most = Math.max(most, Math.abs(out[i] - expected));
  }
  expectAll(t, [atMost('most difference from the nested sines', most, 1e-4)]);
  assert.throws(
    () => new OperatorVoice({ routes: [[1], [], [], []] }),
    /An operator is modulated only by a higher one: 1 into 1/,
  );
  assert.throws(
    () => new OperatorVoice({ routes: [[], [1], [], []] }),
    /An operator is modulated only by a higher one: 1 into 2/,
  );
});

// ----- the waves
const WAVES = [
  [1, 0.8488, 0, 0.1698, 0],
  [2, 0.5, 0.2122, 0, 0.0425],
  [3, 0.4244, 0.25, 0.0849, 0],
  [4, 0.4244, 0.5, 0.2547, 0],
  [5, 0.3395, 0.4244, 0.2425, 0],
  [6, 0.4244, 0, 0.2547, 0.2122],
  [7, 0.3395, 0, 0.2425, 0.25],
];

test("the waves 1 to 7: partials 1 to 4 of each shape's Fourier series, at 100 Hz and level 1", (t) => {
  const readings = [];
  for (const [index, ...expected] of WAVES) {
    const out = rendered({}, { frequency: 100, wave1: index });
    expected.forEach((share, n) =>
      readings.push(within(`wave ${index}: partial ${n + 1}`, partialOf(out, 100 * (n + 1)), share, 0.002)),
    );
  }
  expectAll(t, readings);
});

// ----- phases, detune, a level in a line
test('a phase handed in is where an operator starts; detune moves the note in cents', (t) => {
  const started = rendered({ phases: [0.25, 0, 0, 0] }, {}, 16);
  const up = rendered({}, { detune: 1200 });
  expectAll(t, [
    within('first sample at phase 0.25', started[0], 1, 1e-6),
    within('detune 1200 at 200 Hz: partial at 400', partialOf(up, 400), 1, 0.001),
  ]);
});

test('a level given a sample each follows it: a line from 1 to 0 over 4800 samples leaves the last 480 under 0.11', (t) => {
  const voice = new OperatorVoice({});
  const out = new Float32Array(4800);
  const level1 = Float32Array.from({ length: 4800 }, (_, i) => 1 - i / 4800);
  voice.render(out, 0, 4800, PARAMS({ frequency: 1000, level1 }), RATE);
  expectAll(t, [
    atMost('peak of the last 480', peak(out.subarray(4320)), 0.11),
    atLeast('peak of the first 480, to show it sounded', peak(out.subarray(0, 480)), 0.9),
  ]);
});

// ----- the eight algorithms
test('the eight algorithms: each its routes and carriers as listed, every route up, a voice made of each; the first alone heard in the first', () => {
  assert.deepEqual(OPERATOR_ALGORITHMS, [
    { routes: [[2], [3], [4], []], carriers: [1] },
    { routes: [[2], [3, 4], [], []], carriers: [1] },
    { routes: [[2, 4], [3], [], []], carriers: [1] },
    { routes: [[2, 3], [], [4], []], carriers: [1] },
    { routes: [[2], [], [4], []], carriers: [1, 3] },
    { routes: [[4], [4], [4], []], carriers: [1, 2, 3] },
    { routes: [[], [], [4], []], carriers: [1, 2, 3] },
    { routes: [[], [], [], []], carriers: [1, 2, 3, 4] },
  ]);
  for (const { routes, carriers } of OPERATOR_ALGORITHMS) {
    assert.doesNotThrow(() => new OperatorVoice({ routes, carriers }), 'every operator modulated by a higher one');
  }
});

test('algorithm 8, four carriers side by side: their levels summed, none modulating another', (t) => {
  const { routes, carriers } = OPERATOR_ALGORITHMS[7];
  const out = rendered({ routes, carriers }, { level1: 1, level2: 0.5, level3: 0.25, level4: 0.125 });
  expectAll(t, [
    within('partial at 200', partialOf(out, 200), 1.875, 0.002),
    atMost('partial at 400', partialOf(out, 400), 1e-4),
  ]);
});
