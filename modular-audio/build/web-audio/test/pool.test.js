// A pool's copies on what's built (mockup/src/libs/modular-audio/build/web-audio), on the stand-in for Web Audio:
//   - a copy added by its pool's address and its number, built from the pool's child, wired by its rule, set by its own address;
//   - let go: its sources stopped, its nodes disconnected, its address no longer set;
//   - a composite holding a pool a node at each of its own jacks, where copies come and go;
//   - a copy added twice, a pool not there, a copy not added refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { into, outOf } from './audio-stand-in.js';
import { blockNode, builtOn, THEREMIN } from './blocks.js';
import { SYNTH } from '../../../plan/format/test/plans.ts';

// an instrument with a block in its voice no builder makes
function withTheremin(instrument) {
  const [pool] = instrument.node.pools;
  const voice = { ...pool.child, children: [...pool.child.children, THEREMIN] };
  return { ...instrument, node: { ...instrument.node, pools: [{ ...pool, child: voice }] } };
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
    children: [blockNode('bus', 'gain', {}, {}, 2), blockNode('master', 'gain', {}, {}, 2)],
    wires: [
      { from: { node: 'bus', output: 'out' }, to: { node: 'master', input: 'in' } },
      { from: { node: 'master', output: 'out' }, to: { output: 'out' } },
    ],
    macros: [],
    pools: [
      {
        child: blockNode('replay', 'gain', {}, {}, 2),
        wires: [
          { from: { input: 'in' }, to: { node: 'replay', input: 'in' } },
          { from: { node: 'replay', output: 'out' }, to: { node: 'bus', input: 'in' } },
        ],
      },
    ],
  },
};

test("a voice added from an instrument's pool: built from its voice card, into the instrument's output, a node there where voices come and go; set by its own address", () => {
  const { context, what, made } = builtOn(SYNTH, { from: 'in' });
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
  assert.equal(made('constant').length, 2, 'each its envelope, built');
});

test("a copy added with a destination of its own: its output into it, not into the composite's", () => {
  const { context, what, made } = builtOn(SYNTH, { from: 'in' });
  const [out] = into(context, context.destination);
  const destination = context.createGain();
  what.add(['voice', '1'], undefined, destination);
  what.add(['voice', '2']);
  const [vca, vcaOfSecond] = made('gain').filter((node) => node !== out && node !== destination);
  assert.deepEqual(outOf(context, vca), [destination], 'its output into its destination alone');
  assert.deepEqual(outOf(context, vcaOfSecond), [out], 'a copy with none: into its composite, as before');
});

test("a voice's placeholders by its own address, gone as it's let go", () => {
  const { what } = builtOn(withTheremin(SYNTH), { from: 'in' });
  what.add(['voice', '1']);
  what.add(['voice', '2']);
  assert.deepEqual(what.placeholders, [
    ['voice', '1', 'theremin'],
    ['voice', '2', 'theremin'],
  ]);
  what.letGo(['voice', '1']);
  assert.deepEqual(what.placeholders, [['voice', '2', 'theremin']]);
});

test('a voice let go: its sources stopped, its nodes disconnected, its address no longer set; the other kept', () => {
  const { context, what, made } = builtOn(SYNTH, { from: 'in' });
  what.add(['voice', '1']);
  what.add(['voice', '2']);
  const [first, second] = made('oscillator');
  const before = context.rec.nodes.length;
  what.letGo(['voice', '1']);
  assert.equal(first.stops.length, 1);
  assert.equal(second.stops.length, 0);
  assert.ok(context.rec.disconnects.includes(first));
  assert.equal(context.rec.nodes.length, before, 'nothing made');
  assert.deepEqual(
    made('constant').map((envelope) => envelope.stops.length),
    [1, 0],
    'its envelope',
  );
  assert.throws(
    () => what.set(['voice', '1', 'oscillator', 'frequency'], 1),
    /voice\/1\/oscillator\/frequency: not built/,
  );
  what.set(['voice', '2', 'oscillator', 'frequency'], 220);
  assert.deepEqual(second.frequency.events.at(-1), ['set', 220, 4]);
});

test("a desk's pool of channels: a copy fed from the desk's own input, into the bus, as its pool's rule wires it, a node at the desk's input and output", () => {
  const { context, source, what, made } = builtOn(DESK, { from: 'in' });
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
  const { what } = builtOn(SYNTH, { from: 'in' });
  what.add(['voice', '2']);
  assert.throws(() => what.add(['voice', '2']), /voice\/2: added already/);
  assert.throws(() => what.add(['choir', '1']), /choir: no pool/);
  assert.throws(() => what.add(['voice', '0']), /from 1/);
  assert.throws(() => what.letGo(['voice', '9']), /voice\/9: not added/);
});

test("a copy's way in by its address: a sound fed into it, as a track's instrument into its channel; a copy not added refused", () => {
  const { context, what, made } = builtOn(DESK, { from: 'in' });
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
  const { context, what, made } = builtOn(DESK, { from: 'in' });
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
