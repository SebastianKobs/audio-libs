// The tracks' channels on the desk (mockup/src/libs/build/desk/track-channels.ts), the desk's own, on the desk on a
// stand-in for what's built (test/built.js) and the desk library's small studio:
//   - a track's instrument's way into its channel, the channel added as its first note comes, once;
//   - a controller its notes set on its channel at its time, its channel added as it comes; one they don't set, or a
//     live track's, held for the desk instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Desk } from '../index.ts';
import { clockAt, deskOn } from './built.js';
import { planned } from '../../../plan/desk/test/desks.js';

const PLAN = planned();
// the setup's rules: a replay tower live; a track's air its notes'
const setup = {
  isLive: (track) => track === 'replay tower/1',
  setBy: (address) => (address.includes('air') ? 'distance' : undefined),
};
const cutoff = (value, t) => ({ type: 'controller', controller: 'air/cutoff', value, t });

function channelsOn() {
  const on = deskOn(Desk, PLAN, { setup, clock: clockAt(1), at: (t) => t + 10 });
  on.build();
  return on;
}

test("a track's instrument's way into its channel, the channel added as its first note comes, once; none for a track with no pool", () => {
  const { desk, built } = channelsOn();
  assert.deepEqual(desk.inputOf('my tap/3'), { into: 'into my tap/3/in' });
  assert.deepEqual(desk.inputOf('my tap/3'), { into: 'into my tap/3/in' });
  assert.deepEqual(built.added, ['my tap/3']);
  assert.equal(desk.inputOf('reverb'), null);
});

test("a controller its notes set on its track's channel, at its time on what's built's clock, its channel added as it comes; one they don't set, or a live track's, held for the desk", () => {
  const { desk, built, clock } = channelsOn();
  desk.control('my tap/4', cutoff(900, 2));
  assert.deepEqual(built.added, ['my tap/4']);
  assert.deepEqual(built.told.at(-1), ['my tap/4/air/cutoff', 900, { at: 12 }], 'at once, at its time');
  desk.inputOf('replay tower/1'); // a live track's channel, added by its instrument
  const told = built.told.length;
  desk.control('my tap/4', { type: 'controller', controller: 'utility/pan', value: 0.5, t: 2 });
  desk.control('replay tower/1', cutoff(400, 2));
  assert.equal(built.told.length, told, 'held for the desk, not set at once');
  clock.tick(2);
  assert.deepEqual(
    built.told.slice(told).map(([address]) => address),
    ['my tap/4/utility/pan', 'replay tower/1/air/cutoff'],
  );
});
