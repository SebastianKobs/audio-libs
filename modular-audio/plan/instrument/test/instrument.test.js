// An instrument, a preset's changes and a live bank (mockup/src/libs/modular-audio/plan/instrument), in node, on the tests' voice card (pluck.js):
//   - an instrument of one patch: a pool of voices, each a copy of its voice card, the patch's preset on its
//     architecture; the note's addresses its sources' macros; of the instrument's form;
//   - a drum rack: a pool for each pad, played by its key, each its own patch;
//   - refused: two chains with no key, a key twice, an architecture not handed in;
//   - a preset changed: each value and setting that differs, by its address, one let go back to its start;
//   - a preset edited as a message says; a live bank: its patches as they play, edited or reset as the app's messages ask.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changesFrom, edited, instrumentOf, LiveBank, SYNTH_FORMS } from '../index.ts';
import { MODULE_TEMPLATES } from '../content.ts';
import { Planner } from '../../planner/index.ts';
import { paramAt, settingAt } from '../../format/index.ts';
import { PLUCK } from './pluck.js';

// a patch on the pluck: an octave up, a longer decay, a triangle
const BRIGHT = {
  kind: 'Pluck',
  values: { 'osc 1/tune': 12, 'amp/decay': 0.8 },
  settings: { 'osc 1/osc/wave': 'triangle' },
};
// the pluck's voice card and an instrument on it, planned
function planned(instrument) {
  return new Planner([...MODULE_TEMPLATES, PLUCK, instrument], SYNTH_FORMS).plan(instrument.kind);
}

test("an instrument of one patch: a pool of voices, each a copy of its voice card, the patch's preset on its architecture; the note's addresses its sources' macros; of the instrument's form", () => {
  const plan = planned(instrumentOf('Bright pluck', [{ patch: BRIGHT }], [PLUCK]));
  assert.equal(plan.node.form, 'instrument');
  const [pool] = plan.node.pools;
  assert.deepEqual(
    [pool.child.name, pool.child.kind, pool.child.role, pool.key],
    ['voice', 'Pluck', 'voice', undefined],
  );
  assert.deepEqual(pool.wires, [{ from: { node: 'voice', output: 'out' }, to: { output: 'out' } }]);
  assert.deepEqual(pool.note, { frequency: [['frequency']], gate: [['gate']], velocity: [['velocity']] });
  assert.deepEqual(
    [
      paramAt(plan, ['voice', 'osc 1', 'tune']).value,
      paramAt(plan, ['voice', 'amp', 'decay']).value,
      settingAt(plan, ['voice', 'osc 1', 'osc', 'wave']).value,
    ],
    [12, 0.8, 'triangle'],
  );
  assert.equal(paramAt(plan, ['voice', '3', 'osc 1', 'tune']).value, 12, 'a copy, its voice card');
});

test("an instrument's output stereo, as a panned voice is; the note's pan its card's pan macro, where the card has one", () => {
  const panned = {
    ...PLUCK,
    macros: [...PLUCK.macros, { name: 'pan', maps: [{ to: ['out', 'pan'], factor: 1, offset: 0 }] }],
  };
  const template = instrumentOf('Panned pluck', [{ patch: BRIGHT }], [panned]);
  assert.deepEqual(template.outputs, [{ name: 'out', channels: 2 }]);
  assert.deepEqual(template.pools[0].note.pan, [['pan']]);
  assert.equal(
    instrumentOf('Bright pluck', [{ patch: BRIGHT }], [PLUCK]).pools[0].note.pan,
    undefined,
    'none: no macro',
  );
});

test('a drum rack: a pool for each pad, played by its key, each its own patch', () => {
  const tap = { kind: 'Pluck', values: { 'amp/decay': 0.2 } };
  const plan = planned(
    instrumentOf(
      'Brushes',
      [
        { patch: tap, key: 38 },
        { patch: BRIGHT, key: 40 },
      ],
      [PLUCK],
    ),
  );
  assert.deepEqual(
    plan.node.pools.map(({ child, key }) => [child.name, key]),
    [
      ['pad 38', 38],
      ['pad 40', 40],
    ],
  );
  assert.deepEqual(
    [paramAt(plan, ['pad 38', 'amp', 'decay']).value, paramAt(plan, ['pad 40', 'amp', 'decay']).value],
    [0.2, 0.8],
  );
});

test('an instrument refused: two chains with no key, a key twice, an architecture not handed in', () => {
  assert.throws(
    () => instrumentOf('Two', [{ patch: BRIGHT }, { patch: BRIGHT }], [PLUCK]),
    /Two: a rack's chains each its key/,
  );
  assert.throws(
    () =>
      instrumentOf(
        'Twice',
        [
          { patch: BRIGHT, key: 38 },
          { patch: BRIGHT, key: 38 },
        ],
        [PLUCK],
      ),
    /Twice: key 38 twice/,
  );
  assert.throws(() => instrumentOf('Lost', [{ patch: { kind: 'Pad' } }], [PLUCK]), /Lost: no architecture Pad/);
});

test("a preset changed: each value and setting that differs, by its address; one it lets go back to its architecture's start; another architecture refused", () => {
  const pluck = new Planner([...MODULE_TEMPLATES, PLUCK], SYNTH_FORMS).plan('Pluck');
  const softer = { kind: 'Pluck', values: { 'osc 1/tune': 12, 'amp/sustain': 0.5 } };
  assert.deepEqual(changesFrom(BRIGHT, softer, pluck), {
    values: { 'amp/decay': 0.4, 'amp/sustain': 0.5 },
    settings: { 'osc 1/osc/wave': 'sine' },
  });
  assert.deepEqual(changesFrom(BRIGHT, BRIGHT, pluck), { values: {}, settings: {} }, 'nothing');
  assert.throws(
    () => changesFrom(BRIGHT, { kind: 'Pad' }, pluck),
    /another architecture, Pad for Pluck: another instrument/,
  );
});

test("a preset edited, as a message says: a value or a setting by its address, the rest as it was, the preset handed in left alone; a live bank: its patches as they play, edited as the app's message asks, reset to its start; each told", () => {
  const edit = (address, value, of) => ({ type: 'preset edited', patch: 'bright', of, address, value });
  assert.deepEqual(edited(BRIGHT, edit(['osc 1', 'tune'], 7, 'values')), {
    kind: 'Pluck',
    values: { 'osc 1/tune': 7, 'amp/decay': 0.8 },
    settings: { 'osc 1/osc/wave': 'triangle' },
  });
  assert.deepEqual(edited({ kind: 'Pluck' }, edit(['osc 1', 'osc', 'wave'], 'square', 'settings')), {
    kind: 'Pluck',
    settings: { 'osc 1/osc/wave': 'square' },
  });
  assert.equal(BRIGHT.values['osc 1/tune'], 12, 'left alone');
  const bank = new LiveBank({ bright: BRIGHT });
  const told = [];
  bank.onSet((name, preset) => told.push([name, preset.values['osc 1/tune']]));
  bank.edit(edit(['osc 1', 'tune'], 7, 'values'));
  bank.edit(edit(['osc 1', 'osc', 'wave'], 'square', 'settings'));
  assert.equal(bank.current('bright').values['osc 1/tune'], 7);
  assert.equal(bank.current('bright').settings['osc 1/osc/wave'], 'square');
  bank.edit({ type: 'preset reset', patch: 'bright' });
  assert.deepEqual(bank.current('bright'), BRIGHT);
  assert.deepEqual(told, [
    ['bright', 7],
    ['bright', 7],
    ['bright', 12],
  ]);
});
