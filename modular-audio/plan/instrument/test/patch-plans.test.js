// A patch planned from a file of instruments (modular-audio/plan/instrument/patch-plans.ts), in node, on the tests' file
// (pluck.js):
//   - the planner of its voice cards: the modules' templates and the file's own;
//   - a patch's chains: the patch alone, or its rack's pads, each its key;
//   - a patch's instrument, by its name: a pool of voices of its voice card, or a drum rack, a pool for each pad;
//   - a patch's plan stored as JSON and read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardPlanner, chainsOf, instrumentsOf, patchPlan } from '../index.ts';
import { MODULE_TEMPLATES } from '../content.ts';
import { paramAt, settingAt, VERSION, versionOf } from '../../format/index.ts';
import { PLUCK_FILE } from './pluck.js';

const INSTRUMENTS = instrumentsOf(PLUCK_FILE, 'pluck.yaml', MODULE_TEMPLATES);

test("the planner of a file's voice cards: a patch's voice card planned at its preset, on the modules' and the file's templates", () => {
  const { kind, values, settings } = INSTRUMENTS.patches.rtlprnf;
  const plan = cardPlanner(INSTRUMENTS).plan(kind, { values: { ...values, 'osc 1/tune': 7 }, settings });
  assert.equal(plan.node.kind, 'Pluck');
  assert.equal(paramAt(plan, ['osc 1', 'tune']).value, 7);
  assert.equal(settingAt(plan, ['osc 1', 'osc', 'wave']).value, 'triangle');
});

test("a patch's chains: the patch alone; a rack's pads, each its key and its patch", () => {
  assert.deepEqual(chainsOf(INSTRUMENTS, 'bright'), [{ patch: INSTRUMENTS.patches.bright }]);
  assert.deepEqual(chainsOf(INSTRUMENTS, 'kit'), [{ key: 38, patch: INSTRUMENTS.patches.bright }]);
});

test("a patch's instrument by its name: a pool of voices of its voice card; a rack's, a pool for each pad, played by its key", () => {
  const bright = patchPlan('bright', INSTRUMENTS);
  assert.equal(bright.node.form, 'instrument');
  assert.deepEqual(
    bright.node.pools.map(({ key, child }) => [key, child.kind]),
    [[undefined, 'Pluck']],
  );
  assert.equal(paramAt(bright, ['voice', 'osc 1', 'tune']).value, 12, "the patch's preset");
  const kit = patchPlan('kit', INSTRUMENTS);
  assert.deepEqual(
    kit.node.pools.map(({ key }) => key),
    [38],
  );
});

test("a patch's plan is data, stored as JSON: read back from its JSON as it was, its version read", () => {
  const plan = patchPlan('bright', INSTRUMENTS);
  const stored = JSON.parse(JSON.stringify(plan));
  assert.deepEqual(stored, plan);
  assert.equal(versionOf(stored), VERSION);
});
