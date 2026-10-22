// The desk's own control surface, a strip's control moved by hand (mockup/src/libs/modular-audio/build/desk/automation/desk-surface.ts), on the desk on a stand-in for what's built
// (libs/modular-audio/build/desk/mixing/test/built.js) and the desk library's small studio, played into an input of the test's own:
//   - played in as a controller on the strip's track, now, with the stream's label its owner hands in, none for a
//     strip of the desk's own;
//   - gliding there where the desk says, a switch at once;
//   - each move told to whoever listens;
//   - a desk's edit as the app's message: a param played in as a controller, a choice by its index; a setting, the
//     desk built again with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeskAutomation, DeskSurface } from '../index.ts';
import { MixingDesk } from '../../mixing/index.ts';
import { deskOn } from '../../mixing/test/built.js';
import { planned } from '../../../../plan/desk/test/desks.js';
import { SMOOTHING } from '../../../../../base/automation/index.ts';

function surfaceOn() {
  const on = deskOn(MixingDesk, planned());
  const { desk, clock } = on;
  const automation = new DeskAutomation({
    desk,
    setup: { isLive: () => false, setBy: () => undefined },
    clock,
    at: (t) => t,
  });
  clock.time = 3;
  const sent = [];
  const input = { send: (to, messages) => sent.push([to, messages]) };
  const label = (strip) => (strip === 'my tap/3' ? { kind: 'tap', track: 3 } : undefined);
  return { ...on, surface: new DeskSurface({ desk, automation, clock, input, label }), sent };
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

test("a desk's edit as the app's message: a param played in as a controller on its strip's track, a choice by its index; a setting, the desk built again with it", () => {
  const { surface, sent, desk, built, build } = surfaceOn();
  build();
  desk.inputOf('my tap/3');
  surface.edit({ type: 'desk edited', of: 'values', address: ['my tap', '3', 'send', 'reverb'], value: 0.4 });
  surface.edit({ type: 'desk edited', of: 'values', address: ['delay 1', 'delay', 'note'], value: '1/16' });
  assert.deepEqual(
    sent.map(([{ track }, [{ controller, value }]]) => [track, controller, value]),
    [
      ['my tap/3', 'send/reverb', 0.4],
      ['delay 1', 'delay/note', 1],
    ],
  );
  surface.edit({ type: 'desk edited', of: 'settings', address: ['reverb', 'reverb', 'length'], value: 2 });
  assert.deepEqual(built.presets, [[{}, { 'reverb/reverb/length': 2 }]]);
});
