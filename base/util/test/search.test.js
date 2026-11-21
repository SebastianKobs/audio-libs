// base/util/search.ts and due.ts: where a time falls in a list rising by its key, a value between
// timed points, things due at a time, an item put in time order among others
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DueQueue, firstAfter, lastAtOrBefore, placeInOrder, valueBetween } from '../index.ts';

test('the first of a list rising by its key later than a time, by halves; the last at or before it', () => {
  const times = [{ t: 1 }, { t: 2 }, { t: 2 }, { t: 4 }];
  const tOf = (item) => item.t;
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((t) => firstAfter(times, t, tOf)),
    [0, 1, 3, 3, 4, 4],
    'its index; past them all, their length',
  );
  assert.deepEqual(
    [0, 1, 2, 3, 5].map((t) => lastAtOrBefore(times, t, tOf)),
    [undefined, times[0], times[2], times[2], times[3]],
    'the last of those at a time; none before the first',
  );
});

test('a value at a time between timed points: a line between each two, held before the first and after the last', () => {
  const points = [
    { t: 0, v: 0 },
    { t: 2, v: 4 },
    { t: 3, v: 4 },
  ];
  const timeOf = (point) => point.t;
  const valueOf = (point) => point.v;
  assert.deepEqual(
    [1, 2, -1, 5].map((time) => valueBetween(points, time, timeOf, valueOf)),
    [2, 4, 0, 4],
  );
});

test('things due at a time: kept in their time order, after those at the same time; an item put in order among others; those due taken in it, at a time or before it', () => {
  const due = new DueQueue((item) => item.t);
  due.add({ t: 3, name: 'third' });
  due.add({ t: 1, name: 'first' });
  due.add({ t: 3, name: 'fourth' });
  due.add({ t: 2, name: 'second' });
  assert.deepEqual(
    due.items.map((item) => item.name),
    ['first', 'second', 'third', 'fourth'],
  );
  assert.deepEqual(due.takeDue(0.5), [], 'none yet');
  assert.deepEqual(
    due.takeDue(2).map((item) => item.name),
    ['first', 'second'],
    'at or before its time',
  );
  assert.deepEqual(
    due.items.map((item) => item.name),
    ['third', 'fourth'],
    'the rest kept',
  );
  const items = [
    { t: 1, name: 'a' },
    { t: 2, name: 'c' },
  ];
  placeInOrder(items, { t: 1, name: 'b' }, (item) => item.t);
  placeInOrder(items, { t: 0, name: 'first' }, (item) => item.t);
  assert.deepEqual(
    items.map((item) => item.name),
    ['first', 'a', 'b', 'c'],
    'after those at its time',
  );
  const placed = new DueQueue((item) => item.t);
  for (const item of items) {
    placed.add(item);
  }
  assert.deepEqual(
    placed.takeBefore(1).map((item) => item.name),
    ['first'],
    'before a time, not at it',
  );
  assert.deepEqual(
    placed.takeBefore(3).map((item) => item.name),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(placed.items, []);
});
