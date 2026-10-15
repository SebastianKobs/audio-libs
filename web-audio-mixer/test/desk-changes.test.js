// Changes to a desk's params by their keys (mockup/src/libs/web-audio-mixer/desk-changes.ts, U2c5c2, DRY9c): checked as they come, a
// key the desk's strip can't have thrown; set by the key's shape: a strip's own and its sends to a live mix, mute and solo to its
// switches, a slot's param to its device among the device params; one that can glide set at once by its timing, on time; a switch and a
// param with no port held until their time. On a live mix and a clock of the test's own
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeviceParams, DEVICES } from '../../web-audio-fx/index.ts';
import { DeskChanges } from '../index.ts';

const DESK = [{ fx: 'reverb' }, { bus: 'you', sends: ['reverb'] }];

// changes on a desk of a reverb and your bus, the reverb's Utility among the device params; what the live mix is told; a clock at 10
function changesOf() {
  const told = [];
  const mix = {
    set: (key, value, timing) => told.push(['set', key.strip, key.param, value, timing]),
    setMute: (strip, on) => told.push(['mute', strip, on]),
    setSolo: (strip, on) => told.push(['solo', strip, on]),
  };
  const params = new DeviceParams({ beat: () => 0.5 });
  params.add('reverb/utility', { start: { level: 0.6, pan: 0 }, ports: DEVICES.utility.ports });
  params.add('reverb/air', { start: { q: 0.707, cutoff: 2000 }, ports: DEVICES.filter.ports });
  const ticks = [];
  const clock = { time: 10, now: () => clock.time, onTick: (listener) => ticks.push(listener) };
  const tick = (t) => {
    clock.time = t;
    for (const listener of ticks) {
      listener(t);
    }
  };
  const changes = new DeskChanges({ desk: DESK, mix, params, clock, at: (t) => t + 100, lead: 0.1 }); // the audio's clock 100 s on
  return { changes, told, params, tick };
}

test("a change by its key's shape: a strip's own and a send to the live mix, mute and solo to its switches, a slot's param to its device", () => {
  const { changes, told, params } = changesOf();
  changes.change({ key: { strip: 'you', param: 'volume' }, value: 0.5, t: 10 });
  changes.change({ key: { strip: 'you', slot: 'send', param: 'reverb' }, value: 0.3, t: 10, glide: 0.05 });
  changes.change({ key: { strip: 'you', param: 'mute' }, value: 1, t: 10 });
  changes.change({ key: { strip: 'master', param: 'solo' }, value: 0, t: 10 });
  changes.change({ key: { strip: 'reverb', slot: 'utility', param: 'level' }, value: 0.4, t: 10 });
  assert.deepEqual(told, [
    ['set', 'you', 'volume', 0.5, 'now'],
    ['set', 'you', 'reverb', 0.3, { glide: 0.05 }],
    ['mute', 'you', true],
    ['solo', 'master', false],
  ]);
  assert.equal(params.current('reverb/utility').level, 0.4, 'its device, among the device params');
});

test("a change for later: one that can glide set its lead ahead, at its time on the audio's clock or gliding from it; a switch, and a param that plans its device again, held until their time", () => {
  const { changes, told, params, tick } = changesOf();
  changes.change({ key: { strip: 'you', param: 'pan' }, value: -0.5, t: 10.05 });
  changes.change({ key: { strip: 'you', param: 'volume' }, value: 0.4, t: 11, glide: 0.05 });
  assert.deepEqual(told, [['set', 'you', 'pan', -0.5, { at: 110.05 }]], 'within its lead: at once, at its time');
  tick(10.95);
  assert.deepEqual(
    told.at(-1),
    ['set', 'you', 'volume', 0.4, { glide: 0.05, from: 111 }],
    'its lead ahead, gliding from its time',
  );
  changes.change({ key: { strip: 'reverb', slot: 'utility', param: 'level' }, value: 0.2, t: 11 });
  assert.equal(params.current('reverb/utility').level, 0.2, 'a param at its port: its lead ahead');
  changes.change({ key: { strip: 'you', param: 'mute' }, value: 1, t: 11 });
  changes.change({ key: { strip: 'reverb', slot: 'air', param: 'q' }, value: 3, t: 11 });
  assert.deepEqual([told.length, params.current('reverb/air').q], [2, 0.707], 'a switch and a param with no port held');
  tick(11);
  assert.deepEqual([told.at(-1), params.current('reverb/air').q], [['mute', 'you', true], 3], 'as their time comes');
});

test("checked as it comes: a key the desk's strip can't have thrown, the master's pan or a send, a send to what's no return, a slot with no device, a param no strip has", () => {
  const { changes } = changesOf();
  const at = (key) => () => changes.change({ key, value: 1, t: 10 });
  assert.throws(at({ strip: 'master', param: 'pan' }), /no controller pan on strip master/);
  assert.throws(at({ strip: 'master', slot: 'send', param: 'reverb' }), /no controller send\/reverb on strip master/);
  assert.throws(at({ strip: 'you', slot: 'send', param: 'sings' }), /no controller send\/sings on strip you/);
  assert.throws(at({ strip: 'you', slot: 'air', param: 'cutoff' }), /no controller air\/cutoff on strip you/);
  assert.throws(at({ strip: 'you', param: 'width' }), /no controller width on strip you/);
});
