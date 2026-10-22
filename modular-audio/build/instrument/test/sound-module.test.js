// A multitimbral sound module (mockup/src/libs/modular-audio/build/instrument/sound-module.ts), on a stand-in for what's built, its bank
// the tests' file of instruments (libs/modular-audio/plan/instrument/test/pluck.js):
//   - a part for each patch, an instrument playing a patch from its bank by name, built where it's told
//     the first time it's asked for, then kept, its voices sounding counted;
//   - a patch edited in the bank: every part that plays it edited, its own or a pad's of its rack; one made after an
//     edit made as edited;
//   - a new tempo told every part, one unchanged passed over;
//   - a param's or a setting's spec in a patch, from its voice card planned by its preset's kind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoundModule } from '../index.ts';
import { BuiltStandIn } from './built.js';
import { noteMessages } from '../../../../midi/protocol/index.ts';
import { instrumentsOf } from '../../../plan/instrument/index.ts';
import { MODULE_TEMPLATES } from '../../../plan/instrument/content.ts';
import { LiveCopies } from '../../../../base/util/index.ts';
import { PLUCK_FILE } from '../../../plan/instrument/test/pluck.js';

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

test("a part for each patch, made the first time it's asked for, then kept: asked again, the same", () => {
  const { module } = moduleOn();
  const { built, where } = making();
  let makings = 0;
  const makingOnce = () => {
    makings += 1;
    return where;
  };
  assert.equal(module.sounding('bright'), 0, 'none made yet');
  const part = module.part('bright', makingOnce);
  assert.equal(part.patch, 'bright');
  assert.equal(module.part('bright', makingOnce), part);
  assert.equal(makings, 1, 'its making asked for once');
  part.receive(noteMessages({ pitch: 69, velocity: 1, t: 0 }, 1)); // at the time now: playing
  assert.deepEqual(built.added, [['voice/1', 0]]);
  assert.equal(module.sounding('bright'), 1);
  assert.equal(module.sounding('kit'), 0, 'a patch with no part made');
});

test('a patch edited in the bank: every part that plays it edited, its own or a pad of its rack; not one that plays another', () => {
  const { bank, module } = moduleOn();
  const parts = ['bright', 'kit', 'rtlprnf'].map((patch) => {
    const { built, where } = making();
    const part = module.part(patch, () => where);
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
  module.part('bright', () => where).receive(noteMessages({ pitch: 69, velocity: 1, t: 5 }, 1));
  assert.ok(built.told.some(([address, value]) => address === 'voice/1/osc 1/tune' && value === 7));
  module.tempo(0.4);
  module.tempo(0.4);
  module.tempo(0.5);
  assert.deepEqual(built.tempi, [0.4, 0.5]);
});

test("a control in a patch, a param or a setting, from its voice card; none for a patch or an address it hasn't", () => {
  const { module } = moduleOn();
  const param = module.controlOf('bright', ['osc 1', 'tune']);
  assert.equal(param.of, 'values');
  assert.equal(param.spec.name, 'tune');
  const setting = module.controlOf('bright', ['osc 1', 'osc', 'wave']);
  assert.equal(setting.of, 'settings');
  assert.deepEqual(setting.spec.choices, ['sine', 'triangle', 'square', 'sawtooth']);
  assert.equal(module.controlOf('bright', ['osc 1', 'nothing']), undefined);
  assert.equal(module.controlOf('nobody', ['osc 1', 'tune']), undefined);
});
