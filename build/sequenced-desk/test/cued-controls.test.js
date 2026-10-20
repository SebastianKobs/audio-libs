// A strip's controls set on the desk (mockup/src/libs/build/sequenced-desk/cued-controls.ts), the desk's own, on the desk on a
// stand-in for what's built (libs/build/desk/test/built.js), the desk library's small studio and a clock of the test's own:
//   - a controller as its param's address on the strip: a track's channel's where its notes set it;
//   - else held for the desk: one that glides set its lead ahead of its time, a choice and a delay line's time at its time, as its spec says;
//   - a strip's mute and solo the live mix's; one no strip has refused;
//   - whether a control glides there, as a knob's move is smoothed: not a switch, a choice, nor a delay line's time;
//   - which tracks are the desk's own strips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SequencedDesk } from '../index.ts';
import { deskOn } from '../../desk/test/built.js';
import { planned } from '../../../plan/desk/test/desks.js';
import { LOOKAHEAD } from '../../../clock/index.ts';

const PLAN = planned();
function controlsOn() {
  const setup = { setBy: (address) => (address.includes('air') ? 'distance' : undefined) };
  const on = deskOn(SequencedDesk, PLAN, { setup });
  on.build();
  return on;
}
const controller = (name, value, t, glide) => ({
  type: 'controller',
  controller: name,
  value,
  t,
  ...(glide && { glide }),
});

test("a controller as its param's address on its strip: a track's channel's where its notes set it, at its time, not held", () => {
  const { desk, built } = controlsOn();
  desk.control('my tap/3', controller('air/cutoff', 500, 1));
  assert.deepEqual(built.told, [['my tap/3/air/cutoff', 500, { at: 1 }]]);
});

test("else held for the desk: one that glides set its lead ahead of its time; a choice, and a delay line's time, at its time", () => {
  const { desk, built, clock } = controlsOn();
  desk.control('tap', controller('volume', 0.5, 5, 0.02));
  clock.tick(4.9 - LOOKAHEAD);
  assert.deepEqual(built.told, []);
  clock.tick(5 - LOOKAHEAD);
  assert.deepEqual(built.told, [['tap/volume', 0.5, { at: 5, glide: 0.02 }]]);
  desk.control('delay 1', controller('delay/note', 2, 6));
  desk.control('delay 1', controller('delay/ms', 300, 6));
  clock.tick(6 - LOOKAHEAD);
  assert.equal(built.told.length, 1, 'not ahead');
  clock.tick(6);
  assert.deepEqual(built.told.slice(1), [
    ['delay 1/delay/note', 2, {}],
    ['delay 1/delay/ms', 300, {}],
  ]);
});

test("a strip's mute and solo the live mix's; one no strip has refused; which tracks are the desk's own strips", () => {
  const { desk } = controlsOn();
  desk.control('tap', controller('mute', 1, 0));
  desk.control('you', controller('solo', 1, 0));
  assert.deepEqual(desk.mixState(), { muted: new Set(['tap']), soloed: new Set(['you']) });
  assert.throws(() => desk.control('tap', controller('nowhere', 1, 0)), /no controller nowhere on strip tap/);
  assert.deepEqual([desk.isStripTrack('tap'), desk.isStripTrack('my tap/3')], [true, false]);
});

test("whether a control glides there, as a knob's move is smoothed: not a switch, a choice, nor a delay line's time, as its spec says; one no strip has glides, refused as it comes", () => {
  const { desk } = controlsOn();
  assert.deepEqual(
    [
      ['tap', 'volume'],
      ['tap', 'mute'],
      ['delay 1', 'delay/note'],
      ['delay 1', 'delay/ms'],
      ['delay 1', 'delay/feedback'],
      ['tap', 'nowhere'],
    ].map(([strip, name]) => desk.glides(strip, name)),
    [true, false, false, false, true, true],
  );
});
