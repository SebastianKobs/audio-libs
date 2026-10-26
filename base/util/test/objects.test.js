// libs/base/util/objects.ts: a key toggled in a set, a map's entry made when asked for, a chain of keys
// followed through a map, a list kept up to a cap, an object updated in place, data compared
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainFrom, entryOf, keep, sameData, toggleIn, updateInPlace } from '../index.ts';

test('a key toggled in a set: taken out if it was in, put in if not; or put in or taken out as asked', () => {
  const muted = new Set(['bass']);
  toggleIn(muted, 'bass');
  toggleIn(muted, 'brush');
  assert.deepEqual([...muted], ['brush'], 'toggled');
  toggleIn(muted, 'brush', true);
  toggleIn(muted, 'bass', false);
  assert.deepEqual([...muted], ['brush'], 'as asked: kept in, kept out');
  toggleIn(muted, 'brush', false);
  toggleIn(muted, 'bass', true);
  assert.deepEqual([...muted], ['bass'], 'as asked: taken out, put in');
});

test('an object updated in place keeps every object and array in it that stays one, so what holds a part of it sees the change', () => {
  const hits = [[0.4, 0, 0.02]];
  const target = {
    level: 1,
    handle: { hits: { brush: hits } },
    oscs: [{ wave: 'sine' }, { wave: 'sine' }],
    gone: 1,
    was: { x: 1 },
  };
  const held = target.handle.hits;
  const from = {
    level: 0.5,
    handle: {
      hits: {
        brush: [
          [0.8, 0, 0.02],
          [0.2, 0.1, 0.05],
        ],
      },
    },
    oscs: [{ wave: 'square' }],
    added: { x: 1 },
    was: 2,
  };
  assert.equal(updateInPlace(target, from), target);
  assert.deepEqual(
    target,
    from,
    'its values from, keys gone and added, an array shorter or longer, an object become a number',
  );
  assert.equal(target.handle.hits, held, 'its nested objects kept');
  assert.equal(target.handle.hits.brush, hits, 'and its arrays');
  from.added.x = 2;
  from.handle.hits.brush[1][0] = 0;
  assert.deepEqual(
    [target.added.x, target.handle.hits.brush[1][0]],
    [1, 0.2],
    'nothing shared with where it came from',
  );
});

test("a map's entry for a key, made the first time it's asked for, the same one after", () => {
  const lists = new Map();
  const made = [];
  const make = () => {
    made.push('made');
    return [];
  };
  entryOf(lists, 'tap', make).push(1);
  entryOf(lists, 'tap', make).push(2);
  assert.deepEqual([lists.get('tap'), made], [[1, 2], ['made']]);
  const owner = {};
  assert.equal(
    entryOf(new WeakMap([[owner, 7]]), owner, () => 0),
    7,
    'a weak map too',
  );
});

test('a chain of keys followed through a map: each item naming the next, to one with no next or one not there; one met again, where it loops', () => {
  const byKey = new Map([
    ['a', { next: 'b' }],
    ['b', { next: 'c' }],
    ['c', {}],
    ['x', { next: 'y' }],
    ['y', { next: 'x' }],
  ]);
  const next = (item) => item.next;
  assert.deepEqual(chainFrom('a', byKey, next), { keys: ['a', 'b', 'c'], again: undefined });
  assert.deepEqual(
    chainFrom('b', new Map([['b', { next: 'gone' }]]), next),
    { keys: ['b', 'gone'], again: undefined },
    'one not there, the last',
  );
  assert.deepEqual(chainFrom('x', byKey, next), { keys: ['x', 'y'], again: 'x' });
  assert.deepEqual(chainFrom(undefined, byKey, next), { keys: [], again: undefined });
});

test('data the same as other data: numbers, strings and nulls by value, arrays item by item in order, objects key by key in any order', () => {
  assert.ok(sameData({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 }), 'keys in another order');
  assert.ok(!sameData({ a: 1 }, { a: 1, b: undefined }), 'a key more');
  assert.ok(!sameData([1, 2], [2, 1]), 'an array in another order');
  assert.ok(!sameData({ a: [1] }, { a: { 0: 1 } }), 'an array not an object');
  assert.ok(!sameData({ a: null }, { a: {} }));
  assert.ok(sameData(null, null) && !sameData(1, '1'));
});

test('a record keeps events up to its cap, and then none', () => {
  const record = [];
  assert.deepEqual(keep(record, { start: 0 }, 2), { start: 0 });
  keep(record, { start: 24 }, 2);
  assert.equal(keep(record, { start: 48 }, 2), null);
  assert.deepEqual(record, [{ start: 0 }, { start: 24 }]);
});
