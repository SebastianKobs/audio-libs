// The live mix's mute and solo (libs/modular-audio/build/desk/mixing/mix.ts), the mixing desk's own, set by its mute() and
// solo(), on the mixing desk on a stand-in for what's built (test/built.js) and the desk library's small studio:
//   - a mute: its channel cut, gliding, once the desk is built; let go, back;
//   - a mute taking along the strips its setup says, a bus's with what feeds it;
//   - a solo keeping what a soloed strip needs to be heard, never an FX bus;
//   - a track's channel cut as it's added, muted itself or through its bus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MixingDesk } from '../index.ts';
import { deskOn } from './built.js';
import { planned } from '../../../../plan/desk/test/desks.js';
import { MUTE_GLIDE } from '../../../../plan/desk/index.ts';

const PLAN = planned();

// each channel's cut as it was set, by its name
const cuts = (built) =>
  built.told
    .filter(([address]) => address.endsWith('/cut/gain'))
    .map(([address, value]) => [address.slice(0, -9), value]);

test('a mute: its channel cut, gliding, once the desk is built; let go, back', () => {
  const { desk, built, build } = deskOn(MixingDesk, PLAN);
  desk.mute('tap', true);
  assert.deepEqual(desk.mixState(), { muted: new Set(['tap']), soloed: new Set() });
  build();
  assert.deepEqual(built.told, [['tap/cut/gain', 0, { glide: MUTE_GLIDE }]], 'applied as it is built');
  desk.mute('tap', false);
  assert.deepEqual(cuts(built).at(-1), ['tap', 1]);
  assert.deepEqual(desk.mixState(), { muted: new Set(), soloed: new Set() });
});

test('a solo keeping what a soloed strip needs to be heard, its way out; never an FX bus', () => {
  const { desk, built, build } = deskOn(MixingDesk, PLAN);
  build();
  desk.solo('tap', true);
  assert.deepEqual(cuts(built), [['sings', 0]]);
});

test("a track's channel cut as it's added, muted itself or through its bus", () => {
  const own = deskOn(MixingDesk, PLAN);
  own.desk.mute('my tap/3', true);
  own.build();
  assert.deepEqual(cuts(own.built), [], 'not added yet');
  own.desk.channelOf('my tap/3');
  assert.deepEqual(cuts(own.built), [['my tap/3', 0]]);
  const bus = deskOn(MixingDesk, PLAN);
  bus.build();
  bus.desk.mute('you', true);
  assert.deepEqual(cuts(bus.built), [
    ['you', 0],
    ['tap', 0],
  ]);
  bus.desk.channelOf('my tap/3');
  assert.deepEqual(cuts(bus.built).at(-1), ['my tap/3', 0]);
});
