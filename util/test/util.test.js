// small shared helpers, their unit tests (mockup/src/libs/util/index.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Events, seeded, smoothstep, toggleIn, updateInPlace } from '../index.ts';

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
  const { on, emit } = events; // as a module hands on its on() (gestures/shared.ts, session-view/clips.ts)
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
