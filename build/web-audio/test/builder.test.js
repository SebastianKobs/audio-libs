// The Web Audio builder's unit tests (mockup/src/libs/build/web-audio), on the stand-in for Web Audio beside them:
//   - a plan built between where its sound comes from and where it goes, a composite opened, its wires by names;
//   - each block made by its kind, at its values and settings; a signal into a delay's time;
//   - a placeholder for a block it can't make, said by its address, its sound passed straight through, a source silent;
//   - what's built taken apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into, outOf } from './audio-stand-in.js';
import { WebAudioBuilder } from '../index.ts';
import { blockNode, THEREMIN } from './blocks.js';
import { DESK, UTILITY } from '../../../plan/format/test/plans.ts';
import { near } from '../../../util/test/near.js';

const BEAT = 0.5; // s: a beat at 120 BPM

// a builder on a stand-in context of its own, the context's nodes by their kind
function builderOn() {
  const context = new StandInContext(() => 0);
  const builder = new WebAudioBuilder({ context, beat: () => BEAT, random: () => 0.5 });
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind);
  return { context, builder, made };
}
// a plan of its children wired in a row, from the first to the last, the last into its output
function chainOf(...children) {
  const wires = children.slice(1).map((child, index) => ({
    from: { node: children[index].name, output: 'out' },
    to: { node: child.name, input: 'in' },
  }));
  return {
    version: 1,
    node: {
      name: 'chain',
      kind: 'Chain',
      inputs: [],
      outputs: [{ name: 'out', channels: 2 }],
      params: [],
      settings: [],
      children,
      wires: [...wires, { from: { node: children.at(-1).name, output: 'out' }, to: { output: 'out' } }],
      macros: [],
      pools: [],
    },
  };
}

test('a plan built between where its sound comes from and where it goes: the Utility, a composite opened, its gain into its pan, wired by names', () => {
  const { context, builder, made } = builderOn();
  const source = context.createGain();
  const built = builder.build(UTILITY, { into: context.destination, from: { in: source } });
  const [gain] = made('gain').filter((node) => node !== source);
  const [pan] = made('panner');
  assert.deepEqual(outOf(context, source), [gain]);
  assert.deepEqual(outOf(context, gain), [pan]);
  assert.deepEqual(into(context, context.destination), [pan]);
  assert.equal(gain.gain.value, 1, 'at its value');
  assert.deepEqual(
    [pan.pan.value, pan.channelCountMode],
    [0, 'explicit'],
    'its law stereo: a mono sound made stereo first',
  );
  assert.deepEqual(built.placeholders, []);
});

test('each block made by its kind, at its values and settings: an oscillator and a noise started, a filter at 24 dB two in series, a delay by the beat, a reverb its impulse, a limiter', () => {
  const { context, builder, made } = builderOn();
  builder.build(
    chainOf(
      blockNode('osc', 'oscillator', { frequency: 220 }, { wave: 'triangle' }),
      blockNode('level', 'gain', { gain: 0.5 }),
      blockNode('filter', 'filter', { frequency: 800, resonance: Math.SQRT1_2 }, { type: 'highpass', slope: '24' }),
      blockNode('pan', 'pan', { pan: -0.5 }, { law: 'pan pot' }),
      blockNode('delay', 'delay', {}, { longest: 2 }),
      blockNode('room', 'reverb', {}, { length: 1.5 }),
      blockNode('limit', 'limiter', { gain: 6, ceiling: -1, release: 0.3 }),
    ),
    { into: context.destination },
  );
  const [osc] = made('oscillator');
  assert.deepEqual(
    [osc.type, osc.frequency.value, osc.starts.length],
    ['triangle', 220, 1],
    'its wave, its frequency; started',
  );
  assert.equal(made('gain')[0].gain.value, 0.5);
  const biquads = made('biquad');
  assert.deepEqual(
    biquads.map((b) => [b.type, b.frequency.value]),
    [
      ['highpass', 800],
      ['highpass', 800],
    ],
  );
  assert.deepEqual(outOf(context, biquads[0]), [biquads[1]], 'in series');
  near(biquads[0].Q.value, 20 * Math.log10(0.5412), 'flat: its stages a Butterworth, in dB', 1e-3);
  near(biquads[1].Q.value, 20 * Math.log10(1.3066), '', 1e-3);
  const [pan] = made('panner');
  assert.deepEqual(
    [pan.pan.value, pan.channelCountMode === 'explicit'],
    [-0.5, false],
    'a pan pot: panned as it comes',
  );
  const [delay] = made('delay');
  assert.deepEqual([delay.extra.max, delay.delayTime.value], [2, BEAT / 2], 'its longest; synced, an 8th at the beat');
  const [room] = made('convolver');
  assert.deepEqual([room.buffer.duration, room.buffer.numberOfChannels], [1.5, 2], 'its impulse, its length');
  assert.ok(made('compressor').length === 1, 'a limiter: a compressor between its drive and its makeup');
});

test("a signal wired into a delay's time, by its ms: into its line's own time, moving it in seconds, as Web Audio's does; into its note, refused", () => {
  const wobbled = (param) => {
    const plan = chainOf(blockNode('line', 'delay'));
    plan.node.children.push(
      blockNode('wobble', 'oscillator', { frequency: 0.5 }),
      blockNode('depth', 'gain', { gain: 0.004 }),
    );
    plan.node.wires.push(
      { from: { node: 'wobble', output: 'out' }, to: { node: 'depth', input: 'in' } },
      { from: { node: 'depth', output: 'out' }, to: { node: 'line', param } },
    );
    return plan;
  };
  const { context, builder, made } = builderOn();
  builder.build(wobbled('ms'), { into: context.destination });
  const [line] = made('delay');
  const [depth] = made('gain');
  assert.deepEqual(outOf(context, depth), [line.delayTime], '4 ms either way: a depth of 0.004');
  assert.throws(
    () => builderOn().builder.build(wobbled('note'), { into: context.destination }),
    /note: not a param a sound/,
  );
});

// a select between two gains: each wired into one of its inputs, the select into the plan's output
function selecting(input) {
  const plan = chainOf(blockNode('pick', 'select', {}, { input }));
  plan.node.children.unshift(blockNode('first', 'gain'), blockNode('second', 'gain'));
  plan.node.wires.push(
    { from: { node: 'first', output: 'out' }, to: { node: 'pick', input: 'a' } },
    { from: { node: 'second', output: 'out' }, to: { node: 'pick', input: 'b' } },
  );
  return plan;
}

test("a select: the input its setting names passed on, the other taken in nowhere, nothing made for it; a block's ways in by name", () => {
  for (const [input, passed, held] of [
    ['a', 0, 1],
    ['b', 1, 0],
  ]) {
    const { context, builder, made } = builderOn();
    builder.build(selecting(input), { into: context.destination });
    const gains = made('gain');
    const [out] = into(context, context.destination);
    assert.deepEqual(into(context, out), [gains[passed]], `${input}: its input passed on`);
    assert.deepEqual(outOf(context, gains[held]), [], `${input}: the other wired into nothing`);
    assert.equal(gains.length, 3, `${input}: the two before it and its way out, nothing for the other`);
  }
});

test('a noise, looping, started, its buffer by its colour; a source with nothing wired into it', () => {
  const { context, builder, made } = builderOn();
  builder.build(chainOf(blockNode('hiss', 'noise', {}, { colour: 'breath', loop: 'on' })), {
    into: context.destination,
  });
  const [hiss] = made('buffer');
  assert.deepEqual([hiss.loop, hiss.buffer.duration, hiss.starts.length], [true, 0.2, 1]);
  assert.deepEqual(into(context, context.destination), [hiss]);
});

test("a placeholder for a block it can't make, said by its address: its sound passed straight through, a source silent", () => {
  const { context, builder } = builderOn();
  const built = builder.build(chainOf(blockNode('osc', 'oscillator'), THEREMIN), { into: context.destination });
  assert.deepEqual(built.placeholders, [['theremin']]);
  const desk = builder.build(DESK, { into: context.destination });
  assert.deepEqual(
    desk.placeholders,
    [['my tap 1'], ['my playing'], ['reverb'], ['master']],
    'channels with no children, as the format writes them',
  );
  const [tap, bus, reverb, master] = context.rec.nodes.slice(-4);
  assert.deepEqual(outOf(context, tap), [bus, reverb], 'its way out and its tap, straight through');
  assert.deepEqual(outOf(context, master), [context.destination]);
});

test("what's built taken apart: its sources stopped, its nodes disconnected", () => {
  const { context, builder, made } = builderOn();
  const built = builder.build(chainOf(blockNode('osc', 'oscillator'), blockNode('level', 'gain')), {
    into: context.destination,
  });
  built.dispose();
  assert.equal(made('oscillator')[0].stops.length, 1);
  assert.ok(made('gain').every((node) => context.rec.disconnects.includes(node)));
});

test("a meter on a node's main output by its address, made as it's first read; a block's points and readings by name, the limiter's in and its reduction; a node not built, or a point it hasn't, refused", () => {
  const { context, builder, made } = builderOn();
  const what = builder.build(chainOf(blockNode('level', 'gain'), blockNode('limit', 'limiter')), {
    into: context.destination,
  });
  const [level] = made('gain');
  assert.equal(made('analyser').length, 0, 'no meter until one is read');
  assert.equal(what.peak(['level']), 0, 'silence');
  const [split] = made('splitter');
  assert.deepEqual(into(context, split), [level], 'on its output: a splitter, an analyser on each side');
  assert.equal(made('analyser').length, 2);
  made('analyser')[1].samples = [0.25, -0.5];
  assert.equal(what.peak(['level']), 0.5, 'its peak, either side; the meter made once');
  assert.equal(made('analyser').length, 2);
  what.peak(['limit'], 'in');
  assert.deepEqual(
    into(context, made('splitter')[1]),
    [outOf(context, level)[0]],
    "the limiter's in: its drive, after its way in",
  );
  assert.equal(typeof what.reading(['limit'], 'reduction'), 'number', 'what it takes away, as it says');
  assert.throws(() => what.peak(['nowhere']), /nowhere: not built/);
  assert.throws(() => what.peak(['limit'], 'side'), /limit: no point side/);
  assert.throws(() => what.reading(['level'], 'reduction'), /level: no reading reduction/);
  assert.equal(what.peak([]), 0, "the top's output too, by no address at all");
});

test("a sound fed into a node's input by its address, as a phrase into a bus; a node not built refused", () => {
  const { context, builder, made } = builderOn();
  const what = builder.build(chainOf(blockNode('bus', 'gain'), blockNode('limit', 'limiter')), {
    into: context.destination,
  });
  const [bus] = made('gain');
  const phrase = context.createGain();
  what.feed(['bus'], phrase);
  assert.deepEqual(outOf(context, phrase), [bus]);
  const fed = context.createGain();
  what.feed(['limit'], fed);
  assert.deepEqual(outOf(context, fed), [outOf(context, bus)[0]], "into its way in, a limiter's drive, not out of it");
  assert.throws(() => what.feed(['nowhere'], phrase), /nowhere: not built/);
});

test("a way of its own into a node's input by its address: a gain at 1, made by the builder, fed into it", () => {
  const { context, builder, made } = builderOn();
  const what = builder.build(chainOf(blockNode('bus', 'gain'), blockNode('limit', 'limiter')), {
    into: context.destination,
  });
  const [bus] = made('gain');
  const way = what.wayInto(['bus']);
  assert.equal(way.kind, 'gain');
  assert.deepEqual(outOf(context, way), [bus]);
  assert.throws(() => what.wayInto(['nowhere']), /nowhere: not built/);
});

test("what a node is built as, by its address, for who names it or listens to it: its jacks' nodes; every node built under it", () => {
  const { context, builder, made } = builderOn();
  const what = builder.build(chainOf(blockNode('bus', 'gain'), blockNode('limit', 'limiter')), {
    into: context.destination,
  });
  const [bus] = made('gain');
  assert.deepEqual(what.jacksOf(['bus']), { inputs: { in: [bus] }, outputs: { out: [bus] } }, "a block's: its node's");
  const limiter = what.jacksOf(['limit']);
  assert.notDeepEqual(limiter.inputs.in, limiter.outputs.out, 'a limiter: in at its drive, out of its makeup');
  const under = what.nodesUnder(['limit']);
  assert.ok(under.includes(limiter.inputs.in[0]) && under.includes(limiter.outputs.out[0]), 'every node of it');
  assert.ok(
    under.some((node) => node.kind === 'compressor'),
    'its compressor among them',
  );
  assert.ok(!under.includes(bus), 'none of another');
  assert.deepEqual(what.nodesUnder([]).length >= under.length + 1, true, "the top's: all of them");
  assert.throws(() => what.jacksOf(['nowhere']), /nowhere: not built/);
});
