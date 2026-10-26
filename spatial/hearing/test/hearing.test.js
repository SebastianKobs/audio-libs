// The hearing (mockup/src/libs/spatial/hearing/), through its space, with a listener of the test's own:
//   - the model against its test vectors (shared/test-vectors/space/hearing.json);
//   - an emitter: what it hears handed on as values, from a note's time, as the listener moves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { heardAs, nothing, onFloor, r10, setup } from './listening.js';

const vectors = JSON.parse(
  readFileSync(new URL('../../../../../../shared/test-vectors/space/hearing.json', import.meta.url), 'utf8'),
);
// what an emitter hears, as the test sees it handed on: each value by its name, and when
const heardSeen = () => {
  const calls = [];
  return { calls, hears: (name, value, when) => calls.push([name, value, when]) };
};
// a follower, as the test sees it: each value handed on, and when
const followerSeen = () => {
  const calls = [];
  return { calls, follower: (value, when) => calls.push([value, when]) };
};

test('the model through the space: level, cutoff and room at every distance as the vectors have them, for the defaults and with each setting moved; its settings read live', () => {
  assert.equal(vectors.format, 1);
  for (const vectorCase of vectors.cases) {
    const { space } = setup({ ...vectorCase.settings, limit: vectorCase.settings.limit ?? Infinity });
    assert.equal(r10(space.hearMax()), vectorCase.hearMax, JSON.stringify(vectorCase.settings));
    heardAs(vectorCase, (distance) => space.hearing(distance));
  }
  const { space, hearingSettings: live } = setup();
  assert.equal(space.hearMax(), 40);
  assert.equal(space.hearing(20).level, 0.4, '6 dB down at 16 units, a doubling of the range');
  live.range = 16;
  assert.equal(space.hearing(16).level, 1, 'read live');
});

// a change is worth handing on once the level or room is 0.002 off, or the cutoff 1%: a listener who moves a little
// changes what an emitter hears too little for that, one who moves more changes it enough
test("an emitter hands on a change in what it hears only once it's worth it: the listener moved a little, nothing; moved more, a glide", () => {
  const { at, space } = setup();
  const seen = heardSeen();
  space.emitter(onFloor(0, 20), { hears: seen.hears, keep: true });
  const asMade = seen.calls.length;
  at.z = 0.05;
  space.update(1);
  assert.equal(seen.calls.length, asMade, 'a little nearer: nothing handed on');
  at.z = 1;
  space.update(2);
  const nearer = space.hearing(19);
  assert.deepEqual(
    seen.calls.slice(asMade),
    [
      ['cutoff', nearer.cutoff, { glide: 0.08 }],
      ['level', nearer.level, { glide: 0.08 }],
      ['room', nearer.room, { glide: 0.08 }],
    ],
    'a unit nearer: handed on, gliding',
  );
});

// what an emitter hears, handed on as values: a track's strip maps them to its controllers
test("an emitter hands on what it hears as it's made, now: its cutoff, level and side, then its room; at a note's time, from its place", () => {
  const { space } = setup();
  const seen = heardSeen();
  const e = space.emitter(onFloor(12, 16), { hears: seen.hears, keep: true });
  const at20 = space.hearing(20);
  assert.deepEqual(
    seen.calls,
    [
      ['cutoff', at20.cutoff, {}],
      ['level', at20.level, {}],
      ['side', 0.6, {}],
      ['room', at20.room, {}],
    ],
    'now, where it is: 20 units off, panned 12 units right, the width',
  );
  e.moveTo(onFloor(0, 8), 12);
  const h = space.hearing(8);
  assert.deepEqual(
    seen.calls.slice(4),
    [
      ['cutoff', h.cutoff, { at: 12 }],
      ['level', h.level, { at: 12 }],
      ['side', 0, { at: 12 }],
      ['room', h.room, { at: 12 }],
    ],
    "a note's place, from its time, the caller's",
  );
});

// a value that follows where its note is heard (follow()), a track's delay send: by its own law, on each note at its time, and as you move
test('an emitter hands on each value it follows, by its law: on a note at its time, gliding as you move; let go, 0 and left', () => {
  const { at, space } = setup();
  const delay = followerSeen();
  const law = (heard) => 0.5 * heard.level;
  const e = space.emitter(onFloor(0, 4), { hears: nothing, keep: true });
  e.follow(delay.follower, law, 10);
  assert.deepEqual(delay.calls, [[0.5, { at: 10 }]], "from its time on, as it's heard now");
  e.moveTo(onFloor(0, 32), 12);
  assert.deepEqual(delay.calls.at(-1), [law(space.hearing(32)), { at: 12 }], "a note's place, at its time");
  space.update(12.5);
  Object.assign(at, { x: 0, z: 16 });
  space.update(13); // you move 16 units nearer
  assert.deepEqual(delay.calls.at(-1), [law(space.hearing(16)), { glide: 0.08 }], 'as you move, a glide');
  e.follow(delay.follower, null, 14);
  assert.deepEqual(delay.calls.at(-1), [0, { at: 14 }], 'let go: 0');
  e.moveTo(onFloor(0, 8), 15);
  assert.deepEqual(delay.calls.at(-1), [0, { at: 14 }], 'and left');
});

// a place's side, how far a sound from there is panned
test("a place's side: the listener's side times the width, at most the width; shift() moves every emitter with the world", () => {
  const { space, hearingSettings } = setup();
  assert.equal(space.side(onFloor(5, 0)), 0.3);
  assert.equal(space.side(onFloor(-30, 0)), -0.6, 'at most the width');
  hearingSettings.width = 0;
  assert.equal(space.side(onFloor(5, 0)), 0, 'the width read live');
  const e = space.emitter(onFloor(1, 2), { hears: nothing });
  const f = space.emitter(onFloor(-3, 0), { hears: nothing });
  space.shift(onFloor(64, -64));
  assert.deepEqual([e.position.x, e.position.z, f.position.x, f.position.z], [65, -62, 61, -64]);
});

// a replay track's distance: one emitter kept for the track, moved to each note's place as it
// sounds, panned from the note's side, following the listener in between; never let go, its until the play's, so a quiet corner hears it
// only while it plays
test("a kept emitter, a track's: moved to each note's place at its time; following you in between, its side where its note put it; never let go", () => {
  const { at, space } = setup();
  const seen = heardSeen();
  const lets = [];
  const e = space.emitter(onFloor(12, 16), { hears: seen.hears, keep: true, onLetGo: () => lets.push('let go') });
  const was = space.hearing(20);
  e.moveTo(onFloor(0, 8), 12, onFloor(-5, 8)); // a note at 12 s, 8 units off, panned from 5 units left
  const h = space.hearing(8);
  assert.deepEqual(
    seen.calls.slice(4),
    [
      ['cutoff', h.cutoff, { at: 12 }],
      ['level', h.level, { at: 12 }],
      ['side', -0.3, { at: 12 }],
      ['room', h.room, { at: 12 }],
    ],
    'its new place heard from its note on',
  );
  space.update(11);
  assert.deepEqual([e.position.x, e.position.z, e.heard], [12, 16, was], 'before the note: where it was');
  space.update(12.5);
  assert.deepEqual([e.position.x, e.position.z, e.heard], [0, 8, h], 'from it: where the note is');
  assert.equal(seen.calls.length, 8, 'nothing more handed on: the place was set ahead');
  Object.assign(at, { x: 0, z: -20 });
  space.update(13); // 28 units off
  const far = space.hearing(28);
  assert.deepEqual(
    seen.calls.slice(8),
    [
      ['cutoff', far.cutoff, { glide: 0.08 }],
      ['level', far.level, { glide: 0.08 }],
      ['room', far.room, { glide: 0.08 }],
    ],
    'and follows you as you move, its side where its note put it',
  );
  e.close(14);
  space.update(15);
  assert.deepEqual(space.emitters, [e], 'kept past its until');
  assert.deepEqual(lets, [], 'never let go');
  e.moveTo(onFloor(5, 5), 20);
  space.shift(onFloor(1, 1));
  space.update(20);
  assert.deepEqual([e.position.x, e.position.z], [6, 6], 'a place still to come moves with the world');
});

test('an emitter let go does what its caller asked, once', () => {
  const { space } = setup();
  const lets = [];
  space.emitter(onFloor(12, 16), { hears: nothing, until: 20, onLetGo: () => lets.push('let go') });
  space.update(20);
  assert.deepEqual(lets, []);
  space.update(20.01);
  space.update(20.02);
  assert.deepEqual(lets, ['let go']);
});
