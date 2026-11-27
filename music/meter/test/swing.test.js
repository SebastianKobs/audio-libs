// Swing as a ratio (music/meter/swing.ts): the first 8th or 16th of each pair that long to the second; 1 straight, 2 a triplet
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clockSwingOf, straightPosition, swingRatioOf, swungPosition } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test('a ratio of 1 is straight: every position stays', () => {
  for (const at of [0, 0.25, 0.5, 1.75, 3]) {
    assert.equal(swungPosition(at, { ratio: 1, on: '8ths' }), at);
  }
});

test('2 on 8ths, a triplet swing: the off-beat 8th on the third triplet, the 16ths between following', () => {
  const triplet = { ratio: 2, on: '8ths' };
  near(swungPosition(0.5, triplet), 2 / 3, 'the off-beat 8th');
  near(swungPosition(1.5, triplet), 1 + 2 / 3, 'the next beat’s');
  near(swungPosition(1, triplet), 1, 'the beat itself');
  near(swungPosition(0.25, triplet), 1 / 3, 'a 16th in the first 8th, stretched');
  near(swungPosition(0.75, triplet), 2 / 3 + 0.25 * (2 / 3), 'a 16th in the second, squeezed');
});

test('3 on 16ths: each 8th a dotted 16th and a 32nd, its second 16th three quarters of the 8th in', () => {
  const dotted = { ratio: 3, on: '16ths' };
  near(swungPosition(0.25, dotted), 0.375);
  near(swungPosition(0.75, dotted), 0.875);
  near(swungPosition(0.5, dotted), 0.5, 'the 8th stays');
});

test('3.5 on 8ths: the halves 7/9 and 2/9 of the beat, 3.5 to 1', () => {
  const hard = { ratio: 3.5, on: '8ths' };
  const offBeat = swungPosition(0.5, hard);
  near(offBeat, 7 / 9);
  near(offBeat / (1 - offBeat), 3.5, 'the ratio of the halves');
});

test('straightPosition undoes swungPosition, on and between the grid', () => {
  for (const swing of [
    { ratio: 2, on: '8ths' },
    { ratio: 3.5, on: '16ths' },
  ]) {
    for (const at of [0, 0.1, 0.25, 0.5, 0.6, 0.75, 2.9]) {
      near(straightPosition(swungPosition(at, swing), swing), at, `${swing.ratio} on ${swing.on}, ${at}`);
    }
  }
});

test('to the clock’s swing and back: 0 straight and 1 a triplet there, 3(r − 1)/(r + 1) of a ratio r', () => {
  assert.equal(clockSwingOf(1), 0);
  near(clockSwingOf(2), 1, 'a triplet');
  near(clockSwingOf(3), 1.5);
  near(clockSwingOf(3.5), 5 / 3);
  near(swingRatioOf(0), 1);
  near(swingRatioOf(1), 2);
  near(swingRatioOf(clockSwingOf(3.5)), 3.5);
  // the clock at its swing 1 on 16ths puts the second 16th 4/3 of a 16th in; a ratio of 2 on 16ths, a third of a beat in
  near(swungPosition(0.25, { ratio: swingRatioOf(1), on: '16ths' }), (4 / 3) * 0.25);
});
