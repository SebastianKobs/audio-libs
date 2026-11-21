// The worklets (modular-audio/build/web-audio/worklets.ts), on the stand-in for Web Audio: the processors' modules
// loaded into a context, each by the URL it's handed, and a node made of each that loaded.
// Never breaking the sound: a module that failed or took too long, a context with no audio worklet, a node that fails to be
// made: said once, its node none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorklets, NO_WORKLETS } from '../index.ts';
import { StandInContext } from './audio-stand-in.js';

const MODULES = { crusher: 'crusher.js', grains: 'grains.js' };
const OPTIONS = { numberOfInputs: 1 };
// the nodes a stand-in context makes, its warnings kept
function loadingOn(context, patience) {
  const said = [];
  const loading = {
    warn: (...words) => said.push(words.join(' ')),
    construct: (on, processor, options) => on.createWorkletNode(processor, options),
    ...(patience !== undefined && { patience }),
  };
  return { said, loading };
}

test('every module added to the context by its URL; a node made of each, by the name it registers', async () => {
  const context = new StandInContext(() => 0);
  const { said, loading } = loadingOn(context);
  const worklets = await loadWorklets(context, MODULES, loading);
  assert.deepEqual(context.audioWorklet.added.toSorted(), ['crusher.js', 'grains.js']);
  const node = worklets.node(context, 'grains', OPTIONS);
  assert.deepEqual([node.kind, node.extra.processor, node.extra.options], ['worklet', 'grains', OPTIONS]);
  assert.equal(worklets.node(context, 'unknown', OPTIONS), null, 'a name no module registers');
  assert.deepEqual(said, [], 'nothing to say');
});

test('a module that failed: said once, naming it and the library; its node none, the others made', async () => {
  const context = new StandInContext(() => 0);
  context.audioWorklet.behave = (url) => (url === 'grains.js' ? Promise.reject(new Error('404')) : Promise.resolve());
  const { said, loading } = loadingOn(context);
  const worklets = await loadWorklets(context, MODULES, loading);
  assert.equal(said.length, 1);
  assert.match(said[0], /modular-audio\/build\/web-audio/);
  assert.match(said[0], /grains/);
  assert.doesNotMatch(said[0], /libs-addition|crusher/);
  assert.equal(worklets.node(context, 'grains', OPTIONS), null);
  assert.notEqual(worklets.node(context, 'crusher', OPTIONS), null);
});

test('a module not loaded in its patience: given up on, said once, its node none; the sound never waits on it', async () => {
  const context = new StandInContext(() => 0);
  context.audioWorklet.behave = (url) => (url === 'grains.js' ? new Promise(() => {}) : Promise.resolve());
  const { said, loading } = loadingOn(context, 10);
  const worklets = await loadWorklets(context, MODULES, loading);
  assert.equal(said.length, 1);
  assert.match(said[0], /grains/);
  assert.equal(worklets.node(context, 'grains', OPTIONS), null);
  assert.notEqual(worklets.node(context, 'crusher', OPTIONS), null);
});

test('a context with no audio worklet (an insecure origin): none loaded, said once, every node none', async () => {
  const context = new StandInContext(() => 0);
  context.audioWorklet = undefined;
  const { said, loading } = loadingOn(context);
  const worklets = await loadWorklets(context, MODULES, loading);
  assert.equal(worklets, NO_WORKLETS);
  assert.equal(said.length, 1);
  assert.match(said[0], /modular-audio\/build\/web-audio/);
  assert.equal(worklets.node(context, 'grains', OPTIONS), null);
});

test('a node that fails to be made: said once for its processor however often, then none; the others made', async () => {
  const context = new StandInContext(() => 0);
  const { said, loading } = loadingOn(context);
  const failing = (on, processor, options) => {
    if (processor === 'grains') {
      throw new Error('not made');
    }
    return on.createWorkletNode(processor, options);
  };
  const worklets = await loadWorklets(context, MODULES, { ...loading, construct: failing });
  assert.equal(worklets.node(context, 'grains', OPTIONS), null);
  assert.equal(worklets.node(context, 'grains', OPTIONS), null);
  assert.equal(said.length, 1, 'said once');
  assert.match(said[0], /modular-audio\/build\/web-audio.*grains/);
  assert.notEqual(worklets.node(context, 'crusher', OPTIONS), null);
});

test('none loaded: every node none', () => {
  assert.equal(NO_WORKLETS.node(new StandInContext(() => 0), 'grains', OPTIONS), null);
});
