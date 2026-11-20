// The sync voice's unit tests (mockup/src/libs/dsp/oscillators/): a master oscillator at the note, a slave some semitones above it
// reset at each turn of the master's, the slave heard as a sawtooth or a square, band-limited. No audio: fed numbers, its output read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SyncVoice } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const RATE = 48000;
const peak = (samples) => samples.reduce((most, x) => Math.max(most, Math.abs(x)), 0);

const rendered = (params, length = 4800) => {
  const voice = new SyncVoice();
  const out = new Float32Array(length);
  voice.render(out, 0, length, params, RATE);
  return out;
};
// a saw's turns, a square's flips: each a fall through 0, however a polyBLEP spreads it over two samples
const falls = (samples) =>
  samples.reduce((count, x, i) => (i > 0 && samples[i - 1] > 0 && x <= 0 ? count + 1 : count), 0);

test('a synced oscillator at no sync is a sawtooth at its frequency, band-limited: no sample past full scale by much', () => {
  const out = rendered({ frequency: 100, detune: 0, sync: 0, wave: 0 });
  near(falls(out), 10, '0.1 s at 100 Hz', 1);
  assert.ok(peak(out) < 1.2);
});

test("a synced oscillator keeps its master's pitch as its sync rises: its waveform repeats every master period", () => {
  for (const sync of [7, 12, 19.5]) {
    const out = rendered({ frequency: 480, detune: 0, sync, wave: 0 });
    const period = RATE / 480; // 100 samples
    let most = 0;
    for (let i = 1000; i < 4000; i++) {
      most = Math.max(most, Math.abs(out[i] - out[i + period]));
    }
    assert.ok(most < 0.05, `sync ${sync}: ${most} off its master's period`);
    assert.ok(peak(out) < 1.3, `sync ${sync}: bounded`);
  }
});

test("a synced oscillator's sync changes its timbre: more of its turns fall in the master's period", () => {
  const plain = rendered({ frequency: 200, detune: 0, sync: 0, wave: 0 });
  const synced = rendered({ frequency: 200, detune: 0, sync: 12, wave: 0 });
  assert.ok(falls(synced) > falls(plain) * 1.8);
});

test("a synced oscillator's square wave: between -1 and 1, its detune an octave up doubling its turns", () => {
  const square = rendered({ frequency: 100, detune: 0, sync: 0, wave: 1 });
  const mean = square.reduce((sum, x) => sum + x, 0) / square.length;
  assert.ok(Math.abs(mean) < 0.05, 'half up, half down');
  assert.ok(peak(square) < 1.3);
  const up = rendered({ frequency: 100, detune: 1200, sync: 0, wave: 0 });
  near(falls(up), 20, 'an octave up', 1);
});

test('a param given a sample each is followed sample by sample; only the samples from..to are written', () => {
  const voice = new SyncVoice();
  const out = new Float32Array(200).fill(7);
  const frequency = Float32Array.from({ length: 200 }, (_, i) => (i < 100 ? 100 : 400));
  voice.render(out, 50, 150, { frequency, detune: 0, sync: 0, wave: 0 }, RATE);
  assert.ok(
    out.subarray(0, 50).every((x) => x === 7),
    'before from, untouched',
  );
  assert.ok(
    out.subarray(150).every((x) => x === 7),
    'from to on, untouched',
  );
  assert.ok(
    out.subarray(50, 150).every((x) => Math.abs(x) < 1.3),
    'between, rendered',
  );
});
