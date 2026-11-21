// The voices (modular-audio/build/instrument/), MIDI's notes played into an instrument's plan, on a stand-in for what's built:
//   - a note on: a voice added at its time from its pool, its note's sources set by the pool's addresses, its gate last;
//   - a note off: its gate closed, no sooner than its shortest; a note held until its note off, closed at its longest
//     only where its voice card writes one;
//   - per-note controllers: set as it starts, changed later; its pitch glided by its voice card's glide, a time constant
//     on its frequency or, as its card's glide curve says, a ramp, linear in pitch, from where the last one got to;
//   - a drum rack: a note on the pad its key names;
//   - a voice let go once it has rung out: a source silent once a gain on its way out, resting at nothing and opened only
//     by envelopes, has closed; one nothing closes as its note's last release fades; at once where its note is detached;
//   - its sources stopped by then, told as its gate closes, where it's known;
//   - a modulator on a stage's param heard only while sound reaches the stage, a delay's echoes ringing on;
//   - a change of structure while notes sound: built again, each note's gate told again at its own time;
//   - its voice card's own values, a knob's or an edit's: set on each voice as it's added; an edit on every voice sounding;
//   - the voices sounding: those playing now, from their start until they are silent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Voices } from '../index.ts';
import { near } from '../../../../base/util/test/near.js';
import { BuiltStandIn } from './built.js';
import { noteMessages } from '../../../../midi/protocol/index.ts';
import { mtof } from '../../../../music/music-theory/index.ts';
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
// a drum rack of the format's synth's voice card: a pool for each key, its pad
function rackOf(keys) {
  return synthWith({
    pools: (voice) =>
      keys.map((key) => ({
        ...voice,
        key,
        child: { ...voice.child, name: `pad ${key}` },
        wires: [{ from: { node: `pad ${key}`, output: 'out' }, to: { output: 'out' } }],
      })),
  });
}
// a note setting of a voice card, as a macro with no targets
const setting = (name, value) => ({ spec: { name, unit: 's', range: [0, 10, 0.001] }, value, maps: [] });
// its glide curve, a choice of a voice card with no targets
const curve = (value) => ({ spec: { name: 'glide curve', choices: ['target', 'ramp'] }, value, maps: [] });
// voices played into the stand-in, the time now as the test sets it
function voicesOn(plan = SYNTH, own, polyphony) {
  const built = new BuiltStandIn();
  const clock = { now: 0 };
  const voices = new Voices(built, plan, () => clock.now, own, polyphony);
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
  assert.deepEqual(built.told[3], ['voice/2/oscillator/frequency', 880, {}], 'held: no gate closed yet');
});

test('a note off: its gate closed at its time, no sooner than its shortest; a note held until its note off, however long, closed at its longest only where its voice card writes one', () => {
  const card = synthWith({ macros: [setting('shortest', 0.25), setting('longest', 2)] });
  const { built, voices } = voicesOn(card);
  played(voices, { pitch: 69, velocity: 1, t: 5 });
  assert.deepEqual(built.told.at(-1), ['voice/1/envelope/gate', 0, { at: 7 }], 'its longest');
  voices.receive([{ type: 'note off', index: 1, t: 5.125 }]);
  assert.deepEqual(built.told.at(-1), ['voice/1/envelope/gate', 0, { at: 5.25 }], 'its shortest');
  const plain = voicesOn();
  played(plain.voices, { pitch: 69, velocity: 1, t: 5 });
  plain.voices.receive([{ type: 'note off', index: 1, t: 65 }]);
  assert.deepEqual(
    plain.built.told.filter(([address]) => address.endsWith('gate')).map(([, value, { at }]) => [value, at]),
    [
      [1, 5],
      [0, 65],
    ],
    'none written: held until its note off, a minute on',
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
    ['voice/1/oscillator/detune', 0.5, { at: 6, glide: 0.1 }],
  ]);
  const jumps = voicesOn();
  played(jumps.voices, { pitch: 69, velocity: 1, t: 5, glides: [[5.5, 81]] });
  assert.deepEqual(jumps.built.told[2], ['voice/1/oscillator/frequency', mtof(81), { at: 5.5 }], 'no glide: a jump');
});

test("a glide curve of target, as a voice card says it and as it's without: the pitch glided by a time constant on its frequency, as set; nothing automated", () => {
  for (const macros of [[setting('glide', 0.03), curve('target')], [setting('glide', 0.03)]]) {
    const { built, voices } = voicesOn(synthWith({ macros }));
    played(voices, { pitch: 69, velocity: 1, t: 5, glides: [[5.5, 81]] });
    voices.receive([{ type: 'per-note controller', index: 1, controller: 'pitch', value: 57, t: 6 }]);
    assert.deepEqual(built.told.slice(-2), [
      ['voice/1/oscillator/frequency', mtof(81), { at: 5.5, glide: 0.03 }],
      ['voice/1/oscillator/frequency', mtof(57), { at: 6, glide: 0.03 }],
    ]);
    assert.deepEqual(built.automated, []);
  }
});

test("a glide curve of ramp: a glide an exponential ramp three time constants long, from the pitch it's at then, a straight line in pitch; the card's glide the time constant", () => {
  const { built, voices } = voicesOn(synthWith({ macros: [setting('glide', 0.03), curve('ramp')] }));
  played(voices, { pitch: 69, velocity: 1, t: 5, glides: [[5.5, 81]] });
  assert.deepEqual(
    built.told.map(([address]) => address),
    ['voice/1/oscillator/frequency', 'voice/1/envelope/gate'],
    'its first pitch set as the note starts, no glide told as a time constant',
  );
  assert.equal(built.automated.length, 1);
  const [address, events, from] = built.automated[0];
  assert.equal(address, 'voice/1/oscillator/frequency');
  assert.deepEqual(events, [
    ['cancel', 5.5],
    ['set', 440, 5.5],
    ['exp', mtof(81), 5.5 + 3 * 0.03],
  ]);
  assert.equal(from, 0, 'its times absolute');
});

test('a glide of ramp coming before the last has landed starts from where that one has got to, in pitch; one that came after it has landed starts from its pitch', () => {
  const { built, voices } = voicesOn(synthWith({ macros: [setting('glide', 0.1), curve('ramp')] }));
  played(voices, { pitch: 69, velocity: 1, t: 5, glides: [[6, 81]] });
  voices.receive([{ type: 'per-note controller', index: 1, controller: 'pitch', value: 57, t: 6.15 }]);
  voices.receive([{ type: 'per-note controller', index: 1, controller: 'pitch', value: 69, t: 7 }]);
  const [, second, third] = built.automated.map(([, events]) => events);
  const halfway = 440 * 2 ** 0.5; // 0.15 s into a ramp 0.3 s long, an octave up: half an octave
  assert.deepEqual([second[1][0], second[1][2]], ['set', 6.15]);
  near(second[1][1], halfway, 'half an octave up');
  assert.deepEqual(second[2], ['exp', mtof(57), 6.15 + 0.3]);
  assert.deepEqual(third[1], ['set', mtof(57), 7], 'landed by then');
});

test('a glide of ramp with no glide in the card: a jump at its time, the next glide from there', () => {
  const { built, voices } = voicesOn(synthWith({ macros: [curve('ramp')] }));
  played(voices, { pitch: 69, velocity: 1, t: 5, glides: [[5.5, 81]] });
  assert.deepEqual(built.told[2], ['voice/1/oscillator/frequency', mtof(81), { at: 5.5 }]);
  assert.deepEqual(built.automated, []);
});

test("a voice's ramp its own: a second voice's glide starts from its own pitch", () => {
  const { built, voices } = voicesOn(synthWith({ macros: [setting('glide', 0.1), curve('ramp')] }));
  played(voices, { pitch: 69, velocity: 1, t: 5, glides: [[5.5, 81]] });
  played(voices, { pitch: 57, velocity: 1, t: 5, glides: [[5.5, 45]] }, 2);
  assert.deepEqual(
    built.automated.map(([address, events]) => [address, events[1]]),
    [
      ['voice/1/oscillator/frequency', ['set', 440, 5.5]],
      ['voice/2/oscillator/frequency', ['set', mtof(57), 5.5]],
    ],
  );
});

test('a drum rack: a note on the pad its key names, each pad its own voices; none where no pad has its key', () => {
  const { built, voices } = voicesOn(rackOf([38, 40]));
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

test("as its gate closes, its sources stopped by when it's silent, worked out then; none where it never is; told again as it's built again", () => {
  const { built, voices } = voicesOn();
  built.fadedAt.set('voice/1/envelope', 6.3);
  played(voices, { pitch: 69, velocity: 1, t: 5, duration: 1 });
  assert.deepEqual(built.stoppedBy.at(-1), ['voice/1', 6.3], 'at its note off, its envelope faded by then');
  played(voices, { pitch: 69, velocity: 1, t: 7, duration: 1 }, 2);
  assert.deepEqual(
    built.stoppedBy.filter(([copy]) => copy === 'voice/2'),
    [],
    'its gate closed, its envelope never fading: none',
  );
  voices.rebuild(SYNTH);
  assert.deepEqual(built.stoppedBy.at(-1), ['voice/1', 6.3], 'built again: told again');
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

test("a trigger's envelope, running on past its note off: its voice silent once it has run, not at its note off", () => {
  const [oscillator, vca, envelope] = SYNTH.node.pools[0].child.children;
  const mode = { spec: { name: 'mode', choices: ['gate', 'trigger'] }, value: 'trigger' };
  const trigger = { ...envelope, settings: [...envelope.settings.filter(({ spec }) => spec.name !== 'mode'), mode] };
  const { built, clock, voices } = voicesOn(synthWith({ children: [oscillator, vca, trigger] }));
  built.fadedAt.set('voice/1/envelope', 6);
  played(voices, { pitch: 69, velocity: 1, t: 5, duration: 0.25 });
  assert.deepEqual(built.stoppedBy.at(-1), ['voice/1', 6], 'stopped once it has run');
  clock.now = 5.5;
  voices.receive([]);
  assert.deepEqual(built.letGone, [], 'still running');
});

test("a modulator on a stage's param heard only while sound reaches the stage: an envelope on the cutoff of a filter after the gain, silent as the gain's envelope fades, though another envelope never does; on a delay's time, as long as its echoes ring", () => {
  const [oscillator, vca, envelope] = SYNTH.node.pools[0].child.children;
  const stage = (name, kind, param) => ({
    name,
    kind,
    inputs: [{ name: 'in' }],
    outputs: [{ name: 'out' }],
    params: [{ spec: { name: param, range: [0, 20000, 1] }, value: 1000 }],
    settings: [],
  });
  const moved = { ...envelope, name: 'moves' }; // the stage's envelope
  const vibrato = { ...envelope, name: 'vibrato' }; // a fade that never ends, on the pitch
  // the format's voice, its gain's sound through a stage the moving envelope moves, into its output
  const through = (after) =>
    synthWith({
      children: [oscillator, vca, envelope, after, moved, vibrato],
      wires: [
        { from: { node: 'oscillator', output: 'out' }, to: { node: 'vca', input: 'in' } },
        { from: { node: 'envelope', output: 'out' }, to: { node: 'vca', param: 'gain' } },
        { from: { node: 'vca', output: 'out' }, to: { node: after.name, input: 'in' } },
        { from: { node: 'moves', output: 'out' }, to: { node: after.name, param: after.params[0].spec.name } },
        { from: { node: 'vibrato', output: 'out' }, to: { node: 'oscillator', param: 'frequency' } },
        { from: { node: after.name, output: 'out' }, to: { output: 'out' } },
      ],
    });
  const filtered = voicesOn(through(stage('filter', 'filter', 'cutoff')));
  filtered.built.fadedAt.set('voice/1/envelope', 6.3);
  filtered.built.fadedAt.set('voice/1/moves', 6.5);
  played(filtered.voices, { pitch: 69, velocity: 1, t: 5, duration: 1 });
  assert.deepEqual(filtered.built.stoppedBy.at(-1), ['voice/1', 6.3], "stopped as the gain's envelope fades");
  filtered.clock.now = 6.4;
  filtered.voices.receive([]);
  assert.deepEqual(filtered.built.letGone, ['voice/1']);

  const echoed = voicesOn(through(stage('delay', 'delay', 'ms')));
  echoed.built.fadedAt.set('voice/1/envelope', 6.3);
  echoed.built.fadedAt.set('voice/1/moves', 6.5);
  echoed.built.fadedAt.set('voice/1/vibrato', 6.6);
  played(echoed.voices, { pitch: 69, velocity: 1, t: 5, duration: 1 });
  assert.deepEqual(echoed.built.stoppedBy.at(-1), ['voice/1', 6.6], "its echoes heard to its note's last release");
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

test("its voice cards' own values, a knob's or an edit's, by their addresses in the instrument: set on each voice as it's added, read then, before its sources, where its voice card has them; an edit set on every voice of its card sounding, gliding", () => {
  const knobs = { 'voice/vca/gain': 0.5, 'voice/filter/cutoff': 900 };
  const { built, voices } = voicesOn(SYNTH, () => knobs);
  played(voices, { pitch: 69, velocity: 1, t: 5 });
  knobs['voice/vca/gain'] = 0.25;
  played(voices, { pitch: 69, velocity: 1, t: 6 }, 2);
  assert.deepEqual(
    built.told.filter(([address]) => address.endsWith('vca/gain')),
    [
      ['voice/1/vca/gain', 0.5, {}],
      ['voice/2/vca/gain', 0.25, {}],
    ],
    'no filter on this voice card: passed by',
  );
  assert.deepEqual(built.told[0], ['voice/1/vca/gain', 0.5, {}], 'before its sources');
  voices.edit({ 'voice/oscillator/frequency': 330, 'voice/filter/cutoff': 900 });
  assert.deepEqual(built.told.slice(-2), [
    ['voice/1/oscillator/frequency', 330, { glide: 0.05 }],
    ['voice/2/oscillator/frequency', 330, { glide: 0.05 }],
  ]);
});

test('an edit reaches the voices still sounding: one rung out let go first, left alone', () => {
  const { built, clock, voices } = voicesOn(SYNTH);
  played(voices, { pitch: 69, velocity: 1, t: 5, duration: 0.5 });
  played(voices, { pitch: 69, velocity: 1, t: 6 }, 2);
  built.fadedAt.set('voice/1/envelope', 5.8);
  clock.now = 7;
  voices.edit({ 'voice/oscillator/frequency': 330 });
  assert.deepEqual(built.letGone, ['voice/1'], 'rung out: let go');
  assert.deepEqual(
    built.told.filter(([, value]) => value === 330).map(([address]) => address),
    ['voice/2/oscillator/frequency'],
  );
});

test("a drum rack's own values, by their pads' addresses: each pad's on its own voices alone", () => {
  const { built, voices } = voicesOn(rackOf([38, 40]), () => ({ 'pad 40/vca/gain': 0.5 }));
  played(voices, { pitch: 38, velocity: 1, t: 5 });
  played(voices, { pitch: 40, velocity: 1, t: 5 }, 2);
  voices.edit({ 'pad 38/vca/gain': 0.75 });
  assert.deepEqual(
    built.told.filter(([address]) => address.endsWith('vca/gain')),
    [
      ['pad 40/1/vca/gain', 0.5, {}],
      ['pad 38/1/vca/gain', 0.75, { glide: 0.05 }],
    ],
  );
});

test("two inputs' notes of one index kept apart, each voice added into what its input gives", () => {
  const { built, voices } = voicesOn();
  const first = voices.input(() => 'first');
  const second = voices.input(() => 'second');
  first.receive(noteMessages({ pitch: 69, velocity: 1, t: 5 }, 0));
  second.receive(noteMessages({ pitch: 64, velocity: 1, t: 5 }, 0));
  first.receive([{ type: 'note off', index: 0, t: 6 }]);
  assert.deepEqual(built.added, [
    ['voice/1', 5, 'first'],
    ['voice/2', 5, 'second'],
  ]);
  const gates = built.told.filter(([address, value]) => address.endsWith('gate') && value === 0);
  assert.deepEqual(gates, [['voice/1/envelope/gate', 0, { at: 6 }]], "the first's closed, the second's not");
  played(voices, { pitch: 60, velocity: 1, t: 7 }, 0);
  assert.deepEqual(built.added.at(-1), ['voice/3', 7], "its own input's: into none");
});

test('the voices sounding: those playing now, each from its start until it is silent; one rung out no longer counted, though not let go until the messages after', () => {
  const { built, clock, voices } = voicesOn();
  played(voices, { pitch: 69, velocity: 1, t: 5, duration: 1 }, 1);
  played(voices, { pitch: 64, velocity: 1, t: 8 }, 2);
  clock.now = 4;
  assert.equal(voices.sounding, 0, 'neither started');
  clock.now = 5;
  assert.equal(voices.sounding, 1);
  built.fadedAt.set('voice/1/envelope', 6.3);
  clock.now = 6.4;
  assert.equal(voices.sounding, 0, 'rung out');
  assert.deepEqual(built.letGone, [], 'not let go yet');
  clock.now = 8;
  assert.equal(voices.sounding, 1);
});

test('a note past its polyphony takes over the oldest voice: its gate closed first, else the oldest held; faded by its note volume, stopped, let go once silent; the voices sounding counted', () => {
  const plan = synthWith({ note: { volume: [['vca', 'gain']] } });
  const held = voicesOn(plan, undefined, () => 2);
  played(held.voices, { pitch: 69, velocity: 1, t: 5 }, 1);
  played(held.voices, { pitch: 64, velocity: 1, t: 5 }, 2);
  held.clock.now = 5;
  assert.equal(held.voices.sounding, 2);
  played(held.voices, { pitch: 60, velocity: 1, t: 7 }, 3);
  const faded = (built) => built.told.filter(([address, value]) => address.endsWith('vca/gain') && value === 0);
  assert.deepEqual(faded(held.built), [['voice/1/vca/gain', 0, { at: 7, glide: 0.05 }]], 'a tie: the first added');
  assert.deepEqual(held.built.stoppedBy, [['voice/1', 7.25]]);
  assert.deepEqual(held.built.added.at(-1), ['voice/3', 7]);
  held.clock.now = 7.2;
  held.voices.receive([]);
  assert.deepEqual(held.built.letGone, [], 'still fading');
  assert.equal(held.voices.sounding, 3, 'the one taken over counted while it fades');
  held.clock.now = 7.3;
  held.voices.receive([]);
  assert.deepEqual(held.built.letGone, ['voice/1']);
  assert.equal(held.voices.sounding, 2);
  played(held.voices, { pitch: 62, velocity: 1, t: 8 }, 4);
  assert.deepEqual(held.built.stoppedBy.at(-1), ['voice/2', 8.25], 'then the oldest held');

  const released = voicesOn(plan, undefined, () => 2);
  played(released.voices, { pitch: 69, velocity: 1, t: 5 }, 1);
  played(released.voices, { pitch: 64, velocity: 1, t: 6 }, 2);
  released.voices.receive([{ type: 'note off', index: 2, t: 6.5 }]);
  played(released.voices, { pitch: 60, velocity: 1, t: 7 }, 3);
  assert.deepEqual(released.built.stoppedBy.at(-1), ['voice/2', 7.25], 'its gate closed first, though a younger voice');
  assert.deepEqual(faded(released.built), [['voice/2/vca/gain', 0, { at: 7, glide: 0.05 }]]);
});
