// A track's strip made from its template as its track is first played (mockup/src/libs/web-audio-mixer/track-strips.ts, U2c5b): made
// once, the first time it's asked for, from the template its owner hands over, at its values, as its owner knows it; a change set by its
// key through its target, now, at a time or gliding, where the track's notes set it; none for a track with no template. On the engine and
// its stand-in for Web Audio, as build.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { DEVICES } from '../../web-audio-fx/index.ts';
import { SEND, routingOf } from '../../desk-plan/index.ts';
import { Mixer, TrackStrips, buildChannel, buildFxChannel } from '../index.ts';

let time = 0;
class Context extends StandInContext {
  constructor() {
    super(() => time);
  }
}
// a track's template: the air and a Utility, a send to the reverb, into garden sings
const TEMPLATE = {
  inserts: [
    { slot: 'air', device: 'filter' },
    { slot: 'utility', device: 'utility' },
  ],
  sends: ['reverb'],
  out: 'sings',
};

test("a track's strip made once, the first time it's asked for, from its template at its values, as its owner knows it; none for a track with no template", () => {
  const { strips, made } = trackStrips();
  const replay = strips.stripOf('replay 1');
  assert.equal(strips.stripOf('replay 1'), replay, 'made once');
  assert.equal(strips.of('replay 1'), replay, 'and kept');
  assert.deepEqual(made, ['replay 1'], 'its owner told as it was made');
  assert.equal(replay.strip.fader.gain.value, 0.5, 'at its values');
  assert.deepEqual(Object.keys(replay.chains), ['air', 'utility'], "its slots' chains");
  assert.deepEqual([strips.stripOf('ambient'), strips.of('ambient')], [null, undefined], 'no template: none');
});

test("a change set by its key through its target, now, at a time or gliding, where the track's notes set it; one they don't, a slot it lacks, a track with no template: not set", () => {
  const { strips, engine } = trackStrips();
  time = 12;
  const at = (track, controller, value, t, glide) =>
    strips.control(track, {
      key: { strip: track, ...controller },
      value,
      t,
      ...(glide === undefined ? {} : { glide }),
    });
  assert.equal(at('replay 1', { slot: 'air', param: 'cutoff' }, 3000, 12), true);
  const replay = strips.of('replay 1');
  assert.deepEqual(replay.chains.air.paramOf('filter.frequency').events.at(-1), ['value', 3000], 'at its port, now');
  at('replay 1', { slot: 'utility', param: 'level' }, 0.4, 13);
  assert.deepEqual(
    replay.chains.utility.paramOf('gain.gain').events.at(-1),
    ['set', 0.4, engine.at(13)],
    'at its time on the audio',
  );
  at('replay 1', { slot: SEND, param: 'reverb' }, 0.3, 12, 0.08);
  assert.deepEqual(replay.strip.sendStages.reverb.input.gain.events.at(-1).slice(0, 2), ['target', 0.3], 'gliding');
  at('replay 1', { param: 'volume' }, 0.8, 12);
  assert.deepEqual(replay.strip.fader.gain.events.at(-1), ['value', 0.8], 'its volume');
  assert.deepEqual(
    [
      at('replay 1', { param: 'pan' }, 0.5, 12),
      at('replay 1', { slot: 'dull', param: 'cutoff' }, 900, 12),
      at('ambient', { param: 'volume' }, 1, 12),
    ],
    [false, false, false],
    "its pan its owner's, no dull slot, no template",
  );
  assert.equal(strips.of('replay 2'), undefined);
  at('replay 2', { slot: 'air', param: 'cutoff' }, 2000, 12);
  assert.ok(strips.of('replay 2'), 'made as its first change comes');
});

// track strips on a desk of a reverb and garden sings: a replay track's template at a fader of 0.5, its notes setting all but its
// pan, mute and solo; what its owner was told was made
function trackStrips() {
  time = 10;
  const data = [{ fx: 'reverb' }, { bus: 'sings' }];
  const engine = new Engine({ AudioContext: Context });
  const mixer = new Mixer(engine, { routing: routingOf(data) });
  const on = { mixer, engine, beat: 60 / 72, devices: DEVICES };
  buildFxChannel(on, 'reverb', data[0]);
  buildChannel(on, 'sings', data[1], {}, 'bus');
  const made = [];
  const strips = new TrackStrips({
    on: () => on,
    now: () => time,
    templateOf: (track) => (track.startsWith('replay ') ? { entry: TEMPLATE, values: { volume: 0.5 } } : null),
    made: (strip, chains, track) => {
      made.push(track);
      return { strip, chains };
    },
    setByNotes: ({ slot, param }) => slot !== undefined || !['pan', 'mute', 'solo'].includes(param),
  });
  return { strips, made, engine };
}
