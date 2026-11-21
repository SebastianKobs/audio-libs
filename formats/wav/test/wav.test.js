// The WAV encoder's unit tests (formats/wav/): float channels clamped, TPDF-dithered and
// rounded to 16-bit PCM after a RIFF header, the random handed in
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const HEADER_BYTES = 44;
const LSB = 1 / 32767;
const NO_DITHER = () => 0.5; // each of the two draws ±0 LSB

// a small repeatable generator, so no library is needed to seed one
function seededDraws(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function viewOf(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function textAt(bytes, offset) {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4));
}

function samplesOf(bytes) {
  const view = viewOf(bytes);
  const count = (bytes.length - HEADER_BYTES) / 2;
  return Array.from({ length: count }, (_, i) => view.getInt16(HEADER_BYTES + i * 2, true));
}

test('the header: RIFF, WAVE, a PCM fmt chunk of 16-bit stereo at the rate, then the data chunk with its size', () => {
  const bytes = encodeWav({
    channels: [new Float32Array(3), new Float32Array(3)],
    sampleRate: 44100,
    random: NO_DITHER,
  });
  const view = viewOf(bytes);
  assert.equal(textAt(bytes, 0), 'RIFF');
  assert.equal(view.getUint32(4, true), bytes.length - 8, 'the RIFF size: everything after its own two fields');
  assert.equal(textAt(bytes, 8), 'WAVE');
  assert.equal(textAt(bytes, 12), 'fmt ');
  assert.equal(view.getUint32(16, true), 16, 'the fmt chunk of PCM');
  assert.equal(view.getUint16(20, true), 1, 'PCM');
  assert.equal(view.getUint16(22, true), 2, 'channels');
  assert.equal(view.getUint32(24, true), 44100, 'sample rate');
  assert.equal(view.getUint32(28, true), 44100 * 4, 'bytes a second');
  assert.equal(view.getUint16(32, true), 4, 'bytes a frame');
  assert.equal(view.getUint16(34, true), 16, 'bits a sample');
  assert.equal(textAt(bytes, 36), 'data');
  assert.equal(view.getUint32(40, true), 3 * 4, 'the data: three frames of four bytes');
  assert.equal(bytes.length, HEADER_BYTES + 12);
});

test('the channels interleaved, a frame at a time, as little-endian 16-bit', () => {
  const left = Float32Array.of(0.5, -0.25, 0);
  const right = Float32Array.of(-1, 1, 0.25);
  const bytes = encodeWav({ channels: [left, right], sampleRate: 48000, random: NO_DITHER });
  assert.deepEqual(samplesOf(bytes), [16384, -32767, -8192, 32767, 0, 8192]);
});

test('a mono file: one channel, a frame of two bytes', () => {
  const bytes = encodeWav({ channels: [Float32Array.of(1, -1)], sampleRate: 22050, random: NO_DITHER });
  const view = viewOf(bytes);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint16(32, true), 2);
  assert.deepEqual(samplesOf(bytes), [32767, -32767]);
});

test('beyond full scale is clamped, never wrapped, with the dither at its largest either way', () => {
  const loud = Float32Array.of(3, -3);
  const upward = encodeWav({ channels: [loud], sampleRate: 44100, random: () => 0.999999 });
  const downward = encodeWav({ channels: [loud], sampleRate: 44100, random: () => 0 });
  assert.deepEqual(samplesOf(upward), [32767, -32766], 'dithered up: the top held at 32767');
  assert.deepEqual(samplesOf(downward), [32766, -32768], 'dithered down: the bottom held at -32768');
});

test('TPDF dither: two draws of ±½ LSB a sample, added before rounding, so a tone under one LSB keeps its level', () => {
  const draws = [0.9, 0.7, 0.1, 0.3]; // dither +0.4 + 0.2 = +0.6 LSB, then -0.4 + -0.2 = -0.6 LSB
  let drawn = 0;
  const bytes = encodeWav({
    channels: [Float32Array.of(0.2 * LSB, 0.2 * LSB)],
    sampleRate: 44100,
    random: () => draws[drawn++],
  });
  assert.equal(drawn, 4, 'two draws a sample');
  assert.deepEqual(samplesOf(bytes), [1, 0], '0.2 + 0.6 rounds to 1; 0.2 - 0.6 rounds to 0');
});

test('a constant a third of an LSB comes out as noise whose mean is that third, its error never over one LSB', () => {
  const count = 30000;
  const quiet = new Float32Array(count).fill(LSB / 3);
  const samples = samplesOf(encodeWav({ channels: [quiet], sampleRate: 44100, random: seededDraws(7) }));
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / count;
  near(mean, 1 / 3, 'the mean, where plain rounding gives 0', 0.02);
  assert.ok(
    samples.every((sample) => sample >= -1 && sample <= 1),
    'steps of one LSB at most',
  );
  assert.ok(new Set(samples).size > 1, 'not a constant');
});

test('the same random, the same bytes', () => {
  const tone = Float32Array.from({ length: 100 }, (_, i) => Math.sin(i / 5) * 0.001);
  const first = encodeWav({ channels: [tone], sampleRate: 44100, random: seededDraws(3) });
  const second = encodeWav({ channels: [tone], sampleRate: 44100, random: seededDraws(3) });
  assert.deepEqual(first, second);
});

test('an empty file is a header alone', () => {
  const bytes = encodeWav({
    channels: [new Float32Array(0), new Float32Array(0)],
    sampleRate: 44100,
    random: NO_DITHER,
  });
  assert.equal(bytes.length, HEADER_BYTES);
  assert.equal(viewOf(bytes).getUint32(40, true), 0);
});

test('channels of different lengths, none at all or a rate that is not a positive whole number are refused, saying why', () => {
  const refused = (setup, message) => assert.throws(() => encodeWav({ random: NO_DITHER, ...setup }), message);
  refused({ channels: [new Float32Array(2), new Float32Array(3)], sampleRate: 44100 }, /same length/);
  refused({ channels: [], sampleRate: 44100 }, /at least one channel/);
  refused({ channels: [new Float32Array(1)], sampleRate: 0 }, /sample rate/);
  refused({ channels: [new Float32Array(1)], sampleRate: 44100.5 }, /sample rate/);
});
