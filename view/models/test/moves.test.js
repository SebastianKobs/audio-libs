// What moves each param, as a mod matrix shows it (mockup/src/libs/view/models/moves.ts), on a voice card of the tests' own:
//   - a macro's maps: each target it moves, by its factor and offset, within its range's ends;
//   - a child wired into a param: a modulator moving it, as CV, its reach its own amount where it has one;
//   - a knob's rings: the range each moves it through, where it lies on its control by its taper;
//   - the matrix: what a composite's own sources move, by their maps and reach;
//   - a composite's children by their roles, a group each, in the order they first come;
//   - a preset on the card through its in: its values over the plan's, its starts, how each is set, what's done handed on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ViewBuilder } from '../index.ts';
import { PresetIn } from '../../control-surface/index.ts';
import { addressText } from '../../../plan/format/index.ts';
import { positionOf } from '../../../params/index.ts';
import { near } from '../../../util/test/near.js';
import { builderOn, CARD } from './card.js';

test("what moves a param: a macro's maps, by their factor and range; a child wired into it, a modulator, its reach its amount; nothing, none", () => {
  const models = builderOn(CARD);
  const movesOf = (address) =>
    models.control(address).moves.map(({ by, kind, reach }) => [addressText(by), kind, reach && addressText(reach)]);
  assert.deepEqual(movesOf(['env', 'decay']), [['decay', 'macro', undefined]]);
  assert.deepEqual(movesOf(['env', 'gate']), [['gate', 'macro', undefined]]);
  assert.deepEqual(movesOf(['vca', 'gain']), [['env', 'modulator', 'env/amount']]);
  assert.deepEqual(movesOf(['osc', 'frequency']), []);
  assert.deepEqual(models.control(['env', 'decay']).moves[0].map, { factor: 1.3, offset: 0, high: 5 });
});

test("a knob's rings: the range each moves it through, on its control by its taper; a macro's its range mapped, held within its map's ends; a modulator's from the knob's value by its reach", () => {
  const models = builderOn(CARD);
  const decay = models.control(['env', 'decay']);
  const [ring] = decay.rings;
  assert.equal(ring.by, 'decay');
  near(ring.from, positionOf(decay.spec, 0.13), 'its macro at its bottom');
  near(ring.to, positionOf(decay.spec, 5), 'at its top, held at its map’s high');
  const gain = models.control(['vca', 'gain']);
  assert.deepEqual(
    gain.rings.map(({ by, from, to }) => [by, from, to]),
    [['env', positionOf(gain.spec, 0), positionOf(gain.spec, 0.5)]],
  );
  assert.deepEqual(models.control(['osc', 'frequency']).rings, []);
});

test("the matrix: every source on a composite by what it moves, as a mod matrix shows it: a macro by its map, a modulator by its reach, a control of its own; none of a child's own", () => {
  const rows = builderOn(CARD).matrix([]);
  assert.deepEqual(
    rows.map(({ source, target, kind }) => [source, target, kind]),
    [
      ['decay', 'env/decay', 'macro'],
      ['gate', 'env/gate', 'macro'],
      ['env', 'vca/gain', 'modulator'],
    ],
  );
  assert.deepEqual(rows[0].map, { factor: 1.3, offset: 0, high: 5 });
  assert.equal(rows[0].amount, undefined, 'a macro: its map says how much');
  assert.deepEqual(rows[2].amount.address, ['env', 'amount'], 'a modulator: its reach, a control of its own');
  assert.deepEqual(builderOn(CARD).matrix(['env']), [], 'a block: none');
});

test("a composite's children by their roles: a group each, in the order they first come, each child a device", () => {
  const groups = builderOn(CARD).groups([]);
  assert.deepEqual(
    groups.map(({ role, devices }) => [role, devices.map(({ name }) => name)]),
    [
      ['source', ['osc']],
      ['modulator', ['env']],
      ['stage', ['vca']],
    ],
  );
  assert.deepEqual(
    groups[1].devices[0].controls.map(({ name }) => name),
    ['decay', 'gate', 'amount'],
  );
});

test("a preset on a plan through its in: each value the preset's, the plan's where it has none; its start as it began; set as its owner says, else by the macro that moves it, else live; what's done handed on", () => {
  const values = { 'env/amount': 0.8, glide: 0.03 };
  const changed = [];
  const models = new ViewBuilder(
    new PresetIn({
      plan: () => CARD,
      values: () => values,
      start: () => ({ 'env/amount': 0.6 }),
      roleOf: (address) => (addressText(address) === 'gate' ? { by: 'automated', source: 'the note' } : undefined),
    }),
    (command) => changed.push(command),
  );
  const amount = models.control(['env', 'amount']);
  assert.deepEqual([amount.value, amount.live], [0.8, true], "the preset's");
  assert.equal(models.control(['osc', 'frequency']).value, 440, "the plan's where it has none");
  assert.deepEqual(models.control(['gate']).role, { by: 'automated', source: 'the note' }, 'as its owner says');
  assert.deepEqual(
    models.control(['env', 'decay']).role,
    { by: 'automated', source: 'decay' },
    'by the macro moving it',
  );
  amount.set(1.25);
  amount.reset();
  models.control(['env', 'decay']).set(2);
  assert.deepEqual(
    changed,
    [
      { type: 'param', address: ['env', 'amount'], value: 1.25 },
      { type: 'param', address: ['env', 'amount'], value: 0.6 },
    ],
    'one a macro moves not live: nothing sent',
  );
});
