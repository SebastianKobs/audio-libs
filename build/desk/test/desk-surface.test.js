// The desk's own control surface, a strip's control moved by hand (mockup/src/libs/build/desk/desk-surface.ts), on the desk on a stand-in for what's built
// (test/built.js) and the desk library's small studio, played into an input of the test's own:
//   - played in as a controller on the strip's track, now, with the stream's label its owner hands in, none for a
//     strip of the desk's own;
//   - gliding there where the desk says, a switch at once;
//   - each move told to whoever listens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Desk, DeskSurface } from '../index.ts';
import { deskOn } from './built.js';
import { planned } from '../../../plan/desk/test/desks.js';
import { SMOOTHING } from '../../../automation/index.ts';

function surfaceOn() {
  const { desk, clock } = deskOn(Desk, planned());
  clock.time = 3;
  const sent = [];
  const input = { send: (to, messages) => sent.push([to, messages]) };
  const label = (strip) => (strip === 'my tap/3' ? { kind: 'tap', track: 3 } : undefined);
  return { surface: new DeskSurface({ desk, clock, input, label }), sent };
}

test("played in as a controller on the strip's track, now, with its label, gliding where the desk says; a switch at once", () => {
  const { surface, sent } = surfaceOn();
  surface.control('my tap/3', 'volume', 0.5);
  surface.control('tap', 'mute', 1);
  assert.deepEqual(sent, [
    [
      { track: 'my tap/3', play: { kind: 'tap', track: 3 } },
      [{ type: 'controller', controller: 'volume', value: 0.5, t: 3, glide: SMOOTHING }],
    ],
    [{ track: 'tap', play: undefined }, [{ type: 'controller', controller: 'mute', value: 1, t: 3 }]],
  ]);
});

test('each move told to whoever listens, its strip and its controller', () => {
  const { surface } = surfaceOn();
  const told = [];
  surface.onControl((strip, controller) => told.push([strip, controller]));
  surface.control('tap', 'volume', 0.5);
  assert.deepEqual(told, [['tap', 'volume']]);
});
