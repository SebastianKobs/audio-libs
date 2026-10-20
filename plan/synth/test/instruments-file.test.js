// A file of instruments read (mockup/src/libs/plan/synth/instruments-file.ts), in node, on a small file of the tests' own, its
// instrument the tests' voice card (pluck.js):
//   - each instrument a template of a voice card's form, its name its kind, one mono output, planned as the planner takes it;
//   - each patch a preset, by a name of its own, the instrument it plays its kind; each rack its pads;
//   - refused where it isn't of its shape, every failure said under the file's name; a pad naming no patch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instrumentsOf, SYNTH_FORMS } from '../index.ts';
import { MODULE_TEMPLATES } from '../content.ts';
import { Planner } from '../../planner/index.ts';
import { paramAt } from '../../format/index.ts';
import { PLUCK_CARD as voiceCard, PLUCK_FILE as FILE } from './pluck.js';

test("each instrument a template of a voice card's form, its name its kind, one mono output; each patch a preset by a name of its own, the instrument it plays its kind; each rack its pads", () => {
  const { templates, patches, racks } = instrumentsOf(FILE, 'test.yaml', MODULE_TEMPLATES);
  assert.deepEqual(
    templates.map(({ kind, form, outputs }) => [kind, form, outputs]),
    [['Pluck', 'architecture', [{ name: 'out', channels: 1 }]]],
  );
  assert.deepEqual(patches, {
    bright: { kind: 'Pluck', values: { 'osc 1/tune': 12 } },
    rtlprnf: { kind: 'Pluck', settings: { 'osc 1/osc/wave': 'triangle' } },
  });
  assert.deepEqual(racks, { kit: [{ key: 38, patch: 'bright' }] });
  const plan = new Planner([...MODULE_TEMPLATES, ...templates], SYNTH_FORMS).plan('Pluck', patches.bright);
  assert.equal(paramAt(plan, ['osc 1', 'tune']).value, 12, 'planned as the planner takes it');
});

test("a file refused where it isn't of its shape, every failure said under its name; a pad naming no patch", () => {
  const astray = {
    instruments: { Pluck: { ...voiceCard, children: [{ name: 'osc 1' }] } },
    patches: { bright: { values: { 'osc 1/tune': 12 } } },
  };
  assert.throws(
    () => instrumentsOf(astray, 'astray.yaml', MODULE_TEMPLATES),
    (error) => {
      assert.match(error.message, /^astray\.yaml: not of the shape of instruments:/);
      assert.match(error.message, /patches/);
      return true;
    },
  );
  assert.throws(
    () => instrumentsOf({ ...astray, patches: FILE.patches }, 'astray.yaml', MODULE_TEMPLATES),
    /astray\.yaml: Pluck/,
  );
  assert.throws(
    () => instrumentsOf({ ...FILE, racks: { kit: [{ key: 38, patch: 'dull' }] } }, 'kit.yaml', MODULE_TEMPLATES),
    /kit\.yaml: rack kit: pad 38 plays dull, no patch in it/,
  );
});
