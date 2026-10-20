// An instrument playing one patch (mockup/src/libs/build/instrument/instrument.ts), on a stand-in for what's built, its patch
// from the tests' file of instruments (libs/plan/instrument/test/pluck.js):
//   - built from its patch's instrument, by the builder handed in, into where it's told;
//   - its notes played by its voices, each message moved onto what's built's time;
//   - an input of its own, its notes kept apart, each voice into the destination it's given;
//   - its voice cards' own values from outside, set on each voice as it's added;
//   - a patch it plays edited: a value glided on every voice sounding; a setting, built again;
//   - whether it plays a patch, its own or a pad's of its rack; a new tempo told what's built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Instrument } from '../index.ts';
import { BuiltStandIn } from './built.js';
import { noteMessages } from '../../../midi/index.ts';
import { instrumentsOf, patchPlan } from '../../../plan/instrument/index.ts';
import { MODULE_TEMPLATES } from '../../../plan/instrument/content.ts';
import { settingAt } from '../../../plan/format/index.ts';
import { PLUCK_FILE } from '../../../plan/instrument/test/pluck.js';

const INSTRUMENTS = instrumentsOf(PLUCK_FILE, 'pluck.yaml', MODULE_TEMPLATES);

// an instrument of a patch on the stand-in, its builder recording what it's handed
function instrumentOf(patch, { at = (t) => t, cardValues } = {}) {
  const built = new BuiltStandIn();
  const handed = [];
  const builder = {
    build(plan, where) {
      handed.push([plan, where]);
      return built;
    },
  };
  const making = { instruments: INSTRUMENTS, patch, builder, into: 'its way in', now: () => 0, at };
  const instrument = new Instrument({ ...making, ...(cardValues && { cardValues }) });
  return { built, handed, instrument };
}
const played = (instrument, t = 5) => instrument.receive(noteMessages({ pitch: 69, velocity: 1, t }, 1));
// what's told a voice's param, by its address
const toldAt = (built, address) => built.told.filter(([told]) => told === address);

test("built from its patch's instrument, by the builder handed in, into where it's told", () => {
  const { handed, instrument } = instrumentOf('bright');
  assert.equal(instrument.patch, 'bright');
  assert.equal(handed.length, 1);
  const [[plan, where]] = handed;
  assert.deepEqual(plan, patchPlan('bright', INSTRUMENTS));
  assert.deepEqual(where, { into: 'its way in' });
});

test("its notes played by its voices, each message moved onto what's built's time", () => {
  const { built, instrument } = instrumentOf('bright', { at: (t) => t + 100 });
  played(instrument, 5);
  assert.deepEqual(built.added, [['voice/1', 105]]);
});

test('an input of its own: its notes retimed, each voice into its destination; the voices sounding counted', () => {
  const { built, instrument } = instrumentOf('bright', { at: (t) => t + 100 });
  const first = instrument.input(() => 'first way');
  const second = instrument.input(() => 'second way');
  first.receive(noteMessages({ pitch: 69, velocity: 1, t: 5 }, 1));
  second.receive(noteMessages({ pitch: 64, velocity: 1, t: 5 }, 1));
  assert.deepEqual(built.added, [
    ['voice/1', 105, 'first way'],
    ['voice/2', 105, 'second way'],
  ]);
  assert.equal(instrument.sounding, 2);
});

test("its voice cards' own values from outside, set on each voice as it's added", () => {
  const { built, instrument } = instrumentOf('bright', { cardValues: () => ({ 'amp/decay': 0.6 }) });
  played(instrument);
  assert.deepEqual(toldAt(built, 'voice/1/amp/decay'), [['voice/1/amp/decay', 0.6, {}]]);
});

test('a patch it plays edited: a value glided on every voice sounding, and set on each voice from then; a setting changed, built again from it', () => {
  const { built, instrument } = instrumentOf('bright');
  played(instrument);
  const bright = INSTRUMENTS.patches.bright;
  instrument.edited('bright', { ...bright, values: { ...bright.values, 'osc 1/tune': 5 } });
  const [[, value, when]] = toldAt(built, 'voice/1/osc 1/tune');
  assert.equal(value, 5);
  assert.ok(when.glide > 0, 'glided');
  assert.equal(built.rebuilt.length, 0);
  instrument.edited('bright', { ...bright, settings: { 'osc 1/osc/wave': 'square' } });
  assert.equal(built.rebuilt.length, 1);
  assert.equal(settingAt(built.rebuilt[0], ['voice', 'osc 1', 'osc', 'wave']).value, 'square');
});

test("whether it plays a patch: its own, or a pad's of its rack; a new tempo told what's built", () => {
  const { built, instrument } = instrumentOf('kit');
  assert.deepEqual(
    ['kit', 'bright', 'rtlprnf'].map((name) => instrument.plays(name)),
    [true, true, false],
  );
  instrument.tempo(0.5);
  assert.deepEqual(built.tempi, [0.5]);
});
