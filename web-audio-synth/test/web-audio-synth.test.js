// The synth played in Web Audio's unit tests (mockup/src/libs/web-audio-synth/, its test/ folder, Z7), on the engine's stand-in for Web
// Audio, on a voice of their own: a note played from its time, built into where it goes, its controls taking clock times; patches as they
// play, copies of those they start from, an edit reaching every note of one that sounds, a value glided there, a change of structure
// rebuilt, the new voice fading in as the old fades out; a reset the one it started from. The themes' instruments, played through the
// studio, are tested in mockup/test/unit/ (follow-edits.test.js, sound-owner.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext } from '../../web-audio-engine/test/audio-stand-in.js';
import { Engine } from '../../web-audio-engine/index.ts';
import { adsr } from '../../synth/index.ts';
import { Patches, playNote } from '../index.ts';

let time = 10;
class Context extends StandInContext {
  constructor() {
    super(() => time);
  }
}
// a small voice: a triangle into a lowpass, its VCA moved by an envelope, let go over 0.3 s
const VOICE = {
  vca: { level: 0.2 },
  filter: { type: 'lowpass', freq: 800 },
  oscs: [{ wave: 'triangle', ratio: 1, level: 0.5 }],
  envelopes: [{ target: 'vca.gain', ...adsr({ attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.3 }) }],
};
const CONTEXT = { beat: 0.8, random: () => 0.5 };

// an engine on the stand-in, its time 10, and the voice's patches as they play, an edit taking over at the context's time
const played = () => {
  time = 10;
  const engine = new Engine({ AudioContext: Context });
  const patches = new Patches({ patches: { voice: VOICE }, now: () => time });
  const nodes = () => engine.audioContext.rec.nodes;
  const play = (note) =>
    playNote(engine, patches, {
      patch: patches.of('voice'),
      note,
      context: CONTEXT,
      params: {},
      into: engine.audioContext.destination,
    });
  return { patches, nodes, play };
};
const oscillators = (nodes, wave) => nodes.filter((node) => node.kind === 'oscillator' && node.props.type === wave);

test('a note played on a patch: built from its time into where it goes, held until it is let go, its controls taking clock times (Z7)', () => {
  const { nodes, play } = played();
  const controls = play({ pitch: 69, t: 11 });
  const [osc] = oscillators(nodes(), 'triangle');
  assert.deepEqual(osc.starts, [[11]], 'from its time');
  assert.equal(osc.stops.length, 0, 'held');
  controls.release(12);
  assert.ok(osc.stops.at(-1)[0] >= 12.3, 'let go at its time, after its release');
});

test('patches as they play: copies of those they start from, an edit reaching a note that sounds, a value glided there; a change of structure rebuilding it, the new voice fading in as the old fades out; a reset the one it started from (Z7)', () => {
  const { patches, nodes, play } = played();
  play({ pitch: 69, t: 10 });
  const copy = patches.current('voice');
  copy.filter.freq = 1;
  assert.equal(patches.of('voice').filter.freq, 800, 'a copy handed out');
  time = 10.5;
  patches.set('voice', { ...VOICE, filter: { ...VOICE.filter, freq: 1200 } });
  const [lowpass] = nodes().filter((node) => node.kind === 'biquad');
  assert.deepEqual(lowpass.frequency.events.at(-1), ['target', 1200, 10.5, 0.05], 'glided there from now');
  const before = nodes().length;
  time = 11;
  patches.set('voice', { ...VOICE, oscs: [{ ...VOICE.oscs[0], wave: 'sawtooth' }] });
  const built = nodes().slice(before);
  assert.equal(oscillators(built, 'sawtooth').length, 1, 'rebuilt');
  assert.deepEqual(oscillators(nodes(), 'triangle')[0].stops.at(-1), [11.1], 'the old voice stopped once faded');
  patches.reset('voice');
  assert.deepEqual(patches.current('voice'), VOICE, 'the one it started from');
});
