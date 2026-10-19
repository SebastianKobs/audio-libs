// A point and a box on the floor (mockup/src/libs/spatial/floor.ts): where they lie and meet
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boxAround, circleCrossings, contains, distanceToBox, overlaps, pointAlong } from '../index.ts';

const BOX = { x0: -1, x1: 1, z0: -2, z1: 2 };

test('a box round a centre: filled in place, the same object handed back', () => {
  const footprint = { x0: 0, x1: 0, z0: 0, z1: 0 };
  const filled = boxAround(footprint, { x: 3, z: -4 }, 0.5);
  assert.equal(filled, footprint);
  assert.deepEqual(footprint, { x0: 2.5, x1: 3.5, z0: -4.5, z1: -3.5 });
});

test("a point's distance to a box: 0 inside it and on its edge, straight across beside it, the corner's diagonal off a corner", () => {
  assert.equal(distanceToBox({ x: 0, z: 0 }, BOX), 0);
  assert.equal(distanceToBox({ x: 1, z: 2 }, BOX), 0);
  assert.equal(distanceToBox({ x: 4, z: 0 }, BOX), 3);
  assert.equal(distanceToBox({ x: 0, z: -5 }, BOX), 3);
  assert.equal(distanceToBox({ x: 4, z: 6 }, BOX), 5);
});

test('two boxes overlapping: edges touching count, apart not', () => {
  assert.equal(overlaps(BOX, { x0: 0, x1: 3, z0: 0, z1: 3 }), true);
  assert.equal(overlaps(BOX, { x0: 1, x1: 3, z0: 2, z1: 3 }), true);
  assert.equal(overlaps(BOX, { x0: 1.5, x1: 3, z0: 0, z1: 3 }), false);
  assert.equal(overlaps(BOX, { x0: 0, x1: 3, z0: 2.5, z1: 3 }), false);
});

test('a point inside a box: its edges in, outside not', () => {
  assert.equal(contains(BOX, { x: 0, z: 0 }), true);
  assert.equal(contains(BOX, { x: -1, z: 2 }), true);
  assert.equal(contains(BOX, { x: 1.1, z: 0 }), false);
  assert.equal(contains(BOX, { x: 0, z: -2.1 }), false);
});

test('two circles crossing: both ends of their common chord, touching once the same point twice, apart or one inside the other none', () => {
  const crossed = circleCrossings({ x: 0, z: 0 }, 5, { x: 6, z: 0 }, 5);
  assert.deepEqual(crossed, [
    { x: 3, z: 4 },
    { x: 3, z: -4 },
  ]);
  assert.deepEqual(circleCrossings({ x: 0, z: 0 }, 1, { x: 2, z: 0 }, 1), [
    { x: 1, z: 0 },
    { x: 1, z: 0 },
  ]);
  assert.deepEqual(circleCrossings({ x: 0, z: 0 }, 1, { x: 5, z: 0 }, 1), []);
  assert.deepEqual(circleCrossings({ x: 0, z: 0 }, 5, { x: 1, z: 0 }, 1), []);
  assert.deepEqual(circleCrossings({ x: 0, z: 0 }, 1, { x: 0, z: 0 }, 2), []);
});

test('a point along a line by its length: held at its ends, between them on the segment it falls in', () => {
  const points = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
  ];
  const lengths = [0, 4, 7];
  assert.deepEqual(pointAlong(points, lengths, 2), { x: 2, z: 0 });
  assert.deepEqual(pointAlong(points, lengths, 4), { x: 4, z: 0 });
  assert.deepEqual(pointAlong(points, lengths, 5.5), { x: 4, z: 1.5 });
  assert.deepEqual(pointAlong(points, lengths, -1), { x: 0, z: 0 });
  assert.deepEqual(pointAlong(points, lengths, 9), { x: 4, z: 3 });
  assert.deepEqual(pointAlong([{ x: 2, z: 2 }], [0], 5), { x: 2, z: 2 });
});
