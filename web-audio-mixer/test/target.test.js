// A change set on a built strip by its key (mockup/src/libs/web-audio-mixer/target.ts, U2c4b1a, DRY9c): where its key lands, and a
// value set there now, at a time or gliding; when a change lands. On the engine and its stand-in for Web Audio, as build.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineOn } from '../../web-audio-engine/test/audio-stand-in.js';
import { DEVICES } from '../../web-audio-fx/index.ts';
import { SEND, routingOf } from '../../desk-plan/index.ts';
import { Mixer, buildChannel, buildFxChannel, setOn, timingOf } from '../index.ts';

let time = 0;

test("a change set on a built strip by its key, by a timing: its volume and its pan, a send, a slot's param at its device's port; none for a mute, a send to no return, a port its device lacks", () => {
  const { track, reverb } = desk();
  const slots = (slot) =>
    slot === 'utility' ? { chain: track.chains.utility, ports: DEVICES.utility.ports } : undefined;
  const set = (key, value, timing) => setOn(track.strip, { strip: 'track', ...key }, value, timing, slots);
  time = 12;
  assert.equal(set({ param: 'volume' }, 0.5, 'now'), true);
  assert.deepEqual(track.strip.fader.gain.events.at(-1), ['value', 0.5], 'its volume, its fader, now');
  set({ param: 'pan' }, 0.25, { at: 13 });
  assert.deepEqual(track.strip.panStage.input.pan.events.at(-1), ['set', 0.25, 13], 'its pan, at its time');
  set({ slot: SEND, param: 'reverb' }, 0.75, { glide: 0.1, from: 13 });
  assert.deepEqual(
    track.strip.sends.reverb.gain.events.at(-1),
    ['target', 0.75, 13, 0.1],
    'a send, gliding from its time',
  );
  set({ slot: 'utility', param: 'level' }, 0.4, 'now');
  assert.deepEqual(track.chains.utility.paramOf('gain.gain').events.at(-1), ['value', 0.4], "a slot's, at its port");
  assert.deepEqual(
    [
      set({ param: 'mute' }, 1, 'now'),
      set({ slot: SEND, param: 'nowhere' }, 1, 'now'),
      set({ slot: 'utility', param: 'width' }, 1, 'now'),
    ],
    [false, false, false],
  );
  assert.equal(
    setOn(reverb.strip, { strip: 'reverb', param: 'volume' }, 0.3, 'now', () => undefined),
    true,
  );
  assert.deepEqual(reverb.strip.level.gain.events.at(-1), ['value', 0.3], "an FX channel's volume, its level");
});

test("when a change lands: gliding by its time constant, from its time where that's to come, else from now; at its time on the audio's clock; else now", () => {
  const clocks = { now: 10, at: (t) => t + 100 }; // the audio's clock 100 s on
  assert.equal(timingOf({ t: 10, value: 1 }, clocks), 'now');
  assert.equal(timingOf({ t: 9, value: 1 }, clocks), 'now', 'its time passed');
  assert.deepEqual(timingOf({ t: 11, value: 1 }, clocks), { at: 111 });
  assert.deepEqual(timingOf({ t: 11, value: 1, glide: 0.05 }, clocks), { glide: 0.05, from: 111 });
  assert.deepEqual(timingOf({ t: 10, value: 1, glide: 0.05 }, clocks), { glide: 0.05 });
});

// a desk of a reverb and a track sending to it, through a Utility
function desk() {
  time = 10;
  const data = [{ fx: 'reverb' }, { bus: 'sings' }];
  const engine = engineOn(() => time);
  const mixer = new Mixer(engine, { routing: routingOf(data) });
  const on = { mixer, engine, beat: 60 / 72, devices: DEVICES };
  const reverb = buildFxChannel(on, 'reverb', data[0]);
  buildChannel(on, 'sings', data[1], {}, 'bus');
  const entry = { inserts: [{ slot: 'utility', device: 'utility' }], sends: ['reverb'], out: 'sings' };
  const track = buildChannel(on, 'track', entry, { pan: 0, amounts: { reverb: 0.3 } });
  return { track, reverb };
}
