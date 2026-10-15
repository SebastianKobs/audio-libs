// The plan format's unit tests (mockup/src/libs/plan/format):
//   - a plan is data, stored as JSON: its examples read back as they were (test/plans.ts, held to the format by the type check);
//   - a stored plan's version: this format's, or refused, naming what was found;
//   - an address and its text; a node, a param or a setting found by its address;
//   - a macro's value onto its targets; a pool's copies, their names and their wires;
//   - what feeds what over one inside's wires, and the loop check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VERSION,
  addressOf,
  addressText,
  copyOf,
  feeds,
  macroValues,
  mapOnto,
  nodeAt,
  paramAt,
  poolOfCopy,
  reached,
  settingAt,
  under,
  versionOf,
} from '../index.ts';
import { DESK, SYNTH, UTILITY } from './plans.ts';
import { near } from '../../../util/test/near.js';

test('a plan is data, stored as JSON: an effect, an instrument and a desk read back from their JSON as they were, their version read', () => {
  for (const plan of [UTILITY, SYNTH, DESK]) {
    const stored = JSON.parse(JSON.stringify(plan));
    assert.deepEqual(stored, plan);
    assert.equal(versionOf(stored), VERSION);
  }
});

test("a stored plan's version: this format's, 1; one with none, one that isn't a whole number, or a newer one refused, naming what it found", () => {
  assert.equal(VERSION, 1);
  assert.equal(versionOf({ version: 1, node: {} }), 1);
  assert.throws(() => versionOf({ node: {} }), /found none/);
  assert.throws(() => versionOf('a plan'), /found none/, 'no plan at all');
  assert.throws(() => versionOf({ version: '1' }), /found "1"/);
  assert.throws(() => versionOf({ version: 1.5 }), /found 1\.5/);
  assert.throws(() => versionOf({ version: 2 }), /2 is newer than this format's, 1/);
});

test("an address as text, its names joined by slashes, and back; a parent's name put in front; a name with a slash refused", () => {
  assert.equal(addressText(['desk', 'channel 3', 'utility', 'level']), 'desk/channel 3/utility/level');
  assert.deepEqual(addressOf('desk/channel 3/utility/level'), ['desk', 'channel 3', 'utility', 'level']);
  assert.deepEqual(under('desk', ['channel 3', 'utility', 'level']), ['desk', 'channel 3', 'utility', 'level']);
  assert.throws(() => addressText(['send/reverb', 'level']), /send\/reverb/);
  assert.throws(() => under('a/b', ['level']), /a\/b/);
});

test("found by its address from the plan's top: a child's param, a composite's macro, a setting, a node; a pool's copy by its name and number; none where nothing's there", () => {
  assert.equal(paramAt(UTILITY, ['gain', 'gain'])?.value, 1, "a child's param");
  assert.equal(paramAt(UTILITY, ['level'])?.hint, 'How loud it comes out.', "the composite's macro");
  assert.equal(settingAt(UTILITY, ['pan', 'law'])?.value, 'stereo', 'a setting');
  assert.equal(paramAt(UTILITY, ['pan', 'law']), undefined, 'a setting is no param');
  assert.equal(nodeAt(UTILITY, ['pan'])?.kind, 'pan');
  assert.equal(nodeAt(UTILITY, [])?.name, 'utility', 'the top');
  assert.equal(paramAt(SYNTH, ['voice 3', 'oscillator', 'frequency'])?.value, 440, "a pool's third copy");
  assert.equal(paramAt(SYNTH, ['voice', 'oscillator', 'frequency']), undefined, 'no copy without its number');
  assert.equal(paramAt(SYNTH, ['voice 0', 'oscillator', 'frequency']), undefined, 'copies from 1');
  assert.equal(paramAt(UTILITY, ['gain', 'cutoff']), undefined);
  assert.equal(paramAt(UTILITY, ['delay', 'time']), undefined);
});

test("a macro's value onto its targets: each times its factor, held in its range, plus its offset", () => {
  const [level] = UTILITY.node.inside.macros;
  assert.deepEqual(macroValues(level, 0.5), [{ to: ['gain', 'gain'], value: 0.5 }]);
  assert.deepEqual(macroValues(level), [{ to: ['gain', 'gain'], value: 1 }], 'its own value');
  const target = { factor: 0.35, offset: 0.05, low: 0.1, high: 0.3 };
  near(mapOnto(target, 0.5), 0.225, 'within its range: 0.35 × 0.5, plus 0.05');
  near(mapOnto(target, 2), 0.35, 'held at its high, then its offset');
  near(mapOnto(target, 0), 0.15, 'held at its low, then its offset');
  near(mapOnto({ factor: 2, offset: 0 }, -3), -6, 'no range: as it comes');
});

test("a pool's copies: its child under the copy's name, its name and a number from 1; its wires with the copy's name for the pool's; a copy's pool found by its name", () => {
  const [voices] = SYNTH.node.inside.pools;
  const { node, wires } = copyOf(voices, 2);
  assert.equal(node.name, 'voice 2');
  assert.equal(node.inside, voices.child.inside, 'the same inside');
  assert.deepEqual(wires, [{ from: { node: 'voice 2', output: 'out' }, to: { output: 'out' } }]);
  assert.throws(() => copyOf(voices, 0), /from 1/);
  assert.equal(poolOfCopy(SYNTH.node.inside, 'voice 12'), voices);
  assert.equal(poolOfCopy(SYNTH.node.inside, 'voice'), undefined);
  assert.equal(poolOfCopy(SYNTH.node.inside, 'voice 1b'), undefined);
});

test("what feeds what over one inside's wires: each name and what it reaches, by its outputs and its taps, a wire into a param too; the wires a filter lets through; the loop check", () => {
  const desk = DESK.node.inside;
  assert.deepEqual([...reached(desk, ['my tap 1'])], ['my tap 1', 'my playing', 'reverb', 'master']);
  const noTaps = (wire) => !('output' in wire.from) || wire.from.output === 'out';
  assert.deepEqual(
    [...reached(desk, ['my tap 1'], noTaps)],
    ['my tap 1', 'my playing', 'master'],
    'its send turned down',
  );
  assert.deepEqual([...reached(desk, ['reverb'])], ['reverb', 'master']);
  const voice = SYNTH.node.inside.pools[0].child.inside;
  assert.deepEqual([...reached(voice, ['envelope'])], ['envelope', 'vca'], 'into its gain param');
  assert.equal(feeds(desk, 'my tap 1', 'master'), true);
  assert.equal(feeds(desk, 'master', 'my tap 1'), false, 'a wire from the master back would be a loop');
  assert.equal(feeds(desk, 'reverb', 'my playing'), false);
  assert.equal(feeds(desk, 'reverb', 'reverb'), true, 'itself: a wire into it would loop');
});
