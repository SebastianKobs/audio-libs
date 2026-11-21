// The worklet effects as the builder makes them (modular-audio/build/web-audio/blocks/), on the stand-in for Web Audio:
// the crusher, the grains and the saturating filter.
//   - a worklet of its processor where the worklets have loaded: one input and one output, its params at their values, set and
//     automated as AudioParams; the grains and the filter handed a seed drawn once from the builder's random;
//   - nothing to stand for the crusher and the grains where they haven't: a placeholder passes the sound through, said by its address;
//   - the library's filter for the saturating filter where they haven't: its type and slope by the mode, its resonance worked into a Q.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { into, outOf, StandInContext } from './audio-stand-in.js';
import { NO_WORKLETS, WebAudioBuilder } from '../index.ts';
import { blockNode, composite, oneBlockPlan } from './blocks.js';
import { standInWorklets } from './worklet-nodes.js';
import { near } from '../../../../base/util/test/near.js';

const LOADED = standInWorklets(['crusher', 'grains', 'saturating filter', 'sync oscillator']);
const MONO_OUT = [{ name: 'out', channels: 1 }];
// a param's value as last told: set now, it's scheduled at the context's time
const told = (param) => param.events.at(-1)?.[1] ?? param.value;

// one block of a kind built on a stand-in context at 2 s, between a source and the output
function effectOn(kind, values = {}, { worklets = LOADED, random = () => 0.5 } = {}) {
  const context = new StandInContext(() => 2);
  const source = context.createGain();
  const builder = new WebAudioBuilder({ context, beat: () => 0.5, random, worklets });
  const built = builder.build(oneBlockPlan(kind, values), { into: context.destination, from: { in: source } });
  const made = (nodeKind) => context.rec.nodes.filter((node) => node.kind === nodeKind && node !== source);
  return { context, source, built, made };
}

// a synth of one voice, a sync oscillator through a saturating filter, one copy added at 5 s
function filteredVoice({ worklets = LOADED } = {}) {
  const wires = [
    { from: { node: 'osc', output: 'out' }, to: { node: 'tone', input: 'in' } },
    { from: { node: 'tone', output: 'out' }, to: { output: 'out' } },
  ];
  const voice = composite('voice', [blockNode('osc', 'sync oscillator'), blockNode('tone', 'saturating filter')], {
    outputs: MONO_OUT,
    wires,
  });
  const pool = { child: voice, wires: [{ from: { node: 'voice', output: 'out' }, to: { output: 'out' } }] };
  const plan = { version: 1, node: composite('synth', [], { kind: 'instrument', outputs: MONO_OUT, pools: [pool] }) };
  const context = new StandInContext(() => 2);
  const built = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets }).build(plan, {
    into: context.destination,
  });
  built.add(['voice', '1'], 5);
  const made = (nodeKind) => context.rec.nodes.filter((node) => node.kind === nodeKind);
  return { context, built, made };
}

// a random handed to a builder that counts its draws
function counted(value = 0.5) {
  const draws = { count: 0 };
  return {
    draws,
    random: () => {
      draws.count++;
      return value;
    },
  };
}

// ----- the crusher
test('a crusher made a worklet of its processor, one input and one output, at its values; its params set and automated as an AudioParam', () => {
  const { made, built, context, source } = effectOn('crusher', { bits: 8, rate: 12000 });
  const [crusher, ...others] = made('worklet');
  assert.equal(others.length, 0);
  assert.equal(crusher.extra.processor, 'crusher');
  assert.deepEqual(crusher.extra.options.parameterData, { bits: 8, rate: 12000 });
  assert.deepEqual([crusher.extra.options.numberOfInputs, crusher.extra.options.numberOfOutputs], [1, 1]);
  assert.equal(into(context, crusher).length, 1, 'fed by its source');
  assert.deepEqual(outOf(context, source), [crusher]);
  built.set(['bits'], 6, { at: 3 });
  assert.deepEqual(crusher.parameters.get('bits').events.at(-1), ['set', 6, 3]);
  assert.deepEqual(built.placeholders, []);
  built.dispose();
  assert.ok(context.rec.disconnects.includes(crusher), 'taken apart with the rest');
});

test("a crusher's bits and rate are cabled into: a signal wired onto each reaches the worklet's param", () => {
  const params = ['bits', 'rate'];
  const children = [
    blockNode('crush', 'crusher'),
    ...params.map((param) => blockNode(`${param} signal`, 'oscillator')),
  ];
  const wires = [
    { from: { node: 'crush', output: 'out' }, to: { output: 'out' } },
    ...params.map((param) => ({ from: { node: `${param} signal`, output: 'out' }, to: { node: 'crush', param } })),
  ];
  const context = new StandInContext(() => 2);
  const plan = { version: 1, node: composite('card', children, { kind: 'Card', outputs: MONO_OUT, wires }) };
  new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets: LOADED }).build(plan, {
    into: context.destination,
  });
  const [crusher] = context.rec.nodes.filter((node) => node.kind === 'worklet');
  for (const param of params) {
    assert.ok(into(context, crusher.parameters.get(param)).length > 0, `a signal reaches ${param}`);
  }
});

test('without its worklet a crusher is a placeholder: its sound passed through, said by its address', () => {
  const { made, built, source, context } = effectOn('crusher', {}, { worklets: NO_WORKLETS });
  assert.equal(made('worklet').length, 0);
  assert.deepEqual(built.placeholders, [[]]);
  const [first] = outOf(context, source);
  assert.equal(first.kind, 'gain', 'a gain at 1 in its place');
  assert.doesNotThrow(() => built.set(['bits'], 4), "a placeholder's param left alone");
});

// ----- the grains
test('grains made a worklet holding its memory, a seed drawn once from the random handed in, at its values', () => {
  const { draws, random } = counted();
  const { made } = effectOn('grains', { size: 0.12 }, { random });
  const [grains] = made('worklet');
  assert.equal(grains.extra.processor, 'grains');
  assert.deepEqual(grains.extra.options.processorOptions, { memory: 2, seed: 2147483648 }, '0.5 of 2 ** 32');
  assert.equal(draws.count, 1, 'one draw, one cloud');
  assert.deepEqual(grains.extra.options.parameterData, {
    freeze: 0,
    position: 0.25,
    size: 0.12,
    density: 12,
    pitch: 0,
    spray: 0.02,
  });
  assert.deepEqual([grains.extra.options.numberOfInputs, grains.extra.options.numberOfOutputs], [1, 1]);
});

test("grains' seed follows the random: the same draws, the same seed, another draw another", () => {
  const seedOf = (draw) =>
    effectOn('grains', {}, { random: () => draw }).made('worklet')[0].extra.options.processorOptions.seed;
  const seed = seedOf(0.25);
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32, `${seed}`);
  assert.equal(seedOf(0.25), seed);
  assert.notEqual(seedOf(0.75), seed);
});

test("grains' params set as an AudioParam, its freeze among them", () => {
  const { made, built } = effectOn('grains');
  const [grains] = made('worklet');
  built.set(['freeze'], 1, { at: 3 });
  assert.deepEqual(grains.parameters.get('freeze').events.at(-1), ['set', 1, 3]);
});

test("without its worklet grains is a placeholder as the crusher is, its one draw still made so what draws after it doesn't depend on what loaded", () => {
  const { draws, random } = counted();
  const { made, built } = effectOn('grains', {}, { worklets: NO_WORKLETS, random });
  assert.equal(made('worklet').length, 0);
  assert.deepEqual(built.placeholders, [[]]);
  assert.equal(draws.count, 1);
});

// ----- the saturating filter
test('a saturating filter made a worklet of its processor at its values, a seed from the random handed in, nothing posted at its start', () => {
  const { made } = effectOn('saturating filter', { frequency: 800, resonance: 0.5 });
  const [filter, ...others] = made('worklet');
  assert.equal(others.length, 0);
  assert.equal(filter.extra.processor, 'saturating filter');
  assert.deepEqual(filter.extra.options.parameterData, {
    frequency: 800,
    detune: 0,
    resonance: 0.5,
    drive: 1,
    compensation: 0,
    mode: 0,
  });
  assert.equal(filter.extra.options.processorOptions.seed, 2147483648, "the fixture's random is 0.5: half of 2 ** 32");
  assert.deepEqual([filter.extra.options.numberOfInputs, filter.extra.options.numberOfOutputs], [1, 1]);
  assert.deepEqual(filter.port.messages, []);
});

test('a saturating filter draws once from the random handed in', () => {
  const { draws, random } = counted();
  effectOn('saturating filter', {}, { random });
  assert.equal(draws.count, 1);
});

test("a saturating filter's params set and automated as an AudioParam, its mode by its index; stopped now as it is taken apart", () => {
  const { made, built } = effectOn('saturating filter', { frequency: 800, resonance: 0.5 });
  const [filter] = made('worklet');
  built.set(['mode'], 'bandpass');
  assert.deepEqual(filter.parameters.get('mode').events.at(-1), ['set', 2, 2]);
  built.set(['resonance'], 0.9, { at: 3 });
  assert.deepEqual(filter.parameters.get('resonance').events.at(-1), ['set', 0.9, 3]);
  assert.deepEqual(built.placeholders, []);
  built.dispose();
  assert.deepEqual(filter.port.messages.at(-1), { stop: 0 });
});

test('a saturating filter in a voice: told nothing as the voice starts, { stop } when the voice is silent, { stop: 0 } as it is let go', () => {
  const { made, built } = filteredVoice();
  const [filter] = made('worklet').filter(({ extra }) => extra.processor === 'saturating filter');
  assert.deepEqual(filter.port.messages, []);
  built.stopBy(['voice', '1'], 6.5);
  assert.deepEqual(filter.port.messages.at(-1), { stop: 6.5 });
  built.letGo(['voice', '1']);
  assert.deepEqual(filter.port.messages.at(-1), { stop: 0 });
});

test("a saturating filter's frequency, detune and resonance are cabled into: a signal wired onto each reaches the worklet's param", () => {
  const params = ['frequency', 'detune', 'resonance', 'drive'];
  const children = [
    blockNode('tone', 'saturating filter'),
    ...params.map((param) => blockNode(`${param} signal`, 'oscillator')),
  ];
  const wires = [
    { from: { node: 'tone', output: 'out' }, to: { output: 'out' } },
    ...params.map((param) => ({ from: { node: `${param} signal`, output: 'out' }, to: { node: 'tone', param } })),
  ];
  const context = new StandInContext(() => 2);
  const plan = { version: 1, node: composite('card', children, { kind: 'Card', outputs: MONO_OUT, wires }) };
  new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets: LOADED }).build(plan, {
    into: context.destination,
  });
  const [filter] = context.rec.nodes.filter((node) => node.kind === 'worklet');
  for (const param of params) {
    assert.ok(into(context, filter.parameters.get(param)).length > 0, `a signal reaches ${param}`);
  }
});

test("without its worklet a saturating filter is the library's filter: two lowpass biquads at a 4th-order Butterworth's Qs, in dB", () => {
  const { made, built } = effectOn('saturating filter', { frequency: 800 }, { worklets: NO_WORKLETS });
  assert.equal(made('worklet').length, 0);
  const biquads = made('biquad');
  assert.equal(biquads.length, 2);
  assert.deepEqual(
    biquads.map(({ type }) => type),
    ['lowpass', 'lowpass'],
  );
  assert.deepEqual(
    biquads.map(({ frequency }) => frequency.value),
    [800, 800],
  );
  near(biquads[0].Q.value, -5.33, 'the first Q, dB', 0.01);
  near(biquads[1].Q.value, 2.32, 'the second Q, dB', 0.01);
  built.set(['resonance'], 1);
  near(told(biquads[1].Q), 34.88, 'a resonance of 1: the top Q of 30, in dB on the second stage', 0.01);
  assert.doesNotThrow(() => built.set(['drive'], 4));
  assert.doesNotThrow(() => built.set(['compensation'], 1));
  assert.deepEqual(built.placeholders, [], 'not a placeholder');
});

test("without its worklet a saturating filter's frequency and detune move the library filter's, a resonance of 0 its flat Q", () => {
  const { made, built } = effectOn('saturating filter', {}, { worklets: NO_WORKLETS });
  const biquads = made('biquad');
  built.set(['frequency'], 300);
  built.set(['detune'], 1200);
  for (const biquad of biquads) {
    assert.equal(told(biquad.frequency), 300);
    assert.equal(told(biquad.detune), 1200);
  }
  near(biquads[1].Q.value, 2.32, "resonance 0: flat, a 4th-order Butterworth's second stage", 0.01);
});

test("without its worklet a saturating filter's modes: bandpass one bandpass biquad, highpass one highpass, lowpass one lowpass", () => {
  for (const mode of ['bandpass', 'highpass', 'lowpass']) {
    const stood = new StandInContext(() => 2);
    const source = stood.createGain();
    const plan = { version: 1, node: blockNode('tone', 'saturating filter', {}, {}) };
    plan.node.params = plan.node.params.map((param) =>
      param.spec.name === 'mode' ? { ...param, value: mode } : param,
    );
    new WebAudioBuilder({ context: stood, beat: () => 0.5, random: () => 0.5, worklets: NO_WORKLETS }).build(plan, {
      into: stood.destination,
      from: { in: source },
    });
    const made = stood.rec.nodes.filter((node) => node.kind === 'biquad');
    assert.equal(made.length, 1, mode);
    assert.equal(made[0].type, mode, mode);
  }
});

test("without its worklet a saturating filter's resonance 0.5 is the Q halfway between flat and the top, by octaves: 18.60 dB on the second stage", () => {
  const { made, built } = effectOn('saturating filter', {}, { worklets: NO_WORKLETS });
  const biquads = made('biquad');
  built.set(['resonance'], 0.5, { at: 3 });
  near(told(biquads[1].Q), 18.6, '20 log10 (1.3066 × sqrt(30 / 0.7071))', 0.02);
  assert.equal(biquads[1].Q.events.at(-1)[2], 3, 'at its time');
  assert.doesNotThrow(() => built.set(['mode'], 'highpass'));
});

test('without its worklet a saturating filter in a voice is let go and stopped as any voice is, nothing sent it', () => {
  const { made, built } = filteredVoice({ worklets: standInWorklets(['sync oscillator']) });
  assert.equal(made('biquad').length, 2);
  assert.doesNotThrow(() => built.stopBy(['voice', '1'], 6.5));
  assert.doesNotThrow(() => built.letGo(['voice', '1']));
});
