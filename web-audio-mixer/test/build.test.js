// A desk built from data (mockup/src/libs/web-audio-mixer/build.ts and strip-data.ts, U2c3): a strip as data, its insert slots each a
// device out of a registry handed in, at its start or at the params its owner hands over, its sends and its way out; built on the mixer,
// and the desk's routing made from the same data. On the engine and its stand-in for Web Audio, as mixer.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineOn, into } from '../../web-audio-engine/test/audio-stand-in.js';
import { DEVICES } from '../../web-audio-fx/index.ts';
import { Mixer, buildChannel, buildFxChannel } from '../index.ts';
import { routingOf } from '../../desk-plan/index.ts';

let time = 0;
// a desk as data: a reverb, a delay sending to it into a bus, the bus into the master
const DESK = [
  { fx: 'reverb', chain: [{ effect: 'room' }], inserts: [{ slot: 'level', device: 'utility', start: { level: 0.6 } }] },
  { bus: 'sings' },
  { fx: 'delay', chain: [{ effect: 'echo' }], sends: ['reverb'], out: 'sings' },
];
// a track's strip into the bus, two slots: a send by name, one before its fader, one at its second slot's way in
const TRACK = {
  inserts: [
    { slot: 'air', device: 'filter', start: { cutoff: 2000 } },
    { slot: 'utility', device: 'utility', start: { level: 0.5 } },
  ],
  sends: ['reverb', { to: 'delay', from: 'pre' }, { to: 'reverb', from: 'utility' }],
  out: 'sings',
};

test("a strip from its data: each slot's device out of the registry, in order, at its start or at what its owner hands over; its volume, pan and way out", () => {
  const { on, ac } = desk();
  const { strip, chains } = buildChannel(on, 'track 1', TRACK, {
    volume: 0.8,
    pan: -0.5,
    params: { utility: () => ({ level: 0.25 }) },
  });
  assert.deepEqual(
    strip.inserts.map((insert) => insert.name),
    ['air', 'utility'],
  );
  assert.equal(chains.air.paramOf('filter.frequency').value, 2000, 'the air at its start');
  assert.equal(chains.utility.paramOf('gain.gain').value, 0.25, "the Utility at its owner's level");
  assert.deepEqual(into(ac, strip.inserts[1].input), [strip.inserts[0].output], 'the air into the Utility');
  assert.deepEqual(
    [strip.fader.gain.value, strip.pan.pan.value, on.mixer.routing.outOf('track 1')],
    [0.8, -0.5, 'sings'],
  );
});

test("a strip's sends from its data: by name after its fader and pan, at the amount handed over, 0 where none; before its fader; at a slot's way in", () => {
  const { on, ac } = desk();
  const { strip } = buildChannel(
    on,
    'track 2',
    { ...TRACK, sends: TRACK.sends.slice(0, 2) },
    { amounts: { reverb: 0.3 } },
  );
  assert.deepEqual([strip.sends.reverb.gain.value, strip.sends.delay.gain.value], [0.3, 0], 'at the amounts');
  assert.deepEqual(into(ac, strip.sends.reverb), [strip.tail], 'after its fader and pan');
  assert.deepEqual(into(ac, strip.sends.delay), [strip.inserts[1].output], 'before its fader, after its inserts');
  const { strip: tapped } = buildChannel(on, 'track 3', { ...TRACK, sends: [TRACK.sends[2]] });
  assert.deepEqual(into(ac, tapped.sends.reverb), [tapped.inserts[1].input], "at its Utility's way in");
});

test('an FX channel from its data: its slots after its chain, its sends by name at the amounts handed over, its way out', () => {
  const { on } = desk();
  const delay = on.mixer.strips.delay;
  assert.deepEqual(
    [delay.inserts, on.mixer.routing.outOf('delay'), on.mixer.routing.sentTo('delay')],
    [[], 'sings', ['reverb']],
  );
  const reverb = on.mixer.strips.reverb;
  assert.deepEqual(
    reverb.inserts.map((insert) => insert.name),
    ['level'],
  );
  assert.equal(on.built.reverb.chains.level.paramOf('gain.gain').value, 0.6, 'its Utility at its start');
});

// the desk built from its data on a mixer of its own: what a strip is built on, and each desk strip as built
function desk() {
  time = 10;
  const engine = engineOn(() => time);
  const mixer = new Mixer(engine, { routing: routingOf(DESK) });
  const on = { mixer, engine, beat: 60 / 72, devices: DEVICES, built: {} };
  for (const entry of DESK) {
    if (entry.fx) {
      on.built[entry.fx] = buildFxChannel(on, entry.fx, entry, { amounts: { reverb: 0.4 } });
      continue;
    }
    on.built[entry.bus] = buildChannel(on, entry.bus, entry, {}, 'bus');
  }
  return { on, ac: engine.audioContext };
}
