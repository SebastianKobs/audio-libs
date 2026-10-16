// The voices (mockup/src/libs/build/voices), MIDI's notes played into an instrument's plan, on a stand-in for what's built:
//   - a note on: a voice added at its time from its pool, its note's sources set by the pool's addresses, its gate last;
//   - a note off: its gate closed, no sooner than its shortest; a note with no end closed at its longest;
//   - per-note controllers: set as it starts, changed later; its pitch glided by its voice card's glide;
//   - a drum rack: a note on the pad its key names;
//   - a voice let go once it has rung out: a source silent once a gain on its way out, resting at nothing and opened only
//     by envelopes, has closed; one nothing closes as its note's last release fades; at once where its note is detached;
//   - a change of structure while notes sound: built again, each note's gate told again at its own time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Voices } from '../index.ts';
import { BuiltStandIn } from './built.js';
import { noteMessages } from '../../../midi/index.ts';
import { mtof } from '../../../music-theory/index.ts';
import { SYNTH } from '../../../plan/format/test/plans.ts';

// the format's synth, its voice card's children and settings as given, its pools' note growing by what's given
function synthWith({ children, wires, macros = [], note = {}, pools } = {}) {
  const [pool] = SYNTH.node.pools;
  const card = {
    ...pool.child,
    children: children ?? pool.child.children,
    wires: wires ?? pool.child.wires,
    macros,
  };
  const voice = { ...pool, child: card, note: { ...pool.note, ...note } };
  return { ...SYNTH, node: { ...SYNTH.node, pools: pools?.(voice) ?? [voice] } };
}
// a note setting of a voice card, as a macro with no targets
const setting = (name, value) => ({ spec: { name, unit: 's', range: [0, 10, 0.001] }, value, maps: [] });
// voices played into the stand-in, the time now as the test sets it
function voicesOn(plan = SYNTH) {
  const built = new BuiltStandIn();
  const clock = { now: 0 };
  const voices = new Voices(built, plan, () => clock.now);
  return { built, clock, voices };
}
const played = (voices, note, index = 1) => voices.receive(noteMessages(note, index));

test("a note on: a voice added at its time from the instrument's pool, its frequency and velocity set by the pool's addresses as it's added, before it sounds, as a voice is built at them; its gate opened last, at its time; each note its own voice", () => {
  const { built, voices } = voicesOn(synthWith({ note: { velocity: [['vca', 'gain']] } }));
  played(voices, { pitch: 69, velocity: 0.8, t: 5 });
  played(voices, { pitch: 81, velocity: 0.5, t: 6 }, 2);
  assert.deepEqual(built.added, [
    ['voice/1', 5],
    ['voice/2', 6],
  ]);
  assert.deepEqual(built.told.slice(0, 3), [
    ['voice/1/oscillator/frequency', 440, {}],
    ['voice/1/vca/gain', 0.8, {}],
    ['voice/1/envelope/gate', 1, { at: 5 }],
  ]);
  assert.deepEqual(built.told[4], ['voice/2/oscillator/frequency', 880, {}]);
});

test('a note off: its gate closed at its time, no sooner than its shortest; a note with no end closed at its longest, 10 s unless its voice card says', () => {
  const card = synthWith({ macros: [setting('shortest', 0.25), setting('longest', 2)] });
  const { built, voices } = voicesOn(card);
  played(voices, { pitch: 69, velocity: 1, t: 5 });
  assert.deepEqual(built.told.at(-1), ['voice/1/envelope/gate', 0, { at: 7 }], 'its longest');
  voices.receive([{ type: 'note off', index: 1, t: 5.125 }]);
  assert.deepEqual(built.told.at(-1), ['voice/1/envelope/gate', 0, { at: 5.25 }], 'its shortest');
  const plain = voicesOn();
  played(plain.voices, { pitch: 69, velocity: 1, t: 5, duration: 1 });
  assert.deepEqual(
    plain.built.told.filter(([address]) => address.endsWith('gate')).map(([, value, { at }]) => [value, at]),
    [
      [1, 5],
      [0, 15],
      [0, 6],
    ],
  );
});

test("per-note controllers: those sent with its note set as it starts, by the pool's addresses, before its gate; one sent later a change at its time, gliding as it says; its pitch glided by its voice card's glide; one its pool has no source for passed by", () => {
  const plan = synthWith({ macros: [setting('glide', 0.03)], note: { bend: [['oscillator', 'detune']] } });
  const { built, voices } = voicesOn(plan);
  played(voices, { pitch: 69, velocity: 1, t: 5, controllers: { bend: -0.6, pan: 0.5 }, glides: [[5.5, 81]] });
  voices.receive([{ type: 'per-note controller', index: 1, controller: 'bend', value: 0.5, t: 6, glide: 0.1 }]);
  assert.deepEqual(built.told, [
    ['voice/1/oscillator/frequency', 440, {}],
    ['voice/1/oscillator/detune', -0.6, {}],
    ['voice/1/envelope/gate', 1, { at: 5 }],
    ['voice/1/oscillator/frequency', mtof(81), { at: 5.5, glide: 0.03 }],
    ['voice/1/envelope/gate', 0, { at: 15 }],
    ['voice/1/oscillator/detune', 0.5, { at: 6, glide: 0.1 }],
  ]);
  const jumps = voicesOn();
  played(jumps.voices, { pitch: 69, velocity: 1, t: 5, glides: [[5.5, 81]] });
  assert.deepEqual(jumps.built.told[2], ['voice/1/oscillator/frequency', mtof(81), { at: 5.5 }], 'no glide: a jump');
});

test('a drum rack: a note on the pad its key names, each pad its own voices; none where no pad has its key', () => {
  const pads = synthWith({
    pools: (voice) =>
      [38, 40].map((key) => ({
        ...voice,
        key,
        child: { ...voice.child, name: `pad ${key}` },
        wires: [{ from: { node: `pad ${key}`, output: 'out' }, to: { output: 'out' } }],
      })),
  });
  const { built, voices } = voicesOn(pads);
  played(voices, { pitch: 40, velocity: 1, t: 5 });
  played(voices, { pitch: 38, velocity: 1, t: 6 }, 2);
  played(voices, { pitch: 41, velocity: 1, t: 7 }, 3);
  assert.deepEqual(built.added, [
    ['pad 40/1', 5],
    ['pad 38/1', 6],
  ]);
});

test('a voice let go once it has rung out, at the messages after: its sources silent once a gain on their way out, resting at nothing and opened only by envelopes, has closed, its envelope faded; never while it holds', () => {
  const { built, clock, voices } = voicesOn();
  played(voices, { pitch: 69, velocity: 1, t: 5, duration: 1 });
  clock.now = 100;
  voices.receive([]);
  assert.deepEqual(built.letGone, [], 'its envelope holding');
  built.fadedAt.set('voice/1/envelope', 6.3);
  clock.now = 6.2;
  voices.receive([]);
  assert.deepEqual(built.letGone, [], 'still ringing');
  clock.now = 6.4;
  voices.receive([]);
  voices.receive([]);
  assert.deepEqual(built.letGone, ['voice/1'], 'once');
  played(voices, { pitch: 69, velocity: 1, t: 7 }, 2);
  built.fadedAt.set('voice/2/envelope', 7.4);
  clock.now = 7.5;
  voices.receive([]);
  assert.deepEqual(built.letGone, ['voice/1', 'voice/2'], 'held, its sound decayed to nothing: before its note ends');
});

test("a source nothing closes silent as its note's last release fades; an LFO with the sound it moves; a note detached let go at once", () => {
  const [oscillator, , envelope] = SYNTH.node.pools[0].child.children;
  const lfo = { ...oscillator, name: 'lfo' };
  const drone = synthWith({
    children: [oscillator, lfo, envelope],
    wires: [
      { from: { node: 'oscillator', output: 'out' }, to: { output: 'out' } },
      { from: { node: 'lfo', output: 'out' }, to: { node: 'oscillator', param: 'frequency' } },
    ],
  });
  const { built, clock, voices } = voicesOn(drone);
  played(voices, { pitch: 69, velocity: 1, t: 5 });
  clock.now = 6.1;
  voices.receive([{ type: 'note off', index: 1, t: 6 }]);
  built.fadedAt.set('voice/1/envelope', 6.3);
  clock.now = 6.2;
  voices.receive([]);
  assert.deepEqual(built.letGone, [], 'its release, from its note off, still fading');
  clock.now = 6.4;
  voices.receive([]);
  assert.deepEqual(built.letGone, ['voice/1']);
  played(voices, { pitch: 69, velocity: 1, t: 7 }, 2);
  voices.receive([{ type: 'per-note management', index: 2, detach: true, t: 8 }]);
  assert.deepEqual(built.letGone, ['voice/1', 'voice/2']);
});

test('a gain resting at nothing that another source opens too, an LFO, never closed by its envelope fading: held, its voice kept', () => {
  const [oscillator, vca, envelope] = SYNTH.node.pools[0].child.children;
  const lfo = { ...oscillator, name: 'lfo' };
  const throbbing = synthWith({
    children: [oscillator, vca, envelope, lfo],
    wires: [
      ...SYNTH.node.pools[0].child.wires,
      { from: { node: 'lfo', output: 'out' }, to: { node: 'vca', param: 'gain' } },
    ],
  });
  const { built, clock, voices } = voicesOn(throbbing);
  played(voices, { pitch: 69, velocity: 1, t: 5 });
  built.fadedAt.set('voice/1/envelope', 5.4);
  clock.now = 6;
  voices.receive([]);
  assert.deepEqual(built.letGone, []);
});

test("a change of structure while notes sound: built again, each sounding note's gate told again at its own time", () => {
  const { built, voices } = voicesOn();
  played(voices, { pitch: 69, velocity: 1, t: 5, duration: 1 });
  const changed = synthWith({ macros: [setting('glide', 0.03)] });
  voices.rebuild(changed);
  assert.deepEqual(built.rebuilt, [changed]);
  assert.deepEqual(built.told.slice(-2), [
    ['voice/1/envelope/gate', 1, { at: 5 }],
    ['voice/1/envelope/gate', 0, { at: 6 }],
  ]);
});
