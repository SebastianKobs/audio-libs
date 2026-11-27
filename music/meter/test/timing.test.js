// A timing template (music/meter/timing.ts): an offset for each index of a beat cut in so many, in beats or in ms at a tempo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timedPosition, timingOffset } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

const SECOND_16TH = { at: 1.25, beat: 1, index: 1, of: 4 };
const FOURTH_16TH = { at: 1.75, beat: 1, index: 3, of: 4 };

test('offsets in beats: each index moved by its own', () => {
  const template = { subdivision: 4, offsets: [0, 0.02, -0.01, 0.03], unit: 'beats' };
  near(timingOffset(SECOND_16TH, template, 120), 0.02);
  near(timedPosition(SECOND_16TH, template, 120), 1.27);
  near(timedPosition(FOURTH_16TH, template, 120), 1.78);
});

test('offsets in ms at a tempo: at 120 bpm a beat is 500 ms, so 10 ms is 0.02 of a beat', () => {
  const template = { subdivision: 4, offsets: [0, 10, 0, -5], unit: 'ms' };
  near(timedPosition(SECOND_16TH, template, 120), 1.27);
  near(timedPosition(FOURTH_16TH, template, 120), 1.74);
  near(timingOffset(SECOND_16TH, template, 60), 0.01, 'at 60 bpm, a beat of 1000 ms');
});

test('a beat cut otherwise than the template’s stays where it is', () => {
  const template = { subdivision: 4, offsets: [0, 0.02, 0, 0.02], unit: 'beats' };
  const triplet = { at: 2 + 1 / 3, beat: 2, index: 1, of: 3 };
  assert.equal(timingOffset(triplet, template, 120), 0);
  assert.equal(timedPosition(triplet, template, 120), triplet.at);
});
