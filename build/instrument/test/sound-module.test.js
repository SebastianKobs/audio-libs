// A multitimbral sound module (mockup/src/libs/build/instrument/sound-module.ts), on a stand-in for what's built, its bank
// the tests' file of instruments (libs/plan/synth/test/pluck.js):
//   - a part for each track, an instrument playing a patch from its bank by name, built where it's told;
//   - a patch edited in the bank: every part that plays it edited, its own or a pad's of its rack; one made after an
//     edit made as edited;
//   - a new tempo told every part, one unchanged passed over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoundModule } from '../index.ts';
import { BuiltStandIn } from './built.js';
import { noteMessages } from '../../../midi/index.ts';
import { instrumentsOf } from '../../../plan/synth/index.ts';
import { MODULE_TEMPLATES } from '../../../plan/synth/content.ts';
import { LiveCopies } from '../../../util/index.ts';
import { PLUCK_FILE } from '../../../plan/synth/test/pluck.js';

const INSTRUMENTS = instrumentsOf(PLUCK_FILE, 'pluck.yaml', MODULE_TEMPLATES);

// a module on the file's patches, and a part's making: its own stand-in for what's built
function moduleOn() {
  const bank = new LiveCopies(INSTRUMENTS.patches);
  return { bank, module: new SoundModule({ instruments: INSTRUMENTS, bank }) };
}
function making() {
  const built = new BuiltStandIn();
  return { built, where: { builder: { build: () => built }, into: 'in', now: () => 0, at: (t) => t } };
}
const tuned = (tune) => ({ ...INSTRUMENTS.patches.bright, values: { 'osc 1/tune': tune } });

test('a part for each track: an instrument playing a patch from its bank by name', () => {
  const { module } = moduleOn();
  const { built, where } = making();
  const part = module.part('bright', where);
  assert.equal(part.patch, 'bright');
  part.receive(noteMessages({ pitch: 69, velocity: 1, t: 5 }, 1));
  assert.deepEqual(built.added, [['voice/1', 5]]);
});

test('a patch edited in the bank: every part that plays it edited, its own or a pad of its rack; not one that plays another', () => {
  const { bank, module } = moduleOn();
  const parts = ['bright', 'kit', 'rtlprnf'].map((patch) => {
    const { built, where } = making();
    const part = module.part(patch, where);
    part.receive(noteMessages({ pitch: 38, velocity: 1, t: 5 }, 1));
    return built;
  });
  bank.set('bright', tuned(5));
  assert.deepEqual(
    parts.map((built) => built.told.some(([address, value]) => address.endsWith('osc 1/tune') && value === 5)),
    [true, true, false],
  );
});

test('a part made after an edit made as edited; a new tempo told every part, one unchanged passed over', () => {
  const { bank, module } = moduleOn();
  bank.set('bright', tuned(7));
  const { built, where } = making();
  module.part('bright', where).receive(noteMessages({ pitch: 69, velocity: 1, t: 5 }, 1));
  assert.ok(built.told.some(([address, value]) => address === 'voice/1/osc 1/tune' && value === 7));
  module.tempo(0.4);
  module.tempo(0.4);
  module.tempo(0.5);
  assert.deepEqual(built.tempi, [0.4, 0.5]);
});
