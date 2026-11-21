// The phase distortion voice's unit tests (dsp/oscillators/): one line of a CZ, a cosine read through a phase bent at a
// knee, a saw or a square, brighter as the DCW rises. No audio: fed numbers and arrays, its output read. Every reading said in the
// test's output, so a miss shows each beside what it should be.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNear } from '../../../base/util/test/near.js';
import { PhaseDistortionVoice } from '../index.ts';

const RATE = 48000;
const PERIOD = 480; // samples, at 100 Hz
const SAW = 0;
const SQUARE = 1;

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

// 2 s through a new voice at 100 Hz unless handed otherwise, as Float32Array
function rendered(options, values, length = 2 * RATE) {
  const voice = new PhaseDistortionVoice(options);
  const out = new Float32Array(length);
  voice.render(out, 0, length, { frequency: 100, detune: 0, dcw: 0, wave: SAW, ...values }, RATE);
  return out;
}

// a partial of the second second of a 2 s render
const partialOf = (samples, hz) => partial(samples, RATE, RATE, hz);
const secondAgainstFirst = (samples) => dB(partialOf(samples, 200) / partialOf(samples, 100));

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

// ----- at no distortion
test('at dcw 0 both waves are a sine: its partial at 100 reads 1, none at 200, the first sample -1', (t) => {
  const readings = [];
  for (const [name, wave] of [
    ['saw', SAW],
    ['square', SQUARE],
  ]) {
    const out = rendered({}, { wave });
    readings.push(
      within(`${name}: partial at 100`, partialOf(out, 100), 1, 0.001),
      atMost(`${name}: partial at 200`, partialOf(out, 200), 1e-4),
      within(`${name}: first sample`, out[0], -1, 1e-6),
    );
  }
  expectAll(t, readings);
});

// ----- the saw
test('the saw brightens with the dcw: its second partial against its first rises from -17 to -8 dB, its first 0.854 at 1', (t) => {
  const at = (dcw) => rendered({}, { dcw });
  const full = at(1);
  expectAll(t, [
    within('dcw 0.25: second against first, dB', secondAgainstFirst(at(0.25)), -17.3, 1),
    within('dcw 0.5: second against first, dB', secondAgainstFirst(at(0.5)), -11.8, 1),
    within('dcw 0.75: second against first, dB', secondAgainstFirst(at(0.75)), -9.2, 1),
    within('dcw 1: second against first, dB', secondAgainstFirst(full), -8.0, 0.5),
    within('dcw 1: third against first, dB', dB(partialOf(full, 300) / partialOf(full, 100)), -11.9, 0.5),
    within('dcw 1: first partial', partialOf(full, 100), 0.854, 0.01),
  ]);
});

test('the pitch holds as the dcw rises: the same wave every period', (t) => {
  const readings = [];
  for (const dcw of [0.25, 0.6, 1]) {
    const out = rendered({}, { dcw });
    let most = 0;
    for (let i = RATE; i < 2 * RATE - PERIOD; i++) {
      most = Math.max(most, Math.abs(out[i] - out[i + PERIOD]));
    }
    readings.push(atMost(`dcw ${dcw}: most difference from a period on`, most, 1e-6));
  }
  expectAll(t, readings);
});

test('the saw at dcw 1: its peak at the knee, 5 samples in, and its fall through 0 at half the period', (t) => {
  const out = rendered({}, { dcw: 1 }, RATE + PERIOD);
  const period = out.subarray(RATE - PERIOD, RATE); // 100 whole periods in, so it starts at phase 0
  const highest = period.reduce((at, x, i) => (x > period[at] ? i : at), 0);
  const fallAt = period.findIndex((x, i) => i > 0 && period[i - 1] > 0 && x <= 0);
  const crossing = (fallAt - 1 + period[fallAt - 1] / (period[fallAt - 1] - period[fallAt])) / PERIOD;
  expectAll(t, [
    within('largest sample at', highest, 5, 2),
    within('fall through 0 at, of the period', crossing, 0.506, 0.005),
  ]);
});

// ----- the square
test("the square at dcw 1: a square's odd partials, 4/π, none at 200, 1/3 at 300, no mean", (t) => {
  const out = rendered({}, { dcw: 1, wave: SQUARE });
  const mean = out.subarray(RATE).reduce((sum, x) => sum + x, 0) / RATE;
  expectAll(t, [
    within('first partial', partialOf(out, 100), 1.273, 0.01),
    atMost('second partial', partialOf(out, 200), 1e-4),
    within('third against first, dB', dB(partialOf(out, 300) / partialOf(out, 100)), -9.5, 0.5),
    atMost('mean', Math.abs(mean), 1e-3),
  ]);
});

// ----- high up, and a dcw in a line
test('at 4000 Hz and dcw 1 nothing is past full scale or not a number', (t) => {
  for (const wave of [SAW, SQUARE]) {
    const out = rendered({}, { frequency: 4000, dcw: 1, wave }, RATE);
    expectAll(t, [
      within(`wave ${wave}: samples not finite`, out.filter((x) => !Number.isFinite(x)).length, 0, 0),
      atMost(`wave ${wave}: peak`, peak(out), 1),
    ]);
  }
});

test('a dcw falling from 1 to 0 over a second: the second partial fades, 20 dB or more between the first 0.1 s and the last', (t) => {
  const dcw = Float32Array.from({ length: RATE }, (_, i) => 1 - i / RATE);
  const voice = new PhaseDistortionVoice({});
  const out = new Float32Array(RATE);
  voice.render(out, 0, RATE, { frequency: 100, detune: 0, dcw, wave: SAW }, RATE);
  const first = partial(out, 0, 4800, 200);
  const last = partial(out, RATE - 4800, 4800, 200);
  expectAll(t, [atLeast('second partial, first 0.1 s over last 0.1 s, dB', dB(first / last), 20)]);
});

test('a phase handed in is where the line starts: 0.5 at dcw 0 starts at the top of the cosine', (t) => {
  expectAll(t, [within('first sample at phase 0.5', rendered({ phase: 0.5 }, {}, 16)[0], 1, 1e-6)]);
});
