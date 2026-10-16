// A pool's copies on what's built (mockup/src/libs/build/web-audio), on the stand-in for Web Audio:
//   - a copy added by its pool's address and its number, built from the pool's child, wired by its rule, set by its own address;
//   - let go: its sources stopped, its nodes disconnected, its address no longer set;
//   - a composite holding a pool a node at each of its own jacks, where copies come and go;
//   - a copy added twice, a pool not there, a copy not added refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into, outOf } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { BLOCKS } from '../../../plan/blocks/index.ts';
import { SYNTH } from '../../../plan/format/test/plans.ts';

// what's built of a plan on a stand-in context, from a source where it has an input; the context's nodes by their kind
function built(plan, now = 4) {
  const context = new StandInContext(() => now);
  const source = context.createGain();
  const what = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5 }).build(plan, {
    into: context.destination,
    from: { in: source },
  });
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind && node !== source);
  return { context, source, what, made };
}
// a gain block, as a plan has it
function gainBlock(name) {
  const { params } = BLOCKS.gain;
  return {
    name,
    kind: 'gain',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    params: params.map((spec) => ({ spec, value: spec.default })),
    settings: [],
  };
}
// a desk: its own input into a pool of channels, each into its bus, the bus into the master, the master out
const DESK = {
  version: 1,
  node: {
    name: 'desk',
    kind: 'Desk',
    inputs: [{ name: 'in', channels: 2 }],
    outputs: [{ name: 'out', channels: 2 }],
    params: [],
    settings: [],
    children: [gainBlock('bus'), gainBlock('master')],
    wires: [
      { from: { node: 'bus', output: 'out' }, to: { node: 'master', input: 'in' } },
      { from: { node: 'master', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [],
    pools: [
      {
        child: gainBlock('replay'),
        wires: [
          { from: { input: 'in' }, to: { node: 'replay', input: 'in' } },
          { from: { node: 'replay', output: 'out' }, to: { node: 'bus', input: 'in' } },
        ],
      },
    ],
  },
};

test("a voice added from an instrument's pool: built from its voice card, into the instrument's output, a node there where voices come and go; set by its own address", () => {
  const { context, what, made } = built(SYNTH);
  assert.equal(made('oscillator').length, 0, 'no voice until one is added');
  what.add(['voice', '1']);
  const [out] = into(context, context.destination);
  const [vca] = made('gain').filter((node) => node !== out && outOf(context, node).includes(out));
  assert.ok(vca, "its gain into the instrument's output");
  what.add(['voice', '2']);
  const [first, second] = made('oscillator');
  what.set(['voice', '1', 'oscillator', 'frequency'], 330);
  assert.deepEqual(
    [first.frequency.events.at(-1), second.frequency.events.at(-1)],
    [
      ['set', 330, 4],
      ['value', 440],
    ],
    'voice 1 alone',
  );
  assert.deepEqual(
    what.placeholders,
    [
      ['voice', '1', 'envelope'],
      ['voice', '2', 'envelope'],
    ],
    'its placeholders by their own addresses',
  );
});

test('a voice let go: its oscillator stopped, its nodes disconnected, its placeholders gone, its address no longer set; the other kept', () => {
  const { context, what, made } = built(SYNTH);
  what.add(['voice', '1']);
  what.add(['voice', '2']);
  const [first, second] = made('oscillator');
  const before = context.rec.nodes.length;
  what.letGo(['voice', '1']);
  assert.equal(first.stops.length, 1);
  assert.equal(second.stops.length, 0);
  assert.ok(context.rec.disconnects.includes(first));
  assert.equal(context.rec.nodes.length, before, 'nothing made');
  assert.deepEqual(what.placeholders, [['voice', '2', 'envelope']]);
  assert.throws(
    () => what.set(['voice', '1', 'oscillator', 'frequency'], 1),
    /voice\/1\/oscillator\/frequency: not built/,
  );
  what.set(['voice', '2', 'oscillator', 'frequency'], 220);
  assert.deepEqual(second.frequency.events.at(-1), ['set', 220, 4]);
});

test("a desk's pool of channels: a copy fed from the desk's own input, into the bus, as its pool's rule wires it, a node at the desk's input and output", () => {
  const { context, source, what, made } = built(DESK);
  what.add(['replay', '3']);
  const [deskIn] = outOf(context, source);
  const [bus, master, replay] = made('gain').filter(
    (node) => node !== deskIn && !outOf(context, node).includes(context.destination),
  );
  assert.deepEqual(outOf(context, deskIn), [replay], "the desk's input into the copy");
  assert.deepEqual(outOf(context, replay), [bus], 'the copy into its bus');
  assert.deepEqual(outOf(context, bus), [master]);
  what.set(['replay', '3', 'gain'], 0.5);
  assert.deepEqual(replay.gain.events.at(-1), ['set', 0.5, 4]);
});

test('refused: a copy added twice, a pool not there, a copy numbered from 0, one let go not added', () => {
  const { what } = built(SYNTH);
  what.add(['voice', '2']);
  assert.throws(() => what.add(['voice', '2']), /voice\/2: added already/);
  assert.throws(() => what.add(['choir', '1']), /choir: no pool/);
  assert.throws(() => what.add(['voice', '0']), /from 1/);
  assert.throws(() => what.letGo(['voice', '9']), /voice\/9: not added/);
});

test("a copy's way in by its address: a sound fed into it, as a track's instrument into its channel; a copy not added refused", () => {
  const { context, what, made } = built(DESK);
  const before = made('gain').length;
  const copy = ['replay', '1'];
  what.add(copy);
  const [replay] = made('gain').slice(before);
  const instrument = context.createGain();
  what.feed(copy, instrument);
  assert.deepEqual(outOf(context, instrument), [replay], "into the copy's way in");
  assert.throws(() => what.feed(['replay', '2'], instrument), /replay\/2: not built/);
  what.letGo(copy);
  assert.deepEqual(outOf(context, instrument), [], 'let go of with the copy');
});

test("a copy's meter forgotten as it's let go: the copy added again, its meter made again on it", () => {
  const { context, what, made } = built(DESK);
  what.add(['replay', '1']);
  what.peak(['replay', '1']);
  what.letGo(['replay', '1']);
  const before = made('gain').length;
  what.add(['replay', '1']);
  const [again] = made('gain').slice(before);
  what.peak(['replay', '1']);
  const splitters = made('splitter');
  assert.equal(splitters.length, 2, 'made again');
  assert.deepEqual(into(context, splitters[1]), [again], 'on the copy as it is now');
});
