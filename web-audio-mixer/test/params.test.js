// A strip's own parameters (mockup/src/libs/web-audio-mixer/params.ts, U2c4a), declared as a plugin declares its own: a name, a range
// and a taper, so a knob, a lane and a controller's CC each turn a position into a value the same way (libs/synth/taper.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionOf } from '../../params/index.ts';
import { SEND_PARAM, STRIP_PARAMS } from '../index.ts';

const near = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual}, not ${expected}`);

test("a strip's own parameters declared: its volume and each send gains by the fader law, unity two thirds up; its pan centred, in a line; its mute and its solo switches", () => {
  const { volume, pan, mute, solo } = STRIP_PARAMS;
  assert.deepEqual(
    [volume.name, pan.name, mute.name, solo.name, SEND_PARAM.name],
    ['volume', 'pan', 'mute', 'solo', 'send'],
  );
  assert.deepEqual([volume.taper, volume.dB, SEND_PARAM.taper, SEND_PARAM.dB], ['fader', true, 'fader', true]);
  near(positionOf(volume, 1), 2 / 3, 'its volume at unity');
  near(positionOf(SEND_PARAM, 1), 2 / 3, 'a send at unity');
  near(positionOf(pan, 0), 0.5, 'its pan centred');
  assert.deepEqual(
    [mute.range, solo.range],
    [
      [0, 1, 1],
      [0, 1, 1],
    ],
    'off or on',
  );
});
