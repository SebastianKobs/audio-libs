// The plan format's unit tests (modular-audio/plan/format):
//   - a stored plan's version: this format's, or refused, naming what was found;
//   - a node, a param or a setting found by its address;
//   - a macro's value onto its targets; a pool's copies, their names and their wires;
//   - an address split at the child it's in, a copy among them;
//   - what feeds what over one inside's wires, and the loop check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  copyOf,
  feeds,
  macroIn,
  macroValues,
  mapOnto,
  nodeAt,
  nodeIn,
  paramAt,
  paramIn,
  poolNamed,
  reached,
  settingAt,
  splitAtChild,
  versionOf,
  wayOut,
  withCopies,
  withSettings,
} from '../index.ts';
import { DESK, ROOM, SYNTH, UTILITY } from './plans.ts';
import { near } from '../../../../base/util/test/near.js';

test("a stored plan's version: this format's, 1; one with none, one that isn't a whole number, or a newer one refused, naming what it found", () => {
  assert.equal(versionOf({ version: 1, node: {} }), 1);
  assert.throws(() => versionOf({ node: {} }), /found none/);
  assert.throws(() => versionOf('a plan'), /found none/, 'no plan at all');
  assert.throws(() => versionOf({ version: '1' }), /found "1"/);
  assert.throws(() => versionOf({ version: 1.5 }), /found 1\.5/);
  assert.throws(() => versionOf({ version: 2 }), /2 is newer than this format's, 1/);
});

test("found by its address from the plan's top: a child's param, a composite's macro, a setting, a node; a pool's child by the pool's name, a copy under it by its number; none where nothing's there", () => {
  assert.equal(paramAt(UTILITY, ['gain', 'gain'])?.value, 1, "a child's param");
  assert.equal(paramAt(UTILITY, ['level'])?.hint, 'How loud it comes out.', "the composite's macro");
  assert.equal(settingAt(UTILITY, ['pan', 'law'])?.value, 'stereo', 'a setting');
  assert.equal(paramAt(UTILITY, ['pan', 'law']), undefined, 'a setting is no param');
  assert.equal(nodeAt(UTILITY, ['pan'])?.kind, 'pan');
  assert.equal(nodeAt(UTILITY, [])?.name, 'utility', 'the top');
  assert.equal(
    paramAt(SYNTH, ['voice', 'oscillator', 'frequency'])?.value,
    440,
    "the pool's child, by the pool's name",
  );
  assert.equal(paramAt(SYNTH, ['voice', '3', 'oscillator', 'frequency'])?.value, 440, "a pool's third copy, under it");
  assert.equal(nodeAt(SYNTH, ['voice', '3'])?.name, '3', 'a copy named by its number');
  assert.equal(paramAt(SYNTH, ['voice 3', 'oscillator', 'frequency']), undefined, 'no copy by a joined name');
  assert.equal(paramAt(SYNTH, ['voice', '0', 'oscillator', 'frequency']), undefined, 'copies from 1');
  assert.equal(paramAt(SYNTH, ['voice', '03', 'oscillator', 'frequency']), undefined, 'a number with no leading 0');
  assert.equal(paramAt(UTILITY, ['gain', 'cutoff']), undefined);
  assert.equal(paramAt(UTILITY, ['delay', 'time']), undefined);
});

test("found from a node by an address within it, as from a plan's top: a node, a param, a composite's macro alone", () => {
  assert.equal(nodeIn(UTILITY.node, ['pan'])?.kind, 'pan');
  assert.equal(paramIn(UTILITY.node, ['gain', 'gain'])?.value, 1);
  assert.equal(macroIn(UTILITY.node, ['level'])?.hint, 'How loud it comes out.');
  assert.equal(macroIn(UTILITY.node, ['gain', 'gain']), undefined, "a block's param is no macro");
});

test("a macro's value onto its targets: each times its factor, held in its range, plus its offset", () => {
  const [level] = UTILITY.node.macros;
  assert.deepEqual(macroValues(level, 0.5), [{ to: ['gain', 'gain'], value: 0.5 }]);
  assert.deepEqual(macroValues(level), [{ to: ['gain', 'gain'], value: 1 }], 'its own value');
  const target = { factor: 0.35, offset: 0.05, low: 0.1, high: 0.3 };
  near(mapOnto(target, 0.5), 0.225, 'within its range: 0.35 × 0.5, plus 0.05');
  near(mapOnto(target, 2), 0.35, 'held at its high, then its offset');
  near(mapOnto(target, 0), 0.15, 'held at its low, then its offset');
  near(mapOnto({ factor: 2, offset: 0 }, -3), -6, 'no range: as it comes');
});

test("a pool's copies: its child named by the copy's number, from 1; its wires with the copy's address for the pool's name; a pool found by its name", () => {
  const [voices] = SYNTH.node.pools;
  const { node, wires } = copyOf(voices, 2);
  assert.equal(node.name, '2', 'named by its number, under its pool');
  assert.equal(node.children, voices.child.children, 'the same children');
  assert.deepEqual(wires, [{ from: { node: 'voice/2', output: 'out' }, to: { output: 'out' } }], 'by its address');
  assert.throws(() => copyOf(voices, 0), /from 1/);
  assert.equal(poolNamed(SYNTH.node, 'voice'), voices);
  assert.equal(poolNamed(SYNTH.node, 'voice 12'), undefined, 'no number split off a name');
});

test("a composite with copies added: each a child named by its address, as its wires name it, wired by its pool's rule, after its own; a copy of no pool refused", () => {
  const { children, wires } = withCopies(SYNTH.node, [
    ['voice', '2'],
    ['voice', '1'],
  ]);
  const own = SYNTH.node.children.map(({ name }) => name);
  assert.deepEqual(
    children.map(({ name }) => name),
    [...own, 'voice/2', 'voice/1'],
  );
  assert.deepEqual(wires.slice(SYNTH.node.wires.length), [
    { from: { node: 'voice/2', output: 'out' }, to: { output: 'out' } },
    { from: { node: 'voice/1', output: 'out' }, to: { output: 'out' } },
  ]);
  assert.throws(() => withCopies(SYNTH.node, [['nowhere', '1']]), /no pool nowhere/);
});

test("an address split at the child it's in under the top: a child by its name, a copy by its pool's name and its number, a pool's child by the pool's name; the rest within it", () => {
  assert.deepEqual(splitAtChild(['reverb', 'utility', 'level']), { child: ['reverb'], within: ['utility', 'level'] });
  assert.deepEqual(
    splitAtChild(['my tap', '3', 'air', 'cutoff']),
    { child: ['my tap', '3'], within: ['air', 'cutoff'] },
    'a copy: a number alone is never a written name',
  );
  assert.deepEqual(splitAtChild(['my tap', 'air', 'cutoff']), { child: ['my tap'], within: ['air', 'cutoff'] });
  assert.deepEqual(splitAtChild(['my tap', '3']), { child: ['my tap', '3'], within: [] });
  assert.deepEqual(splitAtChild(['master']), { child: ['master'], within: [] });
  assert.deepEqual(splitAtChild([]), { child: [], within: [] });
});

test("what feeds what over one composite's wires: each name and what it reaches, by its outputs and its taps, a wire into a param too; the wires a filter lets through; the loop check", () => {
  const desk = DESK.node;
  assert.deepEqual([...reached(desk, ['my tap 1'])], ['my tap 1', 'my playing', 'reverb', 'master']);
  const noTaps = (wire) => !('output' in wire.from) || wire.from.output === 'out';
  assert.deepEqual(
    [...reached(desk, ['my tap 1'], noTaps)],
    ['my tap 1', 'my playing', 'master'],
    'its send turned down',
  );
  assert.deepEqual([...reached(desk, ['reverb'])], ['reverb', 'master']);
  const voice = SYNTH.node.pools[0].child;
  assert.deepEqual([...reached(voice, ['envelope'])], ['envelope', 'vca'], 'into its gain param');
  assert.equal(feeds(desk, 'my tap 1', 'master'), true);
  assert.equal(feeds(desk, 'master', 'my tap 1'), false, 'a wire from the master back would be a loop');
  assert.equal(feeds(desk, 'reverb', 'my playing'), false);
  assert.equal(feeds(desk, 'reverb', 'reverb'), true, 'itself: a wire into it would loop');
});

test("where a node's way out goes, over one composite's wires: the node its main output feeds; none where it goes out of the composite, or has no way out", () => {
  const { wires } = DESK.node;
  const [out, tap] = wires;
  assert.equal(wayOut([tap, out], 'my tap 1'), 'my playing', 'its main output, not its tap');
  assert.equal(wayOut(wires, 'master'), undefined, "out of the desk's own output");
  assert.equal(wayOut(wires, 'nowhere'), undefined);
  assert.equal(wayOut(SYNTH.node.pools[0].wires, 'voice'), undefined, "a pool's rule into the instrument's output");
});

test("a plan's settings changed by address, a new plan, the old as it was: a child's, a pool's child's by the pool's name, every copy's; a copy's, or a setting not there, refused", () => {
  const changed = withSettings(UTILITY, { 'pan/law': 'pan pot' });
  assert.equal(settingAt(changed, ['pan', 'law']).value, 'pan pot');
  assert.equal(settingAt(UTILITY, ['pan', 'law']).value, 'stereo', 'the old as it was');
  assert.equal(paramAt(changed, ['gain', 'gain']).value, 1, 'the rest as it was');
  const waved = withSettings(SYNTH, { 'voice/oscillator/wave': 'square' });
  assert.equal(settingAt(waved, ['voice', 'oscillator', 'wave']).value, 'square', "the pool's child");
  assert.equal(settingAt(waved, ['voice', '1', 'oscillator', 'wave']).value, 'square', 'every copy built from it');
  assert.throws(() => withSettings(SYNTH, { 'voice/2/oscillator/wave': 'square' }), /a copy's settings are its pool's/);
  assert.throws(() => withSettings(UTILITY, { 'gain/law': 'x' }), /gain\/law: no setting/);
});

test("a composite's own setting changed by its address: it and the child's it stands for, together", () => {
  const longer = withSettings(ROOM, { length: 5 });
  assert.deepEqual([settingAt(longer, ['length']).value, settingAt(longer, ['room', 'length']).value], [5, 5]);
});
