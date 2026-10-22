// small shared helpers, their unit tests (mockup/src/libs/base/util/index.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addressOf,
  addressText,
  approach,
  Bus,
  chainFrom,
  clamp,
  DueQueue,
  entryOf,
  isUnder,
  keep,
  Events,
  firstAfter,
  Draws,
  keptDraws,
  lastAtOrBefore,
  LiveCopies,
  modulo,
  pickFrom,
  placeInOrder,
  sameData,
  seeded,
  slice,
  SETTLED,
  pickWeighted,
  smoothstep,
  stepToward,
  toggleIn,
  under,
  updateInPlace,
  valueBetween,
} from '../index.ts';
import { isNear, near } from './near.js';

const draws = (...xs) => {
  let i = 0;
  return () => xs[i++];
}; // rand() giving these, in order

const MULBERRY32_SEED_1 = [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]; // from an implementation of the reference C of its own

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

test("events by name: each listener called in the order it came, with the event's arguments; on() hands back a way to stop listening", () => {
  const events = new Events();
  const heard = [];
  events.on('clip launched', (clip, at) => heard.push(['first', clip, at]));
  const stop = events.on('clip launched', (clip) => heard.push(['second', clip]));
  events.on('clip deleted', (clip) => heard.push(['deleted', clip]));
  events.emit('clip launched', 'flowers 1', 2.5);
  stop();
  stop(); // a second time does nothing
  events.emit('clip launched', 'vines 1', 3);
  events.emit('nothing listens', 1);
  assert.deepEqual(heard, [
    ['first', 'flowers 1', 2.5],
    ['second', 'flowers 1'],
    ['first', 'vines 1', 3],
  ]);
});

test('a listener that stops listening as it is called: the others still hear that event; on and emit work handed on alone', () => {
  const events = new Events();
  const { on, emit } = events; // as a module hands on its on() (gestures/tracker.ts, session-view/clips.ts)
  const heard = [];
  const stop = on('step', () => {
    heard.push('once');
    stop();
  });
  on('step', (i) => heard.push(i));
  emit('step', 1);
  emit('step', 2);
  assert.deepEqual(heard, ['once', 1, 2]);
});

test('a bus: a message sent, a value with its type, reaches whoever listens to its type, as it was sent; a listener stops; send and on work handed on alone', () => {
  const bus = new Bus();
  const { send, on } = bus; // as main.ts hands the views send() alone
  const heard = [];
  on('clip launched', (message) => heard.push(['first', message]));
  const stop = on('clip launched', (message) => heard.push(['second', message.slot]));
  on('stop', (message) => heard.push(['stopped', message]));
  const launch = { type: 'clip launched', slot: 'flowers 1' };
  send(launch);
  stop();
  send({ type: 'clip launched', slot: 'vines 1' });
  send({ type: 'tempo', bpm: 90 }); // none listens
  assert.deepEqual(heard, [
    ['first', launch],
    ['second', 'flowers 1'],
    ['first', { type: 'clip launched', slot: 'vines 1' }],
  ]);
  assert.equal(heard[0][1], launch, 'the very value sent: it could be kept as it is');
});

// mulberry32 (Tommy Ettinger's): a 32-bit seed in, a repeatable run of numbers in [0, 1) out; its first draws for seed 1 as the
// reference algorithm gives them, so another implementation (the Flutter app's) can be checked against it (G0g)
test('a seeded generator: the same seed draws the same numbers, each in [0, 1); another seed others; its first draws the reference ones', () => {
  const draw = (seed, count = 1000) => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => random());
  };
  assert.deepEqual(draw(42), draw(42), 'the same seed, the same numbers');
  assert.notDeepEqual(draw(42), draw(43), 'another seed, others');
  assert.ok(
    draw(7).every((n) => n >= 0 && n < 1),
    'each in [0, 1)',
  );
  assert.deepEqual(draw(1, 3), MULBERRY32_SEED_1, "mulberry32's first three for seed 1");
});

test('smoothstep, as GLSL has it: 0 up to the low edge, 1 from the high one, eased between; edges the other way round, falling', () => {
  assert.deepEqual(
    [smoothstep(2, 4, 1), smoothstep(2, 4, 2), smoothstep(2, 4, 3), smoothstep(2, 4, 4), smoothstep(2, 4, 5)],
    [0, 0, 0.5, 1, 1],
  );
  assert.equal(smoothstep(0, 1, 0.25), 0.15625, 'eased: 3x² - 2x³');
  assert.deepEqual(
    [smoothstep(40, 32, 30), smoothstep(40, 32, 36), smoothstep(40, 32, 41)],
    [1, 0.5, 0],
    'falling from the low edge to the high',
  );
});

test('a value clamped between a low and a high: itself between them, else the edge it passed', () => {
  assert.deepEqual([clamp(-2, -1, 1), clamp(0.5, -1, 1), clamp(3, -1, 1)], [-1, 0.5, 1]);
  assert.deepEqual([clamp(5, 0, Infinity), clamp(-5, -Infinity, 0)], [5, -5], 'an open edge holds nothing back');
});

test('a value modulo a size, never below 0, as a wheel of that many steps counts: -1 the last step', () => {
  assert.deepEqual([modulo(7, 5), modulo(-1, 5), modulo(-6, 5), modulo(0, 5)], [2, 4, 4, 0]);
  assert.equal(modulo(-0.25, 1), 0.75, 'a fraction too');
});

test("a value approaching its target by a time constant, as Web Audio's setTargetAtTime: each moment the same fraction of the way left", () => {
  assert.equal(approach(1, 0, 0, 0.1), 1, 'where it started from, at first');
  near(approach(1, 0, 0.1, 0.1), Math.exp(-1), 'a time constant on: 1/e of the way left');
  near(approach(0, 2, 0.2, 0.1), 2 - 2 * Math.exp(-2), 'rising the same way');
  assert.ok(
    isNear(approach(1, 0, SETTLED * 0.1, 0.1), 0, 0.01),
    'settled after SETTLED time constants: within 1 % of the way',
  );
});

test('a value stepped toward its target a frame at a time: the step over the time of the way, all of it once the step is the time or more', () => {
  assert.equal(stepToward(0, 2, 0.05, 0.1), 1, 'half the time: half the way');
  assert.equal(stepToward(4, 0, 0.025, 0.1), 3, 'a quarter of the time: a quarter of the way down');
  assert.equal(stepToward(1, 3, 0.2, 0.1), 3, 'a step past the time: all of the way');
  assert.equal(stepToward(1, 3, 0, 0.1), 1, 'no time passed: no step');
});

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

test('an item picked from a list, each as likely, by a random of its own or Math.random; none from an empty one', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.deepEqual(
    [0, 0.24, 0.25, 0.99].map((drawn) => pickFrom(list, () => drawn)),
    ['a', 'a', 'b', 'd'],
  );
  assert.ok(list.includes(pickFrom(list)), "Math.random's");
  assert.equal(
    pickFrom([], () => 0.5),
    undefined,
  );
});

test("an item picked from a list, each as likely as its weight; the last where the weights' sum is left over; none from an empty one", () => {
  const list = ['a', 'b'];
  const weightOf = (item) => (item === 'a' ? 1 : 3);
  assert.deepEqual(
    [0.2, 0.3, 0.999].map((drawn) => pickWeighted(list, weightOf, () => drawn)),
    ['a', 'b', 'b'],
  );
  assert.equal(
    pickWeighted([], weightOf, () => 0.5),
    undefined,
  );
});

test('random draws kept as they are drawn: drawn again, the same in turn, then fresh ones once they have run out', () => {
  const random = seeded(3);
  const draws = keptDraws(seeded(3));
  const first = [draws.random(), draws.random()];
  assert.deepEqual(first, [random(), random()], "the source's own, as they come");
  const again = draws.again();
  assert.deepEqual([again(), again(), again()], [...first, random()], 'the same in turn, then fresh');
  const twice = draws.again();
  assert.deepEqual([twice(), twice()], first, 'each time again from the first');
});

const draw = (random, count = 8) => Array.from({ length: count }, () => random());

test('a seeded source of draws: its own as seeded; each play a seed of its own, a 32-bit one, its draws again from it alone', () => {
  const draws = new Draws({ seed: 5 });
  assert.deepEqual(
    draw(() => draws.random()),
    draw(seeded(5)),
    'its own, as seeded',
  );
  const play = draws.play();
  assert.ok(Number.isInteger(play.seed) && play.seed >= 0 && play.seed < 2 ** 32, "a play's seed, 32 bits");
  assert.deepEqual(draw(play.random), draw(seeded(play.seed)), 'drawn again from its seed alone');
  assert.notEqual(draws.play().seed, play.seed, 'the next play another');
});

test('a seeded source of draws seeded again, a case at a time, as the tests and the recorders hand one in', () => {
  const draws = new Draws({ seed: 5 });
  const first = [draws.random(), draws.play().seed];
  draws.random();
  draws.reseed(5);
  assert.deepEqual([draws.random(), draws.play().seed], first, 'as from the start');
});

test('things due at a time: kept in their time order, after those at the same time; those whose time has come taken in it', () => {
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
});

test('an item put in time order among others, after those at its time; things due before a time, not at it, taken in their order', () => {
  const items = [
    { t: 1, name: 'a' },
    { t: 2, name: 'c' },
  ];
  placeInOrder(items, { t: 1, name: 'b' }, (item) => item.t);
  placeInOrder(items, { t: 0, name: 'first' }, (item) => item.t);
  assert.deepEqual(
    items.map((item) => item.name),
    ['first', 'a', 'b', 'c'],
  );
  const due = new DueQueue((item) => item.t);
  for (const item of items) {
    due.add(item);
  }
  assert.deepEqual(
    due.takeBefore(1).map((item) => item.name),
    ['first'],
    'not at its time',
  );
  assert.deepEqual(
    due.takeBefore(3).map((item) => item.name),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(due.items, []);
});

test("a number near another: within a float's rounding, or as asked", () => {
  assert.ok(isNear(0.1 + 0.2, 0.3));
  assert.ok(!isNear(1, 1.001));
  assert.ok(isNear(1, 1.001, 0.01), 'as asked');
  near(0.1 + 0.2, 0.3, 'passes');
  assert.throws(() => near(1, 2, 'a step'), /a step: 1, not within 1e-9 of 2/);
});

test("values kept live by name, as a device's: copies of their start, set in place so what holds one hears the change, read as copies, reset to their start; each set told (DRY8d)", () => {
  const copies = new LiveCopies({ reverb: { mix: 0.3, tail: { length: 2 } } });
  const live = copies.of('reverb');
  const tail = live.tail;
  const told = [];
  copies.onSet((name, value) => told.push([name, value.mix]));
  copies.set('reverb', { mix: 0.5, tail: { length: 3 } });
  assert.deepEqual([live.mix, tail.length, copies.of('reverb') === live], [0.5, 3, true], 'in place, all the way down');
  const copy = copies.current('reverb');
  copy.mix = 9;
  assert.equal(copies.of('reverb').mix, 0.5, 'a copy, its own');
  copies.reset('reverb');
  assert.deepEqual([live.mix, copies.start('reverb').mix], [0.3, 0.3], 'its start');
  copies.add('delay', { time: 0.25 });
  assert.deepEqual(
    [copies.has('delay'), copies.current('delay'), copies.of('nothing')],
    [true, { time: 0.25 }, undefined],
  );
  assert.deepEqual(told, [
    ['reverb', 0.5],
    ['reverb', 0.3],
  ]);
});

test('data the same as other data: numbers, strings and nulls by value, arrays item by item in order, objects key by key in any order', () => {
  assert.ok(sameData({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 }), 'keys in another order');
  assert.ok(!sameData({ a: 1 }, { a: 1, b: undefined }), 'a key more');
  assert.ok(!sameData([1, 2], [2, 1]), 'an array in another order');
  assert.ok(!sameData({ a: [1] }, { a: { 0: 1 } }), 'an array not an object');
  assert.ok(!sameData({ a: null }, { a: {} }));
  assert.ok(sameData(null, null) && !sameData(1, '1'));
});

test("an address as text, its names joined by slashes, and back; a parent's name put in front; a name with a slash refused", () => {
  assert.equal(addressText(['desk', 'channel 3', 'utility', 'level']), 'desk/channel 3/utility/level');
  assert.deepEqual(addressOf('desk/channel 3/utility/level'), ['desk', 'channel 3', 'utility', 'level']);
  assert.deepEqual(under('desk', ['channel 3', 'utility', 'level']), ['desk', 'channel 3', 'utility', 'level']);
  assert.throws(() => addressText(['send/reverb', 'level']), /send\/reverb/);
  assert.throws(() => under('a/b', ['level']), /a\/b/);
});

test('an address under another, as text: a name further down, not the other itself; every one under the top, the empty text', () => {
  assert.equal(isUnder('desk/tap/level', 'desk/tap'), true);
  assert.equal(isUnder('desk/tap', 'desk/tap'), false);
  assert.equal(isUnder('desk/tapping', 'desk/tap'), false);
  assert.equal(isUnder('desk', ''), true);
  assert.equal(isUnder('', ''), false);
});

test('a record keeps events up to its cap, and then none', () => {
  const r = [];
  assert.deepEqual(keep(r, { start: 0 }, 2), { start: 0 });
  keep(r, { start: 24 }, 2);
  assert.equal(keep(r, { start: 48 }, 2), null);
  assert.deepEqual(r, [{ start: 0 }, { start: 24 }]);
});

test('a slice: a random length from 1 to all of it, drawn first, from the start or from anywhere', () => {
  assert.deepEqual(slice(10, 'start', draws(0)), [0, 1]);
  assert.deepEqual(slice(10, 'start', draws(0.99)), [0, 10], 'all of it');
  assert.deepEqual(
    slice(10, 'random', draws(0.25, 0.5)),
    [4, 3],
    'three, from halfway through the eight places it can start',
  );
  assert.deepEqual(slice(10, 'random', draws(0.99, 0.5)), [0, 10]);
});
