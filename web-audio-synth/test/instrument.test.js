// An instrument's unit tests (mockup/src/libs/web-audio-synth/instrument.ts, its test/ folder, V3), on the engine's stand-in for Web Audio:
// MIDI 2.0's messages in (libs/midi/), its patch's notes out of its output, where it was patched as it was made, held until their note
// off; the per-note controllers it answers, a stage each, its room out of a second output; #7 Volume, with no stage for it, on the
// voice's out; a later change at its time; its stages let go as its sender detaches a note,
// or once its voice has stopped; its knobs, the tempo and its draws handed in, read as each note starts; its patch from a bank, by name
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engineOn, into } from '../../web-audio-engine/test/audio-stand-in.js';
import { adsr } from '../../synth/index.ts';
import { Instrument, Patches } from '../index.ts';

let time = 10;
// a small voice: a triangle into a lowpass, its VCA moved by an envelope, let go over its release, a knob, a quarter unless it's turned;
// a held note gliding to a pitch by 0.05 s
const VOICE = {
  vca: { level: 0.2 },
  filter: { type: 'lowpass', freq: 800 },
  oscs: [{ wave: 'triangle', ratio: 1, level: 0.5 }],
  envelopes: [{ target: 'vca.gain', ...adsr({ attack: 0.1, decay: 0.1, sustain: 0.5, release: 'release' }) }],
  note: { glide: 0.05 },
  params: { release: '1/4' },
};
const noteOn = (index, pitch, t) => ({ type: 'note on', index, pitch, velocity: 1, t });
const noteOff = (index, t) => ({ type: 'note off', index, t });
const perNote = (index, controller, value, t, glide) => ({
  type: 'per-note controller',
  index,
  controller,
  value,
  t,
  glide,
});

// an engine on the stand-in, its time 10, a bank of the voice, and an instrument playing it, as the test makes it, its outputs patched
// into a desk's two gains, a channel's and a room's (V4)
function setup(more = {}) {
  time = 10;
  const engine = engineOn(() => time);
  const ac = engine.audioContext;
  const patches = new Patches({ patches: { voice: VOICE }, now: () => time });
  const out = ac.createGain();
  const room = ac.createGain();
  const instrument = new Instrument({
    engine,
    patches,
    patch: 'voice',
    beat: () => 0.8,
    into: out,
    effects: room,
    ...more,
  });
  return { ac, out, room, patches, instrument, nodes: () => ac.rec.nodes };
}
const oscillators = (nodes, wave = 'triangle') =>
  nodes.filter((node) => node.kind === 'oscillator' && node.props.type === wave);

test('an instrument: a note on played on its patch from its time, out of its output, held until its note off lets it go at its time, one sent with it too (V3)', () => {
  const { ac, out, room, instrument, nodes } = setup();
  instrument.receive([noteOn(0, 69, 11), noteOff(0, 12)]);
  instrument.receive([noteOn(1, 64, 11.5)]);
  const [first, second] = oscillators(nodes());
  assert.deepEqual([first.starts, second.starts], [[[11]], [[11.5]]], 'each from its time');
  assert.ok(
    first.stops.at(-1)[0] >= 12.2,
    'the first let go at its note off, after its release, a quarter note at a beat of 0.8 s',
  );
  assert.equal(second.stops.length, 0, 'the second held');
  instrument.receive([noteOff(1, 13)]);
  assert.ok(second.stops.at(-1)[0] >= 13.2, 'let go at its note off');
  assert.equal(into(ac, out).length, 2, 'both voices out of its output, where it was patched');
  assert.deepEqual(into(ac, room), [], 'nothing out of its second, answering no #91 Effects 1 Depth');
});

test("an instrument: a note's #3 Pitch changes sent with it its glides, planned into it, each at its time (V3)", () => {
  const { instrument, nodes } = setup();
  instrument.receive([noteOn(0, 69, 11), perNote(0, 'pitch', 81, 11.5)]);
  const [osc] = oscillators(nodes());
  assert.ok(
    osc.frequency.events.some(([kind, value, at]) => kind === 'target' && Math.abs(value - 880) < 0.01 && at === 11.5),
    `glided an octave up at 11.5: ${JSON.stringify(osc.frequency.events)}`,
  );
});

test('an instrument answering the per-note controllers a note is heard by: a stage each, its pan pot, its air, its dry gain into its output and its room gain into its second output; a later change gliding from its time; detached, its stages let go (V3)', () => {
  const { ac, out, room: roomOut, instrument } = setup({ answers: ['brightness', 'volume', 'pan', 'effects 1 depth'] });
  instrument.receive([
    noteOn(0, 69, 10),
    perNote(0, 'pan', -0.5, 10),
    perNote(0, 'brightness', 5000, 10),
    perNote(0, 'volume', 0.5, 10),
    perNote(0, 'effects 1 depth', 0.2, 10),
  ]);
  const [dry] = into(ac, out);
  const [room] = into(ac, roomOut);
  assert.deepEqual(dry.gain.events, [
    ['value', 1],
    ['value', 0.5],
  ]);
  assert.deepEqual(room.gain.events, [
    ['value', 1],
    ['value', 0.2],
  ]);
  const [air] = into(ac, dry);
  assert.deepEqual([air.kind, into(ac, room)], ['biquad', [air]], 'the room taken after the air');
  const [pan] = into(ac, air);
  assert.deepEqual([pan.kind, pan.pan.events], ['panner', [['value', -0.5]]]);
  instrument.receive([perNote(0, 'volume', 0.25, 10.5, 0.08)]);
  assert.deepEqual(dry.gain.events.at(-1), ['target', 0.25, 10.5, 0.08], 'from its time to come');
  instrument.receive([{ type: 'per-note management', index: 0, detach: true, t: 12 }]);
  assert.deepEqual(ac.rec.disconnects, [pan, air, dry, room], 'detached: each one let go');
});

test("an instrument answering #7 Volume alone: a gain after the voice, a later change from its time, as a background's held note is hushed on a beat; its stages let go once its voice has stopped, as the next note starts, its sender detaching none (V3)", () => {
  const { ac, out, instrument, nodes } = setup({ answers: ['volume'] });
  instrument.receive([noteOn(0, 57, 10)]);
  const [dry] = into(ac, out);
  const [voiceOut] = into(ac, dry);
  assert.equal(dry.kind, 'gain');
  assert.ok(!nodes().some((node) => node.kind === 'panner'), 'no pan pot');
  instrument.receive([perNote(0, 'volume', 0, 10.8, 0.25)]);
  assert.deepEqual(dry.gain.events.at(-1), ['target', 0, 10.8, 0.25], 'hushed from the beat, not now');
  instrument.receive([noteOff(0, 11)]);
  time = 11.1;
  instrument.receive([noteOn(1, 60, 11.1)]);
  assert.deepEqual(ac.rec.disconnects, [], 'still ringing out');
  time = 20;
  instrument.receive([noteOn(2, 62, 20)]);
  assert.deepEqual(ac.rec.disconnects, [dry], 'rung out, let go as the next note starts');
  assert.ok(voiceOut, 'a voice into it');
});

test("an instrument with no stage for #7 Volume: a note's volume on its voice's out, times its patch's own, gliding from its time, as a background's held note is hushed on a beat and brought back (P3b, V4)", () => {
  time = 10;
  const engine = engineOn(() => time);
  const ac = engine.audioContext;
  const patches = new Patches({ patches: { loud: { ...VOICE, out: { volume: 0.8 } }, plain: VOICE }, now: () => time });
  const out = ac.createGain();
  const instrument = new Instrument({ engine, patches, patch: 'loud', beat: () => 0.8, into: out });
  instrument.receive([noteOn(0, 57, 10)]);
  const [voiceOut] = into(ac, out);
  instrument.receive([perNote(0, 'volume', 0, 10.8, 0.25)]);
  instrument.receive([perNote(0, 'volume', 1, 12, 0.25)]);
  assert.deepEqual(voiceOut.gain.events.slice(-2), [
    ['target', 0, 10.8, 0.25],
    ['target', 0.8, 12, 0.25],
  ]);
  const plainOut = ac.createGain();
  const plain = new Instrument({ engine, patches, patch: 'plain', beat: () => 0.8, into: plainOut });
  plain.receive([noteOn(0, 57, 10)]);
  const [plainVoiceOut] = into(ac, plainOut);
  plain.receive([perNote(0, 'volume', 0.5, 12, 0.25)]);
  assert.deepEqual(
    plainVoiceOut.gain.events.at(-1),
    ['target', 0.5, 12, 0.25],
    "a patch's own volume 1 unless it says",
  );
});

test("an instrument's knobs, its tempo and its draws handed in, read as each note starts; its patch the bank's as it plays, by name (V3)", () => {
  let release = '1/4';
  let beat = 0.8;
  const { patches, instrument, nodes } = setup({ params: () => ({ release }), beat: () => beat });
  const tails = []; // how long each note rings past its note off, as its oscillator's stop has it
  const played = (index, t) => {
    instrument.receive([noteOn(index, 69, t), noteOff(index, t + 1)]);
    tails.push(oscillators(nodes()).at(-1).stops.at(-1)[0] - (t + 1));
  };
  played(0, 10); // a quarter note, a beat: 0.8 s
  beat = 2;
  played(1, 12); // a beat of 2 s
  release = 0.3;
  played(2, 14); // 0.3 s, whatever the beat
  assert.deepEqual(
    tails.map((tail) => +tail.toFixed(9)),
    [0.8, 2, 0.3],
    "each note's release as its knob and the tempo are as it starts",
  );
  patches.set('voice', { ...VOICE, filter: { ...VOICE.filter, freq: 1200 } });
  instrument.receive([noteOn(3, 69, 16)]);
  const lowpasses = nodes().filter((node) => node.kind === 'biquad');
  assert.equal(lowpasses.at(-1).frequency.events[0][1], 1200, 'its patch as the bank has it now');
});

test("an instrument's draws its own, handed in, else Math.random's; a patch the bank hasn't, refused as it's made (V3)", () => {
  const drawn = { ...VOICE, oscs: [{ wave: 'triangle', ratio: 1, level: { between: [0.2, 0.6] } }] };
  time = 10;
  const engine = engineOn(() => time);
  const patches = new Patches({ patches: { drawn }, now: () => time });
  const instrument = new Instrument({
    engine,
    patches,
    patch: 'drawn',
    beat: () => 0.8,
    random: () => 0.5,
    into: engine.audioContext.destination,
  });
  instrument.receive([noteOn(0, 69, 10)]);
  const levels = engine.audioContext.rec.nodes
    .filter((node) => node.kind === 'gain')
    .map((node) => node.gain.events.find(([kind]) => kind === 'value')?.[1]);
  assert.ok(
    levels.some((value) => Math.abs(value - 0.4) < 1e-9),
    `its osc's level drawn halfway: ${levels}`,
  );
  const into = engine.audioContext.destination;
  assert.throws(() => new Instrument({ engine, patches, patch: 'none', beat: () => 0.8, into }), /no patch none/);
});
