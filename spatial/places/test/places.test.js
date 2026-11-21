// The spatial part's unit tests (spatial/places), on places written by
// hand, perceived as nothing but a distance: a place with a lifetime, perceived from a listener as it moves, its moves from a time on, and
// what follows them; a world that wraps round. What the sound makes of them is the hearing's (spatial/hearing/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Place, Places, WrapAround, shifted } from '../index.ts';

// a listener at a point it's handed, perceiving a place as its distance, a change mattering once it's 1 or more
function listening(at) {
  return {
    perceive: (position) => Math.hypot(position.x - at.x, position.y - at.y, position.z - at.z),
    changed: (previous, next) => Math.abs(previous - next) >= 1,
  };
}
// something placed, keeping what it's told
function placed(place) {
  return {
    place,
    told: [],
    lets: 0,
    perceivedAs(perceived) {
      this.told.push(perceived);
    },
    letGo() {
      this.lets += 1;
    },
  };
}
const at = (x, y, z) => ({ x, y, z });

test('a position shifted by an offset, a new one, the first left as it was', () => {
  const position = at(1, 2, 3);
  assert.deepEqual(shifted(position, at(10, 0, -10)), at(11, 2, -7));
  assert.deepEqual(position, at(1, 2, 3));
});

test("a place perceived from where it is as it's made; a move perceived from its time on, queued till then; a change told once it matters", () => {
  const listener = at(0, 0, 0);
  const place = new Place(listening(listener), at(3, 0, 4));
  assert.deepEqual([place.position, place.perceived, place.until, place.keep], [at(3, 0, 4), 5, Infinity, false]);
  assert.equal(place.moveTo(at(0, 0, 8), 12), 8, "perceived where it's going");
  assert.equal(place.update(11), null, 'before its time: where it was, unchanged');
  assert.deepEqual(place.position, at(3, 0, 4));
  assert.equal(place.update(12), null, 'from its time: there, as it was perceived then, nothing new to tell');
  assert.deepEqual([place.position, place.perceived], [at(0, 0, 8), 8]);
  listener.z = 0.5;
  assert.equal(place.update(13), null, 'the listener a little nearer: not enough to matter');
  listener.z = 4;
  assert.equal(place.update(14), 4, 'nearer still: told');
  assert.equal(place.perceived, 4);
});

test('a place let go once past its time, never if kept; its time set by close(at); the rest followed, each told its change', () => {
  const listener = at(0, 0, 0);
  const places = new Places(listening(listener));
  const passing = places.add(placed(places.place(at(0, 0, 2), { until: 5 })));
  const kept = places.add(placed(places.place(at(0, 0, 4), { keep: true })));
  const open = places.add(placed(places.place(at(0, 0, 6))));
  assert.deepEqual(places.all, [passing, kept, open], "the live list, as they're added");
  places.update(5);
  assert.equal(places.all.length, 3, 'at its time: still there');
  open.place.close(5.5);
  listener.z = -3;
  places.update(6);
  assert.deepEqual(places.all, [kept], 'past their time: let go, but the one kept');
  assert.deepEqual([passing.lets, open.lets, kept.lets], [1, 1, 0], 'each told once');
  assert.deepEqual(kept.told, [7], 'the one left followed: told how far it is now');
  const list = places.all;
  places.update(7);
  assert.equal(places.all, list, 'the same array for as long as it runs');
});

test('shift() moves every place, and its moves still to come, with the world', () => {
  const places = new Places(listening(at(0, 0, 0)));
  const first = places.add(placed(places.place(at(1, 0, 2))));
  const second = places.add(placed(places.place(at(-3, 0, 0))));
  first.place.moveTo(at(5, 0, 5), 20);
  places.shift(at(64, 0, -64));
  assert.deepEqual([first.place.position, second.place.position], [at(65, 0, -62), at(61, 0, -64)]);
  places.update(20);
  assert.deepEqual(first.place.position, at(69, 0, -59), 'a place still to come with it');
});

test('a world that wraps round, as a torus does: the short way round, its distance, the whole worlds to the copy nearest a place', () => {
  const sizes = { x: 100, y: Infinity, z: 100 };
  const world = new WrapAround(() => sizes);
  assert.deepEqual(world.offset(at(10, 0, 0), at(95, 0, 0)), at(-15, 0, 0), 'off one edge, in at the other');
  assert.deepEqual(
    world.offset(at(0, 0, 0), at(0, 300, 40)),
    at(0, 300, 40),
    'no wrap up, and none within half a world',
  );
  assert.equal(world.distance(at(10, 0, 10), at(95, 0, 90)), Math.hypot(15, 0, 20));
  assert.deepEqual(
    world.toNearest(at(160, 0, -30), at(0, 0, 0)),
    at(-200, 0, 0),
    'two worlds back: at -40, nearer than 60',
  );
  assert.deepEqual(world.toNearest(at(40, 7, 20), at(0, 0, 0)), at(0, 0, 0), 'nearest already');
  sizes.x = Infinity;
  assert.deepEqual(world.offset(at(10, 0, 0), at(95, 0, 0)), at(85, 0, 0), 'its sizes read live: no wrap now');
});
