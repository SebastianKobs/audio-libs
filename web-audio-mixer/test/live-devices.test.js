// A desk's slots as live devices (mockup/src/libs/web-audio-mixer/live-devices.ts, U2c5c2): every slot of its strips and its master a
// device among the device params, but those its owner's rules set, its start its device's module's params with the slot's own over them,
// its ports its device's; every FX channel's chain's module with params of its own one too, its params' specs its effect's
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEVICES, DeviceParams, LIMITER_SETTINGS } from '../../web-audio-fx/index.ts';
import { DELAY_TIME } from '../../synth/index.ts';
import { addLiveDevices } from '../index.ts';

const DESK = [
  {
    fx: 'reverb',
    chain: [{ effect: 'room' }],
    inserts: [{ slot: 'utility', device: 'utility', start: { level: 0.6 } }],
  },
  { fx: 'delay', chain: [{ effect: 'echo', params: { sync: 1, note: '1/8', ms: 417 } }] },
  {
    bus: 'circle',
    inserts: [
      { slot: 'dull', device: 'filter', start: { q: 0.5 } },
      { slot: 'far', device: 'utility' },
      { slot: 'utility', device: 'utility', start: { level: 0.55 } },
    ],
  },
];

test("every slot a live device, its start its module's params with the slot's own over them, but those its owner's rules set; the master's too; an FX chain's module with params of its own, its specs its effect's", () => {
  const params = new DeviceParams();
  addLiveDevices(params, {
    desk: DESK,
    master: { inserts: [{ slot: 'limiter', device: 'limiter' }] },
    devices: DEVICES,
    ruled: (strip) => (strip === 'circle' ? ['dull', 'far'] : []),
    effects: (effect) => (effect === 'echo' ? DELAY_TIME : undefined),
  });
  assert.deepEqual(params.start('reverb/utility'), { level: 0.6, pan: 0 }, "the Utility's own start over its module's");
  assert.deepEqual(params.start('circle/utility'), { level: 0.55, pan: 0 });
  assert.deepEqual(params.start('master/limiter'), { ...LIMITER_SETTINGS }, "the master's limiter, at its module's");
  assert.deepEqual(
    [params.has('circle/dull'), params.has('circle/far'), params.has('reverb/room')],
    [false, false, false],
    "a rule's slots, and a module with no params of its own: none",
  );
  assert.deepEqual(
    params.start('delay/echo'),
    { sync: 1, note: '1/8', ms: 417 },
    "an FX chain's module, its own params",
  );
  params.set('delay/echo', 'note', 7);
  assert.equal(params.current('delay/echo').note, '1/4', 'a note by its index, as its effect declares it');
  params.set('reverb/utility', 'level', 0.3);
  assert.equal(params.current('reverb/utility').level, 0.3, 'set by param');
});
