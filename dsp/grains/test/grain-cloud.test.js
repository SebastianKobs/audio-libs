// The grain cloud's unit tests (mockup/src/libs/dsp/grains/): an input kept in a ring and played back as short overlapping grains,
// frozen or listening, pitched, strayed by a random handed in. No audio: fed Float32Arrays, its output read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GrainCloud } from '../index.ts';
import { seeded } from '../../../base/util/index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const GRAINS = { freeze: 0, position: 0.1, size: 0.05, density: 20, pitch: 0, spray: 0.01 };

const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);
const sine = (hz, length, level = 1) =>
  Float32Array.from({ length }, (_, i) => level * Math.sin((2 * Math.PI * hz * i) / RATE));
const cloud = (random = seeded(7)) => new GrainCloud({ sampleRate: RATE, memory: 1, random });
// a signal through a cloud, one channel in and one out
const play = (grains, input, params) => {
  const output = new Float32Array(input.length);
  grains.render([input], [output], input.length, params);
  return output;
};
// where two renders part: the first sample that differs, -1 when none does; a number, never the buffers (a failing deepEqual on a
// second of samples builds a diff of some 70 GB: it took WSL down, 2026-11-12)
const partsAt = (one, other) => one.findIndex((sample, i) => sample !== other[i]);

test('silence in, silence out', () => {
  assert.equal(peak(play(cloud(), new Float32Array(RATE / 2), GRAINS)), 0);
});

test('the grains play what came in a position ago, at about its level, grains as often as their density', () => {
  const grains = cloud();
  const output = play(grains, sine(330, RATE, 0.5), GRAINS);
  near(grains.spawned, 20, 'grains in 1 s at 20 a second', 2);
  const level = peak(output.subarray(RATE / 2));
  assert.ok(level > 0.15 && level < 0.75, `${level}`);
});

test('frozen, the grains play what they held and no longer hear their input', () => {
  const grains = cloud();
  play(grains, new Float32Array(RATE / 2), GRAINS); // silence held
  const frozen = play(grains, sine(330, RATE / 2, 0.8), { ...GRAINS, freeze: 1 });
  assert.equal(peak(frozen), 0, 'the silence it held');
  const listening = play(grains, sine(330, RATE / 2, 0.8), GRAINS);
  assert.ok(peak(listening) > 0.2, 'unfrozen, it hears again');
});

test('the grains pitched up an octave read faster, still within what they hold', () => {
  const output = play(cloud(), sine(220, RATE, 0.5), { ...GRAINS, pitch: 12, size: 0.2, spray: 0.1 });
  assert.ok(peak(output) > 0.1 && peak(output) < 1);
  assert.ok(output.every(Number.isFinite));
});

test('every channel plays the same grains from the same place, so the stereo image holds', () => {
  const grains = cloud();
  const input = sine(330, RATE / 2, 0.5);
  const outputs = [new Float32Array(RATE / 2), new Float32Array(RATE / 2)];
  grains.render([input, input.map((x) => x * 0.5)], outputs, input.length, GRAINS);
  const at = outputs[0].findIndex((x) => Math.abs(x) > 0.05);
  assert.ok(at >= 0, 'it sounds');
  for (let i = at; i < at + 200; i++) {
    near(outputs[1][i], outputs[0][i] * 0.5, `sample ${i}`, 1e-6);
  }
});

test('on one seed the cloud is the same for the same input, another seed another cloud', () => {
  const heard = (seed) => play(cloud(seeded(seed)), sine(330, RATE, 0.5), { ...GRAINS, density: 40, spray: 0.05 });
  const one = heard(7);
  assert.equal(partsAt(heard(7), one), -1, 'the same seed, the same cloud');
  assert.notEqual(partsAt(heard(8), one), -1, 'another seed, another cloud');
  assert.ok(peak(one) > 0.1, 'it sounds');
});

test('with no random handed it still plays, on Math.random', () => {
  const output = play(new GrainCloud({ sampleRate: RATE, memory: 1 }), sine(330, RATE, 0.5), GRAINS);
  assert.ok(output.every(Number.isFinite));
  assert.ok(peak(output) > 0.1, 'it sounds');
});

test('no more than 32 grains sound at once: a grain due with no room left is not spawned', () => {
  const grains = cloud();
  play(grains, sine(330, RATE, 0.5), { ...GRAINS, size: 0.4, density: 100 });
  assert.ok(grains.spawned < 90, `${grains.spawned} grains in 1 s at 100 a second, 40 overlapping`);
});
