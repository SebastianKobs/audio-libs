// The track pool's unit tests (mockup/src/libs/sequencing/sequencer/track-pool.ts; mockup/architecture/views.md): plays go on a pool's tracks as a
// polysynth's notes go on its voices, one play at a time on each, free again once its tail has died away
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TrackPool, poolsFor } from '../track-pool.ts';

const flower = (n) => ({ kind: 'tap', n }); // an owner: any object, as a plant is

test('plays that overlap go on tracks of their own, the lowest free first, and a track is added only when all are busy', () => {
  const r = new TrackPool();
  const [a, b, c, d] = [1, 2, 3, 4].map(flower);
  assert.deepEqual([r.place(a, 0, 4), r.place(b, 1, 5), r.place(c, 2, 6)], [0, 1, 2], 'three at once: three tracks');
  assert.equal(r.place(d, 4.5, 8), 0, 'the first free again: the lowest free');
  assert.equal(r.tracks.length, 3, 'no track added while one is free');
});

test('a play goes on the track its owner played on last, if that one is free, even when a lower one is', () => {
  const r = new TrackPool();
  const [a, b] = [1, 2].map(flower);
  r.place(a, 0, 4);
  r.place(b, 1, 5);
  assert.equal(r.place(b, 6, 9), 1, 'b again: its own track, though track 0 is free too');
  assert.equal(r.place(a, 6.5, 9), 0);
});

test("its owner's last track busy, a play takes the lowest free one", () => {
  const r = new TrackPool();
  const [a, b, c] = [1, 2, 3].map(flower);
  r.place(a, 0, 2);
  r.place(b, 1, 10);
  r.place(c, 3, 10); // a's track, free again, taken by c
  assert.equal(r.place(b, 4, 6), 2, "b's track still taken, and c on track 0: a new one");
});

test('a track is free only once its tail has died away: at its end exactly, and not before', () => {
  const r = new TrackPool();
  const [a, b] = [1, 2].map(flower);
  r.place(a, 0, 4);
  assert.equal(r.place(b, 3.99, 6), 1, "a's tail still ringing");
  assert.equal(r.place(b, 6, 7), 1, 'its own track, free at its end exactly');
  assert.equal(r.place(flower(3), 4, 5), 0, "a's free at its end exactly");
});

test('tracks are never taken away: as many as ever played at once', () => {
  const r = new TrackPool();
  const owners = [1, 2, 3, 4].map(flower);
  owners.forEach((o, k) => r.place(o, k * 0.5, 3)); // four at once
  r.place(owners[0], 10, 11); // then one alone
  assert.equal(r.tracks.length, 4);
  assert.deepEqual(
    r.tracks[0],
    { owner: owners[0], from: 10, until: 11 },
    'each track knows what it plays last, from when until when',
  );
});

test("a play held open, its end not known as it starts, holds its track until it's ended; then free once its tail has died away (N2)", () => {
  const r = new TrackPool();
  const [a, b] = [1, 2].map(flower);
  const held = r.place(a, 0, Infinity);
  assert.equal(r.place(b, 100, 101), 1, 'held: its track not free, however long');
  r.end(held, 3);
  assert.equal(r.place(b, 3, 4), 0, 'ended: free again from its end, the lowest');
});

test("a play may join its owner's track while the owner holds it, as notes from one place share a voice: the same track, held until the later end; one that doesn't join takes another (N5)", () => {
  const r = new TrackPool();
  const [a, b] = [1, 2].map(flower);
  assert.equal(r.place(a, 0, 4), 0);
  assert.equal(r.place(a, 1, 3, { join: true }), 0, 'joined: its tail inside the first');
  assert.equal(r.place(a, 2, 6, { join: true }), 0, 'joined: ringing on past it');
  assert.deepEqual(r.tracks[0], { owner: a, from: 0, until: 6 }, 'held from the first until the later end');
  assert.equal(r.place(a, 2.5, 5), 1, "not joining: another track, a's busy");
  assert.equal(r.place(b, 3, 4, { join: true }), 2, "b holds no track: there's none to join");
  assert.equal(r.tracks.length, 3);
});

test("a play joins only a track its owner still holds: free again, it's placed there afresh; taken by another, the lowest free (N5)", () => {
  const r = new TrackPool();
  const [a, b] = [1, 2].map(flower);
  r.place(a, 0, 2);
  assert.equal(r.place(a, 3, 4, { join: true }), 0);
  assert.deepEqual(r.tracks[0], { owner: a, from: 3, until: 4 }, 'afresh: from its own start');
  r.place(b, 5, 9); // a's track, free, taken by b
  assert.equal(r.place(a, 6, 7, { join: true }), 1, "a's last track b's now");
});

test("joined, a play held open keeps the track until it's ended, and one ringing on past that end keeps it longer (N5)", () => {
  const r = new TrackPool();
  const a = flower(1);
  const held = r.place(a, 0, Infinity);
  r.place(a, 1, 8, { join: true }); // rings on past where the held one ends
  r.end(held, 3);
  assert.equal(r.tracks[0].until, 8, 'the later end');
  assert.equal(r.place(flower(2), 5, 6), 1, 'still held');
  const again = r.place(a, 7, Infinity, { join: true });
  r.end(again, 7.5);
  assert.equal(r.tracks[0].until, 8, 'two held open, each ended: the latest end of all');
});

test("a pool for each key, each its own: a play on one leaves the others' tracks free", () => {
  const pools = poolsFor(['a', 'b']);
  const owner = flower(1);
  assert.equal(pools.a.place(owner, 0, 1), 0);
  assert.equal(pools.b.place(owner, 0, 1), 0);
  assert.deepEqual(Object.keys(pools), ['a', 'b']);
});
