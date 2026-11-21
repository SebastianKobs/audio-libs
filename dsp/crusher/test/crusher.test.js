// The crusher's unit tests (dsp/crusher/): a channel's samples taken at a rate and held, each rounded to a
// number of bits' steps, and the same on each channel of a block. No audio: fed Float32Arrays, its output read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Crusher, crushed } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
const sine = (hz, length, level = 1) =>
  Float32Array.from({ length }, (_, i) => level * Math.sin((2 * Math.PI * hz * i) / RATE));
const ramp = (length) => Float32Array.from({ length }, (_, i) => (i / (length - 1)) * 2 - 1);
const fresh = () => ({ phase: 0, held: 0 });

test('at 16 bits and the full rate the sound passes as it comes, near enough', () => {
  const input = sine(440, 512, 0.8);
  const output = new Float32Array(512);
  crushed(input, output, fresh(), { bits: 16, rate: RATE, sampleRate: RATE });
  for (let i = 0; i < 512; i++) {
    near(output[i], input[i], `sample ${i}`, 1e-4);
  }
});

test("it rounds to its bits' steps: 3 bits, eight steps across full scale", () => {
  const output = new Float32Array(256);
  crushed(ramp(256), output, fresh(), { bits: 3, rate: RATE, sampleRate: RATE });
  const levels = new Set(Array.from(output, (x) => Math.round(x * 1000)));
  assert.ok(levels.size <= 9 && levels.size >= 8, `${levels.size} levels`);
  assert.ok(peak(output) <= 1);
});

test('at 6 bits a ramp from -1 to 1 is every sample a whole number of 1/32s, at most 65 different values', () => {
  const output = new Float32Array(48000);
  crushed(ramp(48000), output, fresh(), { bits: 6, rate: RATE, sampleRate: RATE });
  let furthest = 0;
  for (const sample of output) {
    furthest = Math.max(furthest, Math.abs(sample * 32 - Math.round(sample * 32)));
  }
  assert.ok(furthest < 1e-6, `${furthest} off a whole number of 1/32s`);
  const values = new Set(output).size;
  assert.ok(values <= 65, `${values} different values`);
});

test('at 30000 Hz of 48000 on a ramp the held sample changes 30000 times, within 2', () => {
  const output = new Float32Array(48000);
  crushed(ramp(48000), output, fresh(), { bits: 16, rate: 30000, sampleRate: RATE });
  let changes = 0;
  for (let i = 1; i < output.length; i++) {
    if (output[i] !== output[i - 1]) {
      changes++;
    }
  }
  near(changes, 30000, 'changes', 2);
});

test('it holds each sample for its rate: a quarter rate, each held four samples', () => {
  const input = Float32Array.from({ length: 64 }, (_, i) => i / 64);
  const output = new Float32Array(64);
  crushed(input, output, fresh(), { bits: 16, rate: RATE / 4, sampleRate: RATE });
  for (let i = 4; i < 60; i += 4) {
    assert.equal(output[i], output[i + 1]);
    assert.equal(output[i], output[i + 3]);
    assert.notEqual(output[i], output[i + 4]);
  }
});

test('its state carries to the next block: two blocks crushed as one', () => {
  const input = sine(300, 256, 0.7);
  const whole = new Float32Array(256);
  crushed(input, whole, fresh(), { bits: 5, rate: 7000, sampleRate: RATE });
  const state = fresh();
  const halves = new Float32Array(256);
  const settings = { bits: 5, rate: 7000, sampleRate: RATE };
  crushed(input.subarray(0, 100), halves.subarray(0, 100), state, settings);
  crushed(input.subarray(100), halves.subarray(100), state, settings);
  assert.equal(
    halves.findIndex((x, i) => x !== whole[i]),
    -1,
    'the same samples',
  );
});

test('a block of channels: each crushed apart, silent where nothing comes in, a state a channel kept between blocks', () => {
  const crusher = new Crusher({ sampleRate: RATE });
  const outputs = [new Float32Array(128), new Float32Array(128)];
  crusher.render([sine(300, 128), new Float32Array(128)], outputs, { bits: 4, rate: RATE });
  assert.ok(peak(outputs[0]) > 0.5);
  assert.equal(peak(outputs[1]), 0);
  const left = new Float32Array(128);
  crusher.render([sine(300, 128), undefined], [left, new Float32Array(128)], { bits: 4, rate: RATE });
  assert.ok(peak(left) > 0.5, 'its second block');
  assert.doesNotThrow(() => crusher.render([], [new Float32Array(128)], { bits: 4, rate: RATE }));
});
