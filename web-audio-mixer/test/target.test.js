// A parameter's target on a built strip (mockup/src/libs/web-audio-mixer/target.ts, U2c4b1a): where its key lands, a stage and its
// port, and a value set there now, at a time or gliding. On the engine and its stand-in for Web Audio, as build.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { UTILITY } from '../../web-audio-fx/index.ts';
import { SEND, routingOf } from '../../desk-plan/index.ts';
import { Mixer, buildChannel, buildFxChannel, setTarget, targetOf } from '../index.ts';

let time = 0;
class Context extends StandInContext {
  constructor() {
    super(() => time);
  }
}
const UTILITY_PORTS = { level: 'gain.gain', pan: 'pan.pan' };

test("a key's target on a built strip: its volume and its pan, a send built, a slot's chain at its device's port; none for a mute, a send not built, a port its device lacks", () => {
  const { track, reverb } = desk();
  const slots = (slot) => (slot === 'utility' ? { chain: track.chains.utility, ports: UTILITY_PORTS } : undefined);
  const on = (key) => targetOf(track.strip, { strip: 'track', ...key }, slots);
  assert.deepEqual(
    on({ param: 'volume' }),
    { stage: track.strip.volumeStage, port: 'gain.gain' },
    'its volume, its fader',
  );
  assert.deepEqual(on({ param: 'pan' }), { stage: track.strip.panStage, port: 'pan.pan' }, 'its pan');
  assert.deepEqual(
    on({ slot: SEND, param: 'reverb' }),
    { stage: track.strip.sendStages.reverb, port: 'gain.gain' },
    'a send',
  );
  assert.deepEqual(
    on({ slot: 'utility', param: 'level' }),
    { stage: track.chains.utility, port: 'gain.gain' },
    "a slot's",
  );
  assert.deepEqual(
    [on({ param: 'mute' }), on({ slot: SEND, param: 'delay' }), on({ slot: 'utility', param: 'width' })],
    [null, null, null],
  );
  const fx = targetOf(reverb.strip, { strip: 'reverb', param: 'volume' }, () => undefined);
  assert.deepEqual(fx, { stage: reverb.strip.volumeStage, port: 'gain.gain' }, "an FX channel's volume, its level");
});

test('a value set on its target now, at a time, or gliding', () => {
  const { track } = desk();
  const target = targetOf(track.strip, { strip: 'track', param: 'volume' }, () => undefined);
  const events = track.strip.fader.gain.events;
  time = 12;
  setTarget(target, 0.5, 'now');
  assert.deepEqual(events.at(-1), ['value', 0.5], 'now');
  setTarget(target, 0.25, { at: 13 });
  assert.deepEqual(events.at(-1), ['set', 0.25, 13], 'at its time');
  setTarget(target, 0.75, { glide: 0.1 });
  assert.deepEqual(events.at(-1).slice(0, 2), ['target', 0.75], 'gliding');
  assert.equal(events.at(-1)[3], 0.1, 'by its time constant');
});

// a desk of a reverb and a track sending to it, through a Utility
function desk() {
  time = 10;
  const data = [{ fx: 'reverb' }, { bus: 'sings' }];
  const engine = new Engine({ AudioContext: Context });
  const mixer = new Mixer(engine, { routing: routingOf(data) });
  const on = { mixer, engine, beat: 60 / 72, devices: { utility: UTILITY } };
  const reverb = buildFxChannel(on, 'reverb', data[0]);
  buildChannel(on, 'sings', data[1], {}, 'bus');
  const entry = { inserts: [{ slot: 'utility', device: 'utility' }], sends: ['reverb'], out: 'sings' };
  const track = buildChannel(on, 'track', entry, { pan: 0, amounts: { reverb: 0.3 } });
  return { track, reverb };
}
