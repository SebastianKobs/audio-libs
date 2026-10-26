// The desk's automation (libs/modular-audio/build/desk/automation/desk-automation.ts), fitted to a mixing desk on a
// stand-in for what's built (libs/modular-audio/build/desk/mixing/test/built.js), the desk library's small studio and a clock of the test's own:
//   - a controller as its param's address on the strip: a track's channel's where its notes set it, at its time, its
//     channel added as it comes; one they don't set, or a live track's, held for the desk;
//   - else held for the desk: one that glides set its lead ahead of its time, a choice and a delay line's time at its time, as its spec says;
//   - a strip's mute and solo the live mix's; one no strip has refused;
//   - whether a control glides there, as a knob's move is smoothed: not a switch, a choice, nor a delay line's time;
//   - which tracks are the desk's own strips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeskAutomation } from '../index.ts';
import { MixingDesk } from '../../mixing/index.ts';
import { deskOn } from '../../mixing/test/built.js';
import { planned } from '../../../../plan/desk/test/desks.js';
import { LOOKAHEAD } from '../../../../../sequencing/clock/index.ts';

const PLAN = planned();
// the setup's rules: a replay tower live; a track's air its notes'
const setup = {
  isLive: (track) => track === 'replay tower/1',
  setBy: (address) => (address.includes('air') ? 'distance' : undefined),
};
function controlsOn() {
  const on = deskOn(MixingDesk, PLAN, { setup });
  on.build();
  const { desk, clock } = on;
  return { ...on, automation: new DeskAutomation({ desk, setup, clock, at: (t) => t }) };
}
const controller = (name, value, t, glide) => ({
  type: 'controller',
  controller: name,
  value,
  t,
  ...(glide && { glide }),
});

test("else held for the desk: one that glides set its lead ahead of its time; a choice, and a delay line's time, at its time", () => {
  const { automation, built, clock } = controlsOn();
  automation.control('tap', controller('volume', 0.5, 5, 0.02));
  clock.tick(4.9 - LOOKAHEAD);
  assert.deepEqual(built.told, []);
  clock.tick(5 - LOOKAHEAD);
  assert.deepEqual(built.told, [['tap/volume', 0.5, { at: 5, glide: 0.02 }]]);
  automation.control('delay 1', controller('delay/note', 2, 6));
  automation.control('delay 1', controller('delay/ms', 300, 6));
  clock.tick(6 - LOOKAHEAD);
  assert.equal(built.told.length, 1, 'not ahead');
  clock.tick(6);
  assert.deepEqual(built.told.slice(1), [
    ['delay 1/delay/note', 2, {}],
    ['delay 1/delay/ms', 300, {}],
  ]);
});

test("a strip's mute and solo the live mix's; one no strip has refused; which tracks are the desk's own strips", () => {
  const { automation, desk } = controlsOn();
  automation.control('tap', controller('mute', 1, 0));
  automation.control('you', controller('solo', 1, 0));
  assert.deepEqual(desk.mixState(), { muted: new Set(['tap']), soloed: new Set(['you']) });
  assert.throws(() => automation.control('tap', controller('nowhere', 1, 0)), /no controller nowhere on strip tap/);
  assert.deepEqual([automation.isStripTrack('tap'), automation.isStripTrack('my tap/3')], [true, false]);
});

test("whether a control glides there, as a knob's move is smoothed: not a switch, a choice, nor a delay line's time, as its spec says; one no strip has glides, refused as it comes", () => {
  const { automation } = controlsOn();
  assert.deepEqual(
    [
      ['tap', 'volume'],
      ['tap', 'mute'],
      ['delay 1', 'delay/note'],
      ['delay 1', 'delay/ms'],
      ['delay 1', 'delay/feedback'],
      ['tap', 'nowhere'],
    ].map(([strip, name]) => automation.glides(strip, name)),
    [true, false, false, false, true, true],
  );
});

test("a change its notes set on its track's channel, at its time on what's built's clock, its channel added as it comes; one they don't set, or a live track's, held for the desk", () => {
  const { automation, built } = controlsOn();
  automation.control('my tap/4', controller('air/cutoff', 900, 2));
  assert.deepEqual(built.added, ['my tap/4']);
  assert.deepEqual(built.told.at(-1), ['my tap/4/air/cutoff', 900, { at: 2 }], 'at its time');
  automation.control('my tap/4', controller('utility/pan', 0.5, 2));
  assert.equal(built.told.length, 1, 'not its notes: held, not set at once');
  automation.control('replay tower/1', controller('air/cutoff', 400, 2));
  assert.equal(built.told.length, 1, 'a live track: held, its channel not added');
  assert.deepEqual(built.added, ['my tap/4']);
});
