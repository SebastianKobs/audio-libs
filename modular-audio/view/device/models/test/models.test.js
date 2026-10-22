// The view models (mockup/src/libs/modular-audio/view/device/models), in node, on a plan's readout of the tests' own:
//   - a composite as a device: its macros as knobs, in its template's order, then its settings within;
//     a block as a device, its params; none where nothing's there;
//   - a knob: its value as it plays, where it lies on its control by its taper, its text in its unit;
//     turned, set or reset, a command by its address; one not live sends nothing;
//   - a choice: its options and its value; chosen or reset, a command, a setting's a rebuild;
//   - a view of its own registered for a kind, where a view is more than its params.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CustomViews, ViewBuilder } from '../index.ts';
import { paramAt, settingAt } from '../../../../plan/format/index.ts';
import { addressText } from '../../../../../base/util/index.ts';
import { UTILITY } from '../../../../plan/format/test/plans.ts';
import { positionOf } from '../../../../../base/params/index.ts';
import { near } from '../../../../../base/util/test/near.js';

// a delay's own: a switch, a choice and a ms as macros; its line's longest time a setting
const DELAY = {
  version: 1,
  node: {
    name: 'delay',
    kind: 'Delay',
    inputs: [],
    outputs: [],
    params: [],
    settings: [],
    children: [
      {
        name: 'line',
        kind: 'delay',
        inputs: [],
        outputs: [],
        params: [],
        settings: [{ spec: { name: 'longest', unit: 's', range: [0.1, 10, 0.1] }, value: 4 }],
      },
    ],
    wires: [],
    macros: [
      { spec: { name: 'sync', range: [0, 1, 1] }, value: 1, maps: [] },
      { spec: { name: 'note', choices: ['1/8', '1/4'] }, value: '1/8', maps: [] },
      { spec: { name: 'ms', unit: 'ms', range: [1, 2000, 1], taper: 'octaves' }, value: 250, maps: [] },
    ],
    pools: [],
  },
};

// A view builder on a plan's readout of the tests' own: values told by address, roles by address, every
// one live unless said; what's sent kept.
function builderOn(plan, { values = {}, roles = {}, slots = {} } = {}) {
  const sent = [];
  const planReadout = {
    plan,
    valueOf: (address) => values[addressText(address)],
    startOf: (address) => (paramAt(plan, address) ?? settingAt(plan, address))?.value,
    roleOf: (address) => roles[addressText(address)] ?? { by: 'live' },
    peakOf: () => 0,
    readingOf: () => 0,
    copiesOf: () => [],
    slotOf: (address) => slots[addressText(address)],
  };
  return { views: new ViewBuilder(planReadout, (command) => sent.push(command)), sent };
}

test("a composite as a device: its name and kind, its macros as knobs in its template's order, then its settings within, each by its address; its words the template's", () => {
  const device = builderOn(UTILITY).views.device([]);
  assert.deepEqual([device.name, device.kind, device.address], ['utility', 'Utility', []]);
  assert.deepEqual(
    device.controls.map(({ address, kind }) => [addressText(address), kind]),
    [
      ['level', 'param'],
      ['pan', 'param'],
      ['pan/law', 'setting'],
    ],
  );
  assert.deepEqual(
    device.controls.map(({ name, hint }) => [name, hint]),
    [
      ['level', 'How loud it comes out.'],
      ['pan', undefined],
      ['law', undefined],
    ],
  );
});

test("a device's label, its node's, else its kind; what it does in its slot and what sets it there, the tool's; none where the tool says nothing", () => {
  const labelled = { ...UTILITY, node: { ...UTILITY.node, label: 'level and pan' } };
  const slots = { '': { job: 'the level the desk gives it' }, gain: { job: 'its gain', setBy: 'distance' } };
  const { views } = builderOn(labelled, { slots });
  assert.deepEqual([views.device([]).label, views.device(['gain']).label], ['level and pan', 'gain']);
  assert.deepEqual(views.device([]).slot, { job: 'the level the desk gives it' });
  assert.deepEqual(views.device(['gain']).slot, { job: 'its gain', setBy: 'distance' });
  assert.equal(builderOn(UTILITY).views.device([]).slot, undefined);
});

test("a composite's own setting among its controls, the child's it stands for left out", () => {
  const length = { name: 'length', unit: 's', range: [0.2, 8, 0.1] };
  const room = {
    name: 'room',
    kind: 'reverb',
    inputs: [],
    outputs: [],
    params: [],
    settings: [{ spec: length, value: 3 }],
  };
  const reverb = {
    version: 1,
    node: {
      ...room,
      name: 'reverb',
      kind: 'Reverb',
      settings: [{ spec: length, value: 3, to: ['room', 'length'] }],
      children: [room],
      wires: [],
      macros: [],
      pools: [],
    },
  };
  assert.deepEqual(
    builderOn(reverb)
      .views.device([])
      .controls.map(({ address }) => addressText(address)),
    ['length'],
  );
});

test("a block as a device, its params as knobs; a device under its parent's address; none where nothing's there", () => {
  const { views } = builderOn(UTILITY);
  assert.deepEqual(
    views.device(['gain']).controls.map(({ address }) => address),
    [['gain', 'gain']],
  );
  assert.equal(views.device(['nowhere']), undefined);
  assert.equal(views.control(['gain', 'nowhere']), undefined);
});

test("a knob: its value as it plays, the plan's where none's told; where it lies on its control by its taper; its text, a gain in dB, a pan by its side, any other to its step in its unit", () => {
  const { views } = builderOn(DELAY, { values: { level: 0.5, pan: -0.25, ms: 375 } });
  const utility = builderOn(UTILITY, { values: { level: 0.5, pan: -0.25 } }).views;
  const level = utility.control(['level']);
  assert.equal(level.value, 0.5);
  near(level.position, positionOf(level.spec, 0.5), 'by the fader law');
  assert.deepEqual([level.text, level.unit], ['-6.0', 'dB']);
  assert.equal(utility.control(['pan']).text, 'L13');
  const ms = views.control(['ms']);
  assert.deepEqual([ms.value, ms.text, ms.unit], [375, '375', 'ms']);
  assert.equal(builderOn(UTILITY).views.control(['level']).value, 1, "the plan's where none's told");
  const texts = (values) => values.map((value) => builderOn(UTILITY, { values: value }).views.control(['level']).text);
  assert.deepEqual(texts([{ level: 0 }, { level: 1 }, { level: 2 }]), ['-∞', '0.0', '+6.0']);
  const pans = [0, 0.5].map((pan) => builderOn(UTILITY, { values: { pan } }).views.control(['pan']).text);
  assert.deepEqual(pans, ['C', 'R25']);
  assert.deepEqual([utility.control(['pan']).isPan, level.isPan], [true, false], 'a pan drawn from its middle');
});

test('a knob turned: a command by its address, its value at that place by its taper, a gain to a hundredth, any other to its step; set; back to its start', () => {
  const { views, sent } = builderOn(UTILITY, { values: { level: 0.3 } });
  const level = views.control(['level']);
  level.turnTo(positionOf(level.spec, 0.5371));
  level.set(0.7);
  level.reset();
  views.control(['pan']).turnTo(0.75);
  assert.deepEqual(sent, [
    { type: 'param', address: ['level'], value: 0.54 },
    { type: 'param', address: ['level'], value: 0.7 },
    { type: 'param', address: ['level'], value: 1 },
    { type: 'param', address: ['pan'], value: 0.5 },
  ]);
});

test('a knob not live, set by what its track plays or fixed as built: its role and what sets it said; turned, nothing sent; a switch toggled', () => {
  const roles = { level: { by: 'automated', source: 'distance' } };
  const { views, sent } = builderOn(UTILITY, { roles });
  const level = views.control(['level']);
  assert.deepEqual([level.live, level.role], [false, { by: 'automated', source: 'distance' }]);
  level.turnTo(0.2);
  level.reset();
  assert.deepEqual(sent, []);
  const delay = builderOn(DELAY, { values: { sync: 1 } });
  const sync = delay.views.control(['sync']);
  assert.equal(sync.isSwitch, true);
  sync.toggle();
  assert.deepEqual(delay.sent, [{ type: 'param', address: ['sync'], value: 0 }]);
});

test("a choice: its options, its value as it plays; chosen, a command, a param's set as it plays, a setting's a rebuild; back to its start", () => {
  const { views, sent } = builderOn(DELAY, { values: { note: '1/4' } });
  const note = views.control(['note']);
  assert.deepEqual([note.options, note.value, note.kind], [['1/8', '1/4'], '1/4', 'param']);
  note.choose('1/8');
  note.reset();
  const law = builderOn(UTILITY);
  law.views.control(['pan', 'law']).choose('pan pot');
  assert.deepEqual(sent, [
    { type: 'param', address: ['note'], value: '1/8' },
    { type: 'param', address: ['note'], value: '1/8' },
  ]);
  assert.deepEqual(law.sent, [{ type: 'setting', address: ['pan', 'law'], value: 'pan pot' }]);
  assert.throws(() => note.choose('1/2'), /note: no choice 1\/2/);
});

test('a setting with a range a knob: turned, a command to rebuild with it', () => {
  const { views, sent } = builderOn(DELAY);
  const longest = views.device([]).controls.at(-1);
  assert.deepEqual([addressText(longest.address), longest.kind, longest.value], ['line/longest', 'setting', 4]);
  longest.set(2);
  assert.deepEqual(sent, [{ type: 'setting', address: ['line', 'longest'], value: 2 }]);
});

test("a view of its own, registered for a kind, where a view is more than its params: a block's or a composite's; none for another", () => {
  const custom = new CustomViews();
  custom.register('Limiter', 'its history');
  custom.register('gain', 'a meter');
  assert.equal(custom.of({ kind: 'Limiter' }), 'its history');
  assert.equal(custom.of(UTILITY.node.children[0]), 'a meter');
  assert.equal(custom.of(UTILITY.node), undefined);
  assert.throws(() => custom.register('gain', 'another'), /gain: a view's registered already/);
});

test("a knob set from what's typed, read as its text shows it: a gain in dB, -∞ silence; a pan by its side; any other a number; anything else passed by", () => {
  const sent = [];
  const plan = {
    version: 1,
    node: {
      name: 'strip',
      kind: 'Strip',
      inputs: [],
      outputs: [],
      params: [
        { spec: { name: 'gain', range: [0, 2, 0.001], dB: true }, value: 1 },
        { spec: { name: 'pan', range: [-1, 1, 0.01] }, value: 0 },
        { spec: { name: 'cutoff', unit: 'Hz', range: [20, 20000, 1] }, value: 1000 },
      ],
      settings: [],
    },
  };
  const models = new ViewBuilder(
    {
      plan,
      valueOf: () => undefined,
      startOf: () => undefined,
      roleOf: () => ({ by: 'live' }),
      peakOf: () => 0,
      readingOf: () => 0,
      copiesOf: () => [],
      slotOf: () => undefined,
    },
    (command) => sent.push(command.value),
  );
  const typed = (name, text) => models.control([name]).setText(text);
  assert.deepEqual(
    [typed('gain', '-6'), typed('gain', '-∞'), typed('pan', 'L20'), typed('pan', 'C'), typed('pan', 'R50')],
    [true, true, true, true, true],
  );
  assert.deepEqual([typed('cutoff', ' 440 '), typed('cutoff', 'loud')], [true, false], 'a word passed by');
  near(sent[0], 0.5, 'a gain at −6 dB, to its hundredth', 0.002);
  assert.deepEqual(sent.slice(1), [0, -0.4, 0, 1, 440]);
});
