// A voice card's parts (mockup/src/libs/modular-audio/plan/instrument), in node: what a voice card is made of.
//   - the note's sources, a voice card's CV: each on a control, by MIDI's names where it has them; the note's settings;
//   - the modules, a YAML template each, of its form: sources, modulators, stages, the output;
//   - each module's params, its macros, onto its blocks: a tune in semitones onto a detune in cents; each its hint;
//   - an architecture, of its form: sources into the chain, the chain into one output, modulators into params, a
//     module's among them; the note's sources its macros; refused where it breaks its form, every failure said;
//   - the note's own values: the note's sources beside its pitch, gate, velocity and volume.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_SETTINGS, NOTE_SOURCES, OWN_NOTE_VALUES, SYNTH_FORMS } from '../index.ts';
import { MODULE_TEMPLATES } from '../content.ts';
import { Planner } from '../../planner/index.ts';
import { isSwitch } from '../../../../base/params/index.ts';
import { onControl } from '../../../../base/params/test/on-control.js';
import { paramAt, settingAt } from '../../format/index.ts';
import { PLUCK } from './pluck.js';

const planner = new Planner(MODULE_TEMPLATES, SYNTH_FORMS);

// a planned module's params, its macros by name, each its value
function paramsOf(kind) {
  return Object.fromEntries(planner.plan(kind).node.macros.map(({ spec, value }) => [spec.name, value]));
}

test("the note's sources, as a voice card's CV: its frequency, gate and velocity, its volume, its pan, its bend, the per-note controllers; each on a control, starting at its default; by MIDI's names where it has them", () => {
  assert.deepEqual(Object.keys(NOTE_SOURCES), [
    'frequency',
    'gate',
    'velocity',
    'volume',
    'pan',
    'bend',
    'vibrato depth',
    'vibrato rate',
    'breath',
    'decay time',
    'rise',
  ]);
  for (const [name, spec] of Object.entries(NOTE_SOURCES)) {
    assert.equal(spec.name, name);
    assert.ok(onControl(spec, spec.default), `${name}: its default on its control`);
  }
  assert.ok(isSwitch(NOTE_SOURCES.gate), 'opened and closed by the note');
  assert.deepEqual(
    ['frequency', 'bend', 'vibrato depth', 'vibrato rate', 'decay time', 'rise'].map((name) => NOTE_SOURCES[name].unit),
    ['Hz', 'semitones', 'cents', 'Hz', 's', 's'],
  );
  assert.deepEqual(
    ['bend', 'vibrato depth', 'breath', 'volume'].map((name) => NOTE_SOURCES[name].default),
    [0, 0, 0, 1],
    'nothing moved where a note sends none, its volume at unity',
  );
  assert.deepEqual(
    [NOTE_SOURCES.pan.range, NOTE_SOURCES.pan.default],
    [[-1, 1, 0.01], 0],
    "MIDI 2.0's per-note pan: left to right, centered where a note sends none",
  );
  assert.deepEqual(Object.keys(NOTE_SETTINGS), ['glide', 'glide curve', 'shortest', 'longest']);
  assert.deepEqual(
    [NOTE_SETTINGS['glide curve'].choices, NOTE_SETTINGS['glide curve'].default],
    [['target', 'ramp'], 'target'],
    'a glide by a time constant, as a voice card has it, unless it says a ramp',
  );
});

test('the modules, a YAML template each, of its form: the sources, the modulators, the stages, the output; each planned with no failure', () => {
  assert.deepEqual(
    MODULE_TEMPLATES.map(({ kind }) => [kind, planner.plan(kind).node.form]),
    [
      ['VCO', 'source'],
      ['Noise source', 'source'],
      ['SyncVCO', 'source'],
      ['Operators', 'source'],
      ['PhaseVCO', 'source'],
      ['LFO', 'modulator'],
      ['FM', 'modulator'],
      ['Envelope generator', 'modulator'],
      ['VCA', 'stage'],
      ['VCF', 'stage'],
      ['SaturatingVCF', 'stage'],
      ['Saturator', 'stage'],
      ['Tremolo', 'stage'],
      ['Ring', 'stage'],
      ['Out', 'output'],
      ['Panned out', 'output'],
    ],
  );
});

test("each module's params, its macros by name, at their values as each starts", () => {
  assert.deepEqual(Object.fromEntries(MODULE_TEMPLATES.map(({ kind }) => [kind, Object.keys(paramsOf(kind))])), {
    VCO: ['frequency', 'tune', 'level', 'stop'],
    'Noise source': ['level', 'cutoff', 'resonance', 'tune', 'offset', 'stop'],
    LFO: ['sync', 'note', 'hz', 'depth', 'scale'],
    FM: ['frequency', 'tune', 'scale', 'index', 'stop'],
    'Envelope generator': ['gate', 'delay', 'attack', 'hold', 'decay', 'sustain', 'release', 'amount', 'velocity'],
    VCA: ['gain', 'level'],
    VCF: ['cutoff', 'resonance', 'tune'],
    Tremolo: ['gain'],
    Ring: ['frequency', 'tune', 'stop'],
    Out: ['volume', 'note volume'],
    SyncVCO: ['frequency', 'tune', 'sync', 'wave', 'level', 'stop'],
    Operators: [
      'frequency',
      'tune',
      'algorithm',
      'feedback',
      'phase',
      'stop',
      ...[1, 2, 3, 4].flatMap((operator) => ['ratio', 'detune', 'level', 'wave'].map((name) => `${name} ${operator}`)),
    ],
    PhaseVCO: ['frequency', 'tune', 'dcw', 'wave', 'phase', 'level', 'stop'],
    SaturatingVCF: ['cutoff', 'resonance', 'tune', 'drive', 'compensation', 'mode'],
    Saturator: ['drive', 'shape', 'level'],
    'Panned out': ['volume', 'note volume', 'pan'],
  });
  const lfo = planner.plan('LFO', { values: { sync: 1, note: '1/8', hz: 0.06 } });
  assert.deepEqual(
    ['sync', 'note', 'frequency'].map((name) => paramAt(lfo, ['osc', name]).value),
    [1, '1/8', 0.06],
    "an LFO's rate its oscillator's",
  );
  assert.deepEqual(
    ['tune', 'level']
      .map((name) => paramsOf('VCO')[name])
      .concat(paramsOf('VCA').gain, paramsOf('Out').volume, paramsOf('Out')['note volume']),
    [0, 1, 1, 1, 1],
    'in tune, at unity, open',
  );
  assert.deepEqual([paramsOf('FM').index, paramsOf('LFO').depth, paramsOf('Envelope generator').velocity], [0, 0, 1]);
});

test("every module's macro its hint, in its YAML, as a view shows it beside its knob", () => {
  const unhinted = MODULE_TEMPLATES.flatMap(({ kind }) =>
    planner
      .plan(kind)
      .node.macros.filter(({ hint }) => !hint)
      .map(({ spec }) => `${kind}/${spec.name}`),
  );
  assert.deepEqual(unhinted, []);
});

test("the added modules' macros onto their blocks: a tune in semitones onto a detune in cents, a pan onto its pan block at constant power, the volume's factor √2 keeping the middle as loud as the Out", () => {
  const detunes = [
    ['SyncVCO', 'osc'],
    ['Operators', 'osc'],
    ['PhaseVCO', 'osc'],
    ['SaturatingVCF', 'filter'],
  ];
  for (const [kind, block] of detunes) {
    assert.equal(paramAt(planner.plan(kind, { values: { tune: 2.5 } }), [block, 'detune']).value, 250, kind);
  }
  assert.equal(paramAt(planner.plan('Operators', { values: { 'level 3': 0.7 } }), ['osc', 'level3']).value, 0.7);
  const panned = planner.plan('Panned out', { values: { pan: -0.5, volume: 1 } });
  assert.equal(paramAt(panned, ['pan', 'pan']).value, -0.5);
  assert.equal(settingAt(panned, ['pan', 'law']).value, 'pan pot');
  assert.equal(paramAt(panned, ['volume', 'gain']).value, Math.SQRT2, 'unity at the macro is √2 of the gain');
});

test("a module's params onto its blocks: a tune in semitones onto a detune in cents; a ring's gain at 0, its oscillator moving it; each module's settings its blocks'", () => {
  const vco = planner.plan('VCO', { values: { tune: 24.06 } });
  assert.equal(paramAt(vco, ['osc', 'detune']).value, 2406, 'a ratio of 4 and 6 cents');
  const vcf = planner.plan('VCF', { values: { tune: 5.83 } });
  assert.equal(paramAt(vcf, ['filter', 'detune']).value, 583, "a cutoff's offset, 1.4 times the note");
  const ring = planner.plan('Ring').node;
  assert.equal(paramAt({ node: ring }, ['ring', 'gain']).value, 0);
  assert.deepEqual(
    ring.wires.find(({ to }) => 'param' in to),
    {
      from: { node: 'osc', output: 'out' },
      to: { node: 'ring', param: 'gain' },
    },
  );
  assert.deepEqual(
    [
      settingAt(planner.plan('VCO'), ['osc', 'wave']).value,
      settingAt(planner.plan('Noise source'), ['noise', 'loop']).value,
      settingAt(planner.plan('LFO'), ['osc', 'phase']).value,
      settingAt(planner.plan('Envelope generator'), ['envelope', 'mode']).value,
    ],
    ['sine', 'off', 'reset', 'gate'],
  );
});

// the pluck with a change, a planner for it
function pluckPlanner(change = (pluck) => pluck) {
  return new Planner([...MODULE_TEMPLATES, change(structuredClone(PLUCK))], SYNTH_FORMS);
}

test("an architecture, of its form: a source into the chain, the chain into one output, an envelope into a stage's param; the note's frequency, gate and velocity its macros", () => {
  const plan = pluckPlanner().plan('Pluck');
  assert.equal(plan.node.form, 'architecture');
  assert.deepEqual(
    plan.node.children.map(({ name, role }) => [name, role]),
    [
      ['osc 1', 'source'],
      ['amp', 'modulator'],
      ['vca', 'stage'],
      ['out', 'out'],
    ],
  );
  assert.deepEqual(
    plan.node.macros.map(({ spec }) => spec.name),
    ['frequency', 'gate', 'velocity'],
  );
});

test('an architecture refused where it breaks its form, every failure said: a second output; a source into no stage; a modulator into an input', () => {
  const twoOuts = (pluck) => ({ ...pluck, children: [...pluck.children, { name: 'out 2', kind: 'Out', role: 'out' }] });
  assert.throws(() => pluckPlanner(twoOuts), /role out: 2 children, at most 1/);
  const astray = (pluck) => ({
    ...pluck,
    children: [...pluck.children, { name: 'osc 2', kind: 'VCO', role: 'source' }],
  });
  assert.throws(() => pluckPlanner(astray), /osc 2: its way out doesn't end in the out/);
  const intoInput = (pluck) => ({
    ...pluck,
    wires: [...pluck.wires, { from: { node: 'amp', output: 'out' }, to: { node: 'out', input: 'in' } }],
  });
  assert.throws(() => pluckPlanner(intoInput), /a wire from amp into out: not allowed/);
});

test("the note's own values, every source of the note but its pitch, its gate, its velocity and its volume, in their order, each its source's spec, as a test note sets them", () => {
  const apart = ['frequency', 'gate', 'velocity', 'volume'];
  const own = Object.keys(NOTE_SOURCES).filter((name) => !apart.includes(name));
  assert.deepEqual(
    OWN_NOTE_VALUES.map(({ name }) => name),
    own,
  );
  for (const spec of OWN_NOTE_VALUES) {
    assert.equal(spec, NOTE_SOURCES[spec.name], `${spec.name}: its source's spec`);
  }
});
