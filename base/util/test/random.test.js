// libs/base/util/random.ts: a seeded generator, a seed from a text, an item picked from a list or by its weight,
// draws kept to draw again, a seeded source of draws, a slice of a record
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Draws, keptDraws, pickFrom, pickWeighted, seeded, seedOf, slice } from '../index.ts';
import { draws } from './draws.js';

const MULBERRY32_SEED_1 = [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]; // from an implementation of the reference C of its own

// mulberry32 (Tommy Ettinger's): a 32-bit seed in, a repeatable run of numbers in [0, 1) out; its first draws for seed 1 as the
// reference algorithm gives them, so another implementation (the Flutter app's) can be checked against it
test('a seeded generator: the same seed draws the same numbers, each in [0, 1); another seed others; its first draws the reference ones', () => {
  assert.deepEqual(drawnFrom(seeded(42), 1000), drawnFrom(seeded(42), 1000), 'the same seed, the same numbers');
  assert.notDeepEqual(drawnFrom(seeded(42), 1000), drawnFrom(seeded(43), 1000), 'another seed, others');
  assert.ok(
    drawnFrom(seeded(7), 1000).every((n) => n >= 0 && n < 1),
    'each in [0, 1)',
  );
  assert.deepEqual(drawnFrom(seeded(1), 3), MULBERRY32_SEED_1, "mulberry32's first three for seed 1");
});

// FNV-1a over a text's characters: the sketches' hashSeed(), so an id seeds its own stream
test("a seed from a text: the same text the same 32-bit seed, another text another; FNV-1a's known values", () => {
  assert.equal(seedOf('genome'), seedOf('genome'), 'the same text, the same seed');
  assert.notEqual(seedOf('genome'), seedOf('genomes'), 'another text, another seed');
  assert.equal(seedOf(''), 2166136261, "FNV-1a's offset for no text");
  assert.equal(seedOf('a'), 3826002220, "FNV-1a's 32-bit hash of a");
  for (const text of ['tap:1.2:3.4:16', 'origin', 'é']) {
    const seed = seedOf(text);
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32, `${text}: a 32-bit unsigned integer`);
  }
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
  const kept = keptDraws(seeded(3));
  const first = [kept.random(), kept.random()];
  assert.deepEqual(first, [random(), random()], "the source's own, as they come");
  const again = kept.again();
  assert.deepEqual([again(), again(), again()], [...first, random()], 'the same in turn, then fresh');
  const twice = kept.again();
  assert.deepEqual([twice(), twice()], first, 'each time again from the first');
});

test('a seeded source of draws: its own as seeded; each play a seed of its own, a 32-bit one, its draws again from it alone', () => {
  const source = new Draws({ seed: 5 });
  assert.deepEqual(
    drawnFrom(() => source.random()),
    drawnFrom(seeded(5)),
    'its own, as seeded',
  );
  const play = source.play();
  assert.ok(Number.isInteger(play.seed) && play.seed >= 0 && play.seed < 2 ** 32, "a play's seed, 32 bits");
  assert.deepEqual(drawnFrom(play.random), drawnFrom(seeded(play.seed)), 'drawn again from its seed alone');
  assert.notEqual(source.play().seed, play.seed, 'the next play another');
});

test('a seeded source of draws seeded again, a case at a time, as the tests and the recorders hand one in', () => {
  const source = new Draws({ seed: 5 });
  const first = [source.random(), source.play().seed];
  source.random();
  source.reseed(5);
  assert.deepEqual([source.random(), source.play().seed], first, 'as from the start');
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

function drawnFrom(random, count = 8) {
  return Array.from({ length: count }, () => random());
}
