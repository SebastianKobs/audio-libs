// The synth's library (mockup/src/libs/plan/synth), in node: what a voice card is made of.
//   - the note's sources, a voice card's CV: each on a control, by MIDI's names where it has them; the note's settings;
//   - the modules, a YAML template each, of its form: sources, modulators, stages, the output;
//   - each module's params, its macros, onto its blocks: a tune in semitones onto a detune in cents; each its hint;
//   - an architecture, of its form: sources into the chain, the chain into one output, modulators into params, a
//     module's among them; the note's sources its macros; refused where it breaks its form, every failure said.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCHITECTURE_FORM, MODULE_TEMPLATES, NOTE_SETTINGS, NOTE_SOURCES, SYNTH_FORMS } from '../index.ts';
import { Planner } from '../../planner/index.ts';
import { isSwitch } from '../../../params/index.ts';
import { paramAt, settingAt } from '../../format/index.ts';
import { PLUCK } from './pluck.js';

const planner = new Planner(MODULE_TEMPLATES, SYNTH_FORMS);

// whether a value is one its spec's control can take: within its range, or one of its choices
function onControl({ range, choices }, value) {
  return choices ? choices.includes(value) : value >= range[0] && value <= range[1];
}
// a planned module's params, its macros by name, each its value
function paramsOf(kind) {
  return Object.fromEntries(planner.plan(kind).node.macros.map(({ spec, value }) => [spec.name, value]));
}

test("the note's sources, as a voice card's CV: its frequency, gate and velocity, its volume, its bend, the per-note controllers; each on a control, starting at its default; by MIDI's names where it has them", () => {
  assert.deepEqual(Object.keys(NOTE_SOURCES), [
    'frequency',
    'gate',
    'velocity',
    'volume',
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
  assert.deepEqual(Object.keys(NOTE_SETTINGS), ['glide', 'shortest', 'longest']);
});

test('the modules, a YAML template each, of its form: the sources, the modulators, the stages, the output; each planned with no failure', () => {
  assert.deepEqual(
    MODULE_TEMPLATES.map(({ kind }) => [kind, planner.plan(kind).node.form]),
    [
      ['VCO', 'source'],
      ['Noise source', 'source'],
      ['LFO', 'modulator'],
      ['FM', 'modulator'],
      ['Envelope generator', 'modulator'],
      ['VCA', 'stage'],
      ['VCF', 'stage'],
      ['Tremolo', 'stage'],
      ['Ring', 'stage'],
      ['Out', 'output'],
    ],
  );
  assert.deepEqual(
    SYNTH_FORMS.map(({ name, inputs, outputs }) => [name, inputs, outputs]),
    [
      ['instrument', [], ['out']],
      ['architecture', [], ['out']],
      ['source', [], ['out']],
      ['modulator', [], ['out']],
      ['stage', ['in'], ['out']],
      ['output', ['in'], ['out']],
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
  assert.deepEqual(ARCHITECTURE_FORM.rules, [{ rule: 'no loops' }, { rule: 'ends in', role: 'out' }]);
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
