// The live mix's mute and solo (mockup/src/libs/build/desk/mix.ts), the desk's own, set by a strip's mute and solo
// controllers, on the desk on a stand-in for what's built (test/built.js) and the desk library's small studio:
//   - a mute: its channel cut, gliding, once the desk is built; let go, back;
//   - a mute taking along the strips its setup says;
//   - a solo keeping what a soloed strip needs to be heard, never an FX bus;
//   - a track's channel cut as it's added.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Desk } from '../index.ts';
import { deskOn } from './built.js';
import { planned } from '../../../plan/desk/test/desks.js';
import { MUTE_GLIDE } from '../../../plan/desk/index.ts';

const PLAN = planned();

// a strip's mute or solo controller, now
const switched = (name, on) => ({ type: 'controller', controller: name, value: on ? 1 : 0, t: 0 });
// each channel's cut as it was set, by its name
const cuts = (built) =>
  built.told
    .filter(([address]) => address.endsWith('/cut/gain'))
    .map(([address, value]) => [address.slice(0, -9), value]);

test('a mute: its channel cut, gliding, once the desk is built; let go, back', () => {
  const { desk, built, build } = deskOn(Desk, PLAN);
  desk.control('tap', switched('mute', true));
  assert.deepEqual(desk.mixState(), { muted: new Set(['tap']), soloed: new Set() });
  build();
  assert.deepEqual(built.told, [['tap/cut/gain', 0, { glide: MUTE_GLIDE }]], 'applied as it is built');
  desk.control('tap', switched('mute', false));
  assert.deepEqual(cuts(built).at(-1), ['tap', 1]);
  assert.deepEqual(desk.mixState(), { muted: new Set(), soloed: new Set() });
});

test("a bus muted taking along what feeds it, a track's channel among them as it's added", () => {
  const { desk, built, build } = deskOn(Desk, PLAN);
  build();
  desk.control('you', switched('mute', true));
  assert.deepEqual(cuts(built), [
    ['you', 0],
    ['tap', 0],
  ]);
  desk.inputOf('my tap/3');
  assert.deepEqual(cuts(built).at(-1), ['my tap/3', 0]);
});

test('a solo keeping what a soloed strip needs to be heard, its way out; never an FX bus', () => {
  const { desk, built, build } = deskOn(Desk, PLAN);
  build();
  desk.control('tap', switched('solo', true));
  assert.deepEqual(cuts(built), [['sings', 0]]);
});

test("a track's channel cut as it's added, its pool's copy", () => {
  const { desk, built, build } = deskOn(Desk, PLAN);
  desk.control('my tap/3', switched('mute', true));
  build();
  assert.deepEqual(cuts(built), [], 'not added yet');
  desk.inputOf('my tap/3');
  assert.deepEqual(cuts(built), [['my tap/3', 0]]);
});
