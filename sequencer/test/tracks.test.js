// The replay tracks' unit tests (mockup/src/libs/sequencer/tracks.ts; mockup/architecture/views.md): a kind's plays go on its replay
// tracks as a polysynth's notes go on its voices, one play at a time on each, free again once its tail has died away
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReplayTracks } from '../tracks.ts';

const flower = (n) => ({ kind: 'tap', n }); // an owner: any object, as a plant is

test('plays that overlap go on tracks of their own, the lowest free first, and a track is added only when all are busy', () => {
  const r = new ReplayTracks();
  const [a, b, c, d] = [1, 2, 3, 4].map(flower);
  assert.deepEqual([r.place(a, 0, 4), r.place(b, 1, 5), r.place(c, 2, 6)], [0, 1, 2], 'three at once: three tracks');
  assert.equal(r.place(d, 4.5, 8), 0, 'the first free again: the lowest free');
  assert.equal(r.tracks.length, 3, 'no track added while one is free');
});

test('a play goes on the track its owner played on last, if that one is free, even when a lower one is', () => {
  const r = new ReplayTracks();
  const [a, b] = [1, 2].map(flower);
  r.place(a, 0, 4);
  r.place(b, 1, 5);
  assert.equal(r.place(b, 6, 9), 1, 'b again: its own track, though track 0 is free too');
  assert.equal(r.place(a, 6.5, 9), 0);
});

test("its owner's last track busy, a play takes the lowest free one", () => {
  const r = new ReplayTracks();
  const [a, b, c] = [1, 2, 3].map(flower);
  r.place(a, 0, 2);
  r.place(b, 1, 10);
  r.place(c, 3, 10); // a's track, free again, taken by c
  assert.equal(r.place(b, 4, 6), 2, "b's track still sounding, and c on track 0: a new one");
});

test('a track is free only once its tail has died away: at its end exactly, and not before', () => {
  const r = new ReplayTracks();
  const [a, b] = [1, 2].map(flower);
  r.place(a, 0, 4);
  assert.equal(r.place(b, 3.99, 6), 1, "a's tail still ringing");
  assert.equal(r.place(b, 6, 7), 1, 'its own track, free at its end exactly');
  assert.equal(r.place(flower(3), 4, 5), 0, "a's free at its end exactly");
});

test('tracks are never taken away: as many as ever played at once', () => {
  const r = new ReplayTracks();
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
