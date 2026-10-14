// A note's own stages' unit tests (mockup/src/libs/web-audio-synth/note-stages.ts, its test/ folder; G0b, mockup/architecture/done.md; the
// space's until V3, out of mockup/test/unit/space.test.js), on the engine's stand-in for Web Audio: its pan pot, its air, its dry gain and
// its room's, each set by a per-note controller as it starts and glided to by one that comes later; let go
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextOn, into, outOf } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { NoteStages } from '../index.ts';

let time = 0;
const Context = contextOn(() => time);
// every stage a note can have: an instrument answering them all, your playing's (V3)
const EVERY_STAGE = ['brightness', 'volume', 'pan', 'effects 1 depth'];
// an engine on the stand-in, its time 10
function setup() {
  time = 10;
  const engine = new Engine({ AudioContext: Context });
  return { engine, ac: engine.audioContext };
}

// a note's own stages (G0b, mockup/architecture/done.md): a spot's modules and its voice's pan, set by the note's per-note controllers, not
// by an emitter of their own: the garden's emitter sends what it sets as them
test("a note's own stages: its pan pot at #10 Pan, then a lowpass at #74 Brightness, a dry gain at #7 Volume into where it goes, a room gain at #91 Effects 1 Depth into the room; a voice plays into its pan", () => {
  const { ac, engine } = setup();
  const out = ac.createGain();
  const room = ac.createGain();
  const heard = { pan: 0.3, brightness: 5000, volume: 0.5, 'effects 1 depth': 0.2 };
  const n = new NoteStages(engine, { into: out, room, heard, answers: EVERY_STAGE });
  assert.equal(n.input.kind, 'panner');
  assert.deepEqual(n.input.pan.events, [['value', 0.3]], 'its pan as it starts, as a voice was panned (place())');
  const [air] = outOf(ac, n.input);
  assert.deepEqual([air.kind, air.type], ['biquad', 'lowpass']);
  assert.deepEqual(air.frequency.events, [
    ['value', 24000],
    ['value', 5000],
  ]);
  const [dry] = into(ac, out);
  assert.deepEqual(dry.gain.events, [
    ['value', 1],
    ['value', 0.5],
  ]);
  const [roomGain] = into(ac, room);
  assert.deepEqual(roomGain.gain.events, [
    ['value', 1],
    ['value', 0.2],
  ]);
  assert.deepEqual(into(ac, dry), [air]);
  assert.deepEqual(into(ac, roomGain), [air]);
});

test("a note's own stages glide to each per-note controller that comes later, as an emitter glided a spot's; let go, each one's way out disconnected, its pan's too (G0c3)", () => {
  const { ac, engine } = setup();
  const out = ac.createGain();
  const room = ac.createGain();
  const n = new NoteStages(engine, {
    into: out,
    room,
    heard: { pan: 0, brightness: 5000, volume: 0.5, 'effects 1 depth': 0.2 },
    answers: EVERY_STAGE,
  });
  const [air] = outOf(ac, n.input);
  const [dry] = into(ac, out);
  const [roomGain] = into(ac, room);
  time = 11;
  n.glide('volume', 0.25, 0.08);
  n.glide('brightness', 2500, 0.08);
  n.glide('effects 1 depth', 0.3, 0.08);
  assert.deepEqual(dry.gain.events.at(-1), ['target', 0.25, 11, 0.08]);
  assert.deepEqual(air.frequency.events.at(-1), ['target', 2500, 11, 0.08]);
  assert.deepEqual(roomGain.gain.events.at(-1), ['target', 0.3, 11, 0.08]);
  n.letGo();
  assert.deepEqual(ac.rec.disconnects, [n.input, air, dry, roomGain]);
});

test("a note sent with no #10 Pan has no place: it isn't panned, it plays into its air, as a sound with no place plays unpanned", () => {
  const { ac, engine } = setup();
  const out = ac.createGain();
  const n = new NoteStages(engine, { into: out, heard: { brightness: 5000, volume: 0.5 }, answers: EVERY_STAGE });
  assert.deepEqual([n.input.kind, n.input.type], ['biquad', 'lowpass']);
  assert.ok(!ac.rec.nodes.some((node) => node.kind === 'panner'), 'no pan pot built');
});

test("a note's stages built only for the per-note controllers its instrument answers: #7 Volume alone a dry gain into where it goes, no air, no room, no pan (V3)", () => {
  const { ac, engine } = setup();
  const out = ac.createGain();
  const room = ac.createGain();
  const n = new NoteStages(engine, { into: out, room, heard: { pan: 0.3 }, answers: ['volume'] });
  assert.deepEqual([n.input.kind, into(ac, out)], ['gain', [n.input]], 'a voice plays into its dry gain');
  assert.deepEqual(into(ac, room), [], 'no room');
  assert.ok(!ac.rec.nodes.some((node) => node.kind === 'panner' || node.kind === 'biquad'), 'no pan pot, no air');
  n.glide('brightness', 900, 0.08);
  n.glide('volume', 0, 0.25, 10.5);
  assert.deepEqual(
    n.input.gain.events,
    [
      ['value', 1],
      ['target', 0, 10.5, 0.25],
    ],
    'a change gliding from its time to come; one it has no stage for left alone',
  );
});
