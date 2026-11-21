// The worklet sources as the builder makes them (modular-audio/build/web-audio/blocks/), on the stand-in for Web Audio:
// the sync oscillator, the operators and phase distortion.
//   - a worklet of its processor where the worklets have loaded: no input, one mono output, its params at their values, started
//     and stopped by message as its copy's time and its silence say, none of them a node the builder disconnects;
//   - the library's oscillator where they haven't: at the note, its other params held and heard nowhere, so a voice still sounds, plainer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { into, outOf, StandInContext } from './audio-stand-in.js';
import { NO_WORKLETS, WebAudioBuilder } from '../index.ts';
import { blockNode, composite, instrumentOf } from './blocks.js';
import { standInWorklets } from './worklet-nodes.js';
import { OPERATOR_ALGORITHMS } from '../../../../dsp/oscillators/index.ts';

const LOADED = standInWorklets(['sync oscillator', 'operators', 'phase distortion']);
const out = { from: { node: 'osc', output: 'out' }, to: { output: 'out' } };
// a param's value as last told: set now, it's scheduled at the context's time
const told = (param) => param.events.at(-1)?.[1] ?? param.value;

// a synth of one voice whose card is a block of a kind at the values and settings given, built on a stand-in context
function voiceOf(kind, values = {}, { worklets = LOADED, random = () => 0.5 } = {}) {
  const context = new StandInContext(() => 2);
  const builder = new WebAudioBuilder({ context, beat: () => 0.5, random, worklets });
  const what = builder.build(instrumentOf(blockNode('osc', kind, values)), { into: context.destination });
  const made = (nodeKind) => context.rec.nodes.filter((node) => node.kind === nodeKind);
  return { context, what, made };
}
// the same, a copy added at 5: the one worklet node, or the library's oscillator
function playing(kind, values, options) {
  const voice = voiceOf(kind, values, options);
  voice.what.add(['voice', '1'], 5);
  return voice;
}

// ----- the sync oscillator
test("a sync oscillator in a voice: a worklet source, no input, one mono output, its params at their values, its wave by its index; started at its copy's time, stopped by when it's silent, by message", () => {
  const { made, what } = playing('sync oscillator', { sync: 7 });
  const [osc, ...others] = made('worklet');
  assert.equal(others.length, 0);
  assert.equal(osc.extra.processor, 'sync oscillator');
  assert.deepEqual(
    [osc.extra.options.numberOfInputs, osc.extra.options.numberOfOutputs, osc.extra.options.outputChannelCount],
    [0, 1, [1]],
  );
  assert.deepEqual(osc.extra.options.parameterData, { frequency: 440, detune: 0, sync: 7, wave: 0 });
  assert.deepEqual(osc.port.messages, [{ start: 5 }]);
  what.stopBy(['voice', '1'], 6.5);
  assert.deepEqual(osc.port.messages.at(-1), { stop: 6.5 });
  what.set(['voice', '1', 'osc', 'wave'], 'square');
  assert.equal(told(osc.parameters.get('wave')), 1, 'told by its index');
  what.letGo(['voice', '1']);
  assert.deepEqual(osc.port.messages.at(-1), { stop: 0 }, 'taken apart: stopped now');
});

test("a worklet source isn't a node: the block's nodes under its address are nodes the builder can disconnect, and its stop param moves the stop it was told", () => {
  const { made, what } = playing('sync oscillator', { stop: 0.5 });
  const [osc] = made('worklet');
  assert.deepEqual(osc.port.messages, [{ start: 5 }, { stop: 5.5 }], 'stopped its stop after its start');
  const nodes = what.nodesUnder(['voice', '1', 'osc']);
  assert.deepEqual(nodes, [osc], 'the worklet alone, the message source left out');
  assert.ok(nodes.every((node) => 'connect' in node));
  what.set(['voice', '1', 'osc', 'stop'], 1, { at: 5.25 });
  assert.deepEqual(osc.port.messages.at(-1), { stop: 6 }, 'moved');
  what.stopBy(['voice', '1'], 5.75);
  assert.deepEqual(osc.port.messages.at(-1), { stop: 5.75 }, 'by a time, sooner than its own');
  assert.doesNotThrow(() => what.letGo(['voice', '1']));
});

test("a sync oscillator's frequency, detune and sync are cabled into: a signal wired onto each reaches the worklet's param", () => {
  const params = ['frequency', 'detune', 'sync'];
  const children = [
    blockNode('osc', 'sync oscillator'),
    ...params.map((param) => blockNode(`${param} signal`, 'oscillator')),
  ];
  const wires = [
    out,
    ...params.map((param) => ({ from: { node: `${param} signal`, output: 'out' }, to: { node: 'osc', param } })),
  ];
  const context = new StandInContext(() => 2);
  const outputs = [{ name: 'out', channels: 1 }];
  const plan = { version: 1, node: composite('card', children, { kind: 'Card', outputs, wires }) };
  new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets: LOADED }).build(plan, {
    into: context.destination,
  });
  const [osc] = context.rec.nodes.filter((node) => node.kind === 'worklet');
  for (const param of params) {
    assert.ok(into(context, osc.parameters.get(param)).length > 0, `a signal reaches ${param}`);
  }
});

test("without its worklet, a sync oscillator is the library's oscillator at its note, its wave the slave's, so the lead still sounds; its sync heard nowhere", () => {
  const { made, what } = playing('sync oscillator', { sync: 7 }, { worklets: NO_WORKLETS });
  assert.equal(made('worklet').length, 0);
  const [osc] = made('oscillator');
  assert.equal(osc.type, 'sawtooth');
  assert.deepEqual(osc.starts, [[5]]);
  assert.deepEqual(what.placeholders, [], 'not a placeholder');
  assert.doesNotThrow(() => what.set(['voice', '1', 'osc', 'sync'], 12), 'its sync heard nowhere');
  assert.equal(made('oscillator').length, 1, 'moves nothing: no oscillator made again');
  what.set(['voice', '1', 'osc', 'frequency'], 220);
  assert.equal(told(osc.frequency), 220);
  what.set(['voice', '1', 'osc', 'wave'], 'square');
  assert.equal(osc.type, 'square', 'its wave changed on the oscillator');
});

// ----- the operators
test("the operators made a worklet of their processor: no input, one mono output, nineteen params at their values, the algorithm's routes and carriers, the phases free", () => {
  const { made } = playing('operators', { algorithm: 3, feedback: 0.25, ratio2: 8, wave3: 'W5', phase: 'free' });
  const [ops] = made('worklet');
  assert.equal(ops.extra.processor, 'operators');
  assert.deepEqual(
    [ops.extra.options.numberOfInputs, ops.extra.options.numberOfOutputs, ops.extra.options.outputChannelCount],
    [0, 1, [1]],
  );
  assert.deepEqual(ops.extra.options.processorOptions, {
    routes: [[2, 4], [3], [], []],
    carriers: [1],
    feedbackOn: 4,
    phases: [0.5, 0.5, 0.5, 0.5],
  });
  const data = ops.extra.options.parameterData;
  assert.equal(Object.keys(data).length, 19);
  assert.deepEqual(
    [data.feedback, data.ratio2, data.wave3, data.level1, data.level2, data.frequency],
    [0.25, 8, 4, 1, 0, 440],
    'W5 by its index',
  );
  assert.equal(ops.parameters.size, 19);
});

test("the operators started at their copy's time and stopped by when it is silent, by message; let go, stopped now", () => {
  const { made, what } = playing('operators');
  const [ops] = made('worklet');
  assert.deepEqual(ops.port.messages, [{ start: 5 }]);
  what.stopBy(['voice', '1'], 6.5);
  assert.deepEqual(ops.port.messages.at(-1), { stop: 6.5 });
  what.letGo(['voice', '1']);
  assert.deepEqual(ops.port.messages.at(-1), { stop: 0 });
});

test("the operators' algorithm and phase are read as they are made: told later they hold the value and post nothing, and nothing throws", () => {
  const { made, what } = playing('operators');
  const [ops] = made('worklet');
  const posted = ops.port.messages.length;
  assert.doesNotThrow(() => what.set(['voice', '1', 'osc', 'algorithm'], 5));
  assert.doesNotThrow(() => what.set(['voice', '1', 'osc', 'phase'], 'free'));
  assert.equal(ops.port.messages.length, posted);
});

test("the operators' phases: four draws of the random handed in at free, none and zeros at reset", () => {
  for (const [phase, draws, phases] of [
    ['free', 4, [0.25, 0.25, 0.25, 0.25]],
    ['reset', 0, [0, 0, 0, 0]],
  ]) {
    let drawn = 0;
    const random = () => {
      drawn++;
      return 0.25;
    };
    const { made } = playing('operators', { phase }, { random });
    assert.equal(drawn, draws, phase);
    assert.deepEqual(made('worklet')[0].extra.options.processorOptions.phases, phases, phase);
  }
});

test('the operators handed the eight algorithms: each its routes and carriers, the feedback always on operator 4; a number off the ends held at the ends', () => {
  OPERATOR_ALGORITHMS.forEach(({ routes, carriers }, index) => {
    const { made } = playing('operators', { algorithm: index + 1 });
    const { processorOptions } = made('worklet')[0].extra.options;
    assert.deepEqual(
      processorOptions,
      { routes, carriers, feedbackOn: 4, phases: [0, 0, 0, 0] },
      `algorithm ${index + 1}`,
    );
  });
  const last = playing('operators', { algorithm: 8 }).made('worklet')[0].extra.options.processorOptions;
  const optionsAt = (algorithm) =>
    playing('operators', { algorithm }).made('worklet')[0].extra.options.processorOptions;
  assert.deepEqual(optionsAt(8.4).routes, last.routes, 'rounded');
  assert.deepEqual(optionsAt(8).carriers, [1, 2, 3, 4]);
});

test("without their worklet, the operators are a sine at the note into a gain at the first carrier's level: started as an oscillator is, the level opened and closed by what is cabled", () => {
  const { made, what, context } = playing('operators', {}, { worklets: NO_WORKLETS });
  assert.equal(made('worklet').length, 0);
  const [osc] = made('oscillator');
  assert.equal(osc.type, 'sine');
  assert.deepEqual(osc.starts, [[5]]);
  const [level] = outOf(context, osc);
  assert.equal(level.kind, 'gain');
  assert.equal(told(level.gain), 1, 'the default level1');
  what.set(['voice', '1', 'osc', 'level1'], 0);
  assert.equal(told(level.gain), 0);
  assert.deepEqual(what.placeholders, [], 'not a placeholder');
});

test("without their worklet, the first carrier's level is the gain's, whatever the algorithm; every other param held, unheard, nothing throwing", () => {
  const { made, what, context } = playing(
    'operators',
    { algorithm: 8, level1: 0.4, level2: 0.3 },
    { worklets: NO_WORKLETS },
  );
  const [osc] = made('oscillator');
  const [gain] = outOf(context, osc);
  assert.equal(told(gain.gain), 0.4);
  const heldOnes = [
    ['level2', 1],
    ['ratio2', 8],
    ['feedback', 0.5],
    ['wave3', 'W5'],
    ['algorithm', 3],
    ['phase', 'free'],
    ['detune2', 12],
  ];
  for (const [name, value] of heldOnes) {
    assert.doesNotThrow(() => what.set(['voice', '1', 'osc', name], value), name);
  }
  assert.equal(told(gain.gain), 0.4, "a modulator's level is not the gain's");
  what.set(['voice', '1', 'osc', 'frequency'], 220);
  assert.equal(told(osc.frequency), 220);
  what.set(['voice', '1', 'osc', 'detune'], 1200);
  assert.equal(told(osc.detune), 1200);
  assert.equal(made('oscillator').length, 1, 'moves nothing else');
});

// ----- phase distortion
test('a phase distortion line in a voice: a worklet source, no input, one mono output, its four params at their values; the phase free draws once, reset none', () => {
  const { made } = playing('phase distortion', { phase: 'free' });
  const [line] = made('worklet');
  assert.equal(line.extra.processor, 'phase distortion');
  assert.deepEqual(
    [line.extra.options.numberOfInputs, line.extra.options.numberOfOutputs, line.extra.options.outputChannelCount],
    [0, 1, [1]],
  );
  assert.deepEqual(line.extra.options.parameterData, { frequency: 440, detune: 0, dcw: 0, wave: 0 });
  assert.equal(line.extra.options.processorOptions.phase, 0.5, "the one draw of the fixture's random");
  const reset = playing('phase distortion', { phase: 'reset' }).made('worklet')[0];
  assert.equal(reset.extra.options.processorOptions.phase, 0, 'no draw at reset');
});

test('a phase distortion line draws once from the random handed in at free, none at reset, and the draw is its start phase', () => {
  for (const [phase, draws, start] of [
    ['free', 1, 0.25],
    ['reset', 0, 0],
  ]) {
    let drawn = 0;
    const random = () => {
      drawn++;
      return 0.25;
    };
    const { made } = playing('phase distortion', { phase }, { random });
    assert.equal(drawn, draws, phase);
    assert.equal(made('worklet')[0].extra.options.processorOptions.phase, start, phase);
  }
});

test("a phase distortion line started at its copy's time, stopped by when it's silent, by message; its wave told by its index; its phase told later holds", () => {
  const { made, what } = playing('phase distortion');
  const [line] = made('worklet');
  assert.deepEqual(line.port.messages, [{ start: 5 }]);
  what.stopBy(['voice', '1'], 6.5);
  assert.deepEqual(line.port.messages.at(-1), { stop: 6.5 });
  what.set(['voice', '1', 'osc', 'wave'], 'square');
  assert.equal(told(line.parameters.get('wave')), 1);
  const posted = line.port.messages.length;
  assert.doesNotThrow(
    () => what.set(['voice', '1', 'osc', 'phase'], 'free'),
    'read as the voice is made: told later it moves nothing',
  );
  assert.equal(line.port.messages.length, posted);
  what.letGo(['voice', '1']);
  assert.deepEqual(line.port.messages.at(-1), { stop: 0 }, 'taken apart: stopped now');
});

test("a phase distortion line's frequency, detune and dcw are cabled into: a signal wired onto each reaches the worklet's param, so an envelope sweeps the dcw", () => {
  const params = ['frequency', 'detune', 'dcw'];
  const children = [
    blockNode('osc', 'phase distortion'),
    ...params.map((param) => blockNode(`${param} signal`, 'oscillator')),
  ];
  const wires = [
    out,
    ...params.map((param) => ({ from: { node: `${param} signal`, output: 'out' }, to: { node: 'osc', param } })),
  ];
  const context = new StandInContext(() => 2);
  const plan = {
    version: 1,
    node: composite('card', children, { kind: 'Card', outputs: [{ name: 'out', channels: 1 }], wires }),
  };
  new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets: LOADED }).build(plan, {
    into: context.destination,
  });
  const [line] = context.rec.nodes.filter((node) => node.kind === 'worklet');
  for (const param of params) {
    assert.ok(into(context, line.parameters.get(param)).length > 0, `a signal reaches ${param}`);
  }
});

test("without its worklet, a phase distortion line is the library's oscillator at its note, a triangle for the saw and a square for the square, its dcw heard nowhere", () => {
  const { made, what } = playing('phase distortion', {}, { worklets: NO_WORKLETS });
  const [osc] = made('oscillator');
  assert.equal(made('oscillator').length, 1);
  assert.equal(osc.type, 'triangle');
  assert.deepEqual(osc.starts, [[5]]);
  assert.deepEqual(what.placeholders, [], 'not a placeholder');
  assert.doesNotThrow(() => what.set(['voice', '1', 'osc', 'dcw'], 0.5), 'its dcw heard nowhere');
  assert.doesNotThrow(() => what.set(['voice', '1', 'osc', 'phase'], 'free'));
  what.set(['voice', '1', 'osc', 'frequency'], 220);
  assert.equal(told(osc.frequency), 220);
  what.set(['voice', '1', 'osc', 'wave'], 'square');
  assert.equal(osc.type, 'square', 'its wave changed on the oscillator');
  const squared = playing('phase distortion', { wave: 'square' }, { worklets: NO_WORKLETS });
  assert.equal(squared.made('oscillator')[0].type, 'square');
});
