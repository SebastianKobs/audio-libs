// A bar's grid (music/meter/grid.ts): each beat cut in its subdivisions, the same for all or a count a beat
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridPositions, meterOf } from '../index.ts';
import { near } from '../../../base/util/test/near.js';

test('4/4 in 16ths: 16 positions, each its beat, its index in the beat and the beat’s count', () => {
  const grid = gridPositions(meterOf('4', 4), 4);
  assert.equal(grid.length, 16);
  assert.deepEqual(grid[5], { at: 1.25, beat: 1, index: 1, of: 4 });
  assert.deepEqual(grid[15], { at: 3.75, beat: 3, index: 3, of: 4 });
});

test('mixed subdivisions: 16ths, 16ths, triplets, 8ths over a bar of 4/4', () => {
  const grid = gridPositions(meterOf('4', 4), [4, 4, 3, 2]);
  assert.equal(grid.length, 13);
  const third = grid.filter((position) => position.beat === 2);
  assert.equal(third.length, 3);
  near(third[1].at, 2 + 1 / 3, 'the triplet’s second');
  near(third[2].at, 2 + 2 / 3, 'the triplet’s third');
  assert.deepEqual(
    grid.filter((position) => position.beat === 3).map((position) => position.at),
    [3, 3.5],
  );
});

test('a bar of 3.5 beats: its last beat cut short, only the positions inside the bar kept', () => {
  const meter = meterOf('3+2+2', 8);
  assert.deepEqual(
    gridPositions(meter, 2).map((position) => position.at),
    [0, 0.5, 1, 1.5, 2, 2.5, 3],
  );
  assert.deepEqual(
    gridPositions(meter, 4)
      .slice(-2)
      .map((position) => position.at),
    [3, 3.25],
  );
});

test('a list of counts that doesn’t give each beat its own, or a count not a whole number above 0, is refused', () => {
  assert.throws(
    () => gridPositions(meterOf('3+2+2', 8), [4, 4, 4]),
    /a bar of 3.5 beats takes 4 subdivisions, one a beat, not 3/,
  );
  assert.throws(() => gridPositions(meterOf('4', 4), 0), /a whole number above 0, not 0/);
  assert.throws(() => gridPositions(meterOf('4', 4), [4, 2.5, 4, 4]), /a whole number above 0, not 2.5/);
});
