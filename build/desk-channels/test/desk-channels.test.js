// The tracks' channels on a mixing desk (mockup/src/libs/build/desk-channels/desk-channels.ts), on the desk
// library's stand-in for what's built (libs/build/desk/test/built.js) and its small studio:
//   - a track's instrument's way into its channel, the channel added as its first note comes, once;
//   - a change its notes set on its channel at its time, its channel added as it comes; one they don't set, or a
//     live track's, not its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeskChannels } from '../index.ts';
import { MixingDesk } from '../../desk/index.ts';
import { clockAt, deskOn } from '../../desk/test/built.js';
import { planned } from '../../../plan/desk/test/desks.js';

const PLAN = planned();
// the setup's rules: a replay tower live; a track's air its notes'
const setup = {
  isLive: (track) => track === 'replay tower/1',
  setBy: (address) => (address.includes('air') ? 'distance' : undefined),
};
// a change to a param on a track's channel, by its address there, at a time
const change = (track, param, value, t) => ({ address: [...track.split('/'), ...param.split('/')], value, t });

function channelsOn() {
  const on = deskOn(MixingDesk, PLAN, { clock: clockAt(1) });
  on.build();
  return { ...on, channels: new DeskChannels({ desk: on.desk, clock: on.clock, at: (t) => t + 10, setup }) };
}

test("a track's instrument's way into its channel, the channel added as its first note comes, once; none for a track with no pool", () => {
  const { channels, built } = channelsOn();
  assert.deepEqual(channels.inputOf('my tap/3'), { into: 'into my tap/3/in' });
  assert.deepEqual(channels.inputOf('my tap/3'), { into: 'into my tap/3/in' });
  assert.deepEqual(built.added, ['my tap/3']);
  assert.equal(channels.inputOf('reverb'), null);
});

test("a change its notes set on its track's channel, at its time on what's built's clock, its channel added as it comes; one they don't set, or a live track's, not its own", () => {
  const { channels, built } = channelsOn();
  assert.equal(channels.control('my tap/4', change('my tap/4', 'air/cutoff', 900, 2)), true);
  assert.deepEqual(built.added, ['my tap/4']);
  assert.deepEqual(built.told.at(-1), ['my tap/4/air/cutoff', 900, { at: 12 }], 'at once, at its time');
  channels.inputOf('replay tower/1'); // a live track's channel, added by its instrument
  const told = built.told.length;
  assert.equal(channels.control('my tap/4', change('my tap/4', 'utility/pan', 0.5, 2)), false, 'not its notes');
  assert.equal(
    channels.control('replay tower/1', change('replay tower/1', 'air/cutoff', 400, 2)),
    false,
    'a live track',
  );
  assert.equal(built.told.length, told);
});
