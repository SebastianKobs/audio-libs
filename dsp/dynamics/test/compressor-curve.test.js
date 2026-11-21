// The compressor curve's unit tests (dsp/dynamics/): the level a browser's compressor node brings
// a steady sound to, and its make-up. No audio in node: each a number in and a number out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compressedLevel, compressorMakeup } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test('a hard knee at -18 dBFS and 2:1: -6 comes out at -12, -30 as it came, the make-up 5.4 dB', () => {
  const hard = { threshold: -18, knee: 0, ratio: 2 };
  near(compressedLevel(-6, hard), -12, '-6', 0.01);
  near(compressedLevel(-30, hard), -30, '-30', 0.01);
  near(compressorMakeup(hard), 5.4, 'make-up', 0.01);
});

test('a hard knee at -0.3 dBFS and 20:1: the make-up 0.171 dB', () => {
  const limiting = { threshold: -0.3, knee: 0, ratio: 20 };
  near(compressorMakeup(limiting), 0.171, 'make-up', 0.001);
});

test('a 6 dB knee at -18 dBFS and 2:1: -6 comes out at -10.58, -15 at -15.42, the make-up 4.55 dB', () => {
  const soft = { threshold: -18, knee: 6, ratio: 2 };
  near(compressedLevel(-6, soft), -10.58, '-6', 0.05);
  near(compressedLevel(-15, soft), -15.42, '-15', 0.05);
  near(compressorMakeup(soft), 4.55, 'make-up', 0.02);
});

test("a ratio of 1 compresses nothing: the make-up 0, a hundredth of a dB left in a knee by k's search stopping at 0.1", () => {
  near(compressorMakeup({ threshold: -18, knee: 6, ratio: 1 }), 0, 'knee 6', 0.02);
  near(compressorMakeup({ threshold: -18, knee: 0, ratio: 1 }), 0, 'knee 0', 0.001);
});

test('from -40 to 0 dBFS in steps of 0.01 the curve never falls and never steps by more than 0.011', () => {
  for (const knee of [0, 6, 30]) {
    const settings = { threshold: -18, knee, ratio: 2 };
    let before = compressedLevel(-40, settings);
    for (let step = 1; step <= 4000; step++) {
      const after = compressedLevel(-40 + step * 0.01, settings);
      assert.ok(after >= before - 1e-9, `knee ${knee}: falls at ${-40 + step * 0.01}`);
      assert.ok(after - before <= 0.011, `knee ${knee}: steps ${after - before} at ${-40 + step * 0.01}`);
      before = after;
    }
  }
});
