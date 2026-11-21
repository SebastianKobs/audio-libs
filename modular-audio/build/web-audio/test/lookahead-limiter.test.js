// The lookahead limiter as the builder makes it (modular-audio/build/web-audio/blocks/lookahead-limiter.ts), on the
// stand-in for Web Audio:
//   - a worklet of its processor where the worklets have loaded: its four params its own, its reduction as the processor posts it;
//   - the library's limiter where they haven't, at the same gain, ceiling and release, its clip held.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into, outOf } from './audio-stand-in.js';
import { loadWorklets, NO_WORKLETS, WebAudioBuilder } from '../index.ts';
import { last, oneBlockPlan } from './blocks.js';
import { standInWorklets, workletNodeOn } from './worklet-nodes.js';
import { near } from '../../../../base/util/test/near.js';

const dB = (gain) => 20 * Math.log10(gain);

// a lookahead limiter built on a stand-in context, between a source and the output; the context's nodes by their kind
function limiterOn(worklets, values = {}) {
  const context = new StandInContext(() => 2);
  const source = context.createGain();
  const builder = new WebAudioBuilder({ context, beat: () => 0.5, random: () => 0.5, worklets });
  const built = builder.build(oneBlockPlan('lookahead limiter', values), {
    into: context.destination,
    from: { in: source },
  });
  const made = (kind) => context.rec.nodes.filter((node) => node.kind === kind && node !== source);
  return { context, built, made };
}

test('a worklet of its processor at its values, one input and one output; its reduction read as the processor posts it, a message with none ignored', () => {
  const { made, built } = limiterOn(standInWorklets(), { gain: 2 });
  const [limiter, ...others] = made('worklet');
  assert.equal(others.length, 0, 'one worklet');
  assert.equal(limiter.extra.processor, 'lookahead limiter');
  assert.deepEqual(limiter.extra.options.parameterData, { gain: 2, ceiling: -1, release: 0.1, clip: 3 });
  assert.deepEqual([limiter.extra.options.numberOfInputs, limiter.extra.options.numberOfOutputs], [1, 1]);
  assert.equal(made('compressor').length, 0, "not the library's");
  assert.equal(built.reading([], 'reduction'), 0);
  limiter.port.onmessage({ data: { reduction: 2.5 } });
  assert.equal(built.reading([], 'reduction'), 2.5);
  limiter.port.onmessage({ data: {} });
  assert.equal(built.reading([], 'reduction'), 2.5, 'a message with no reduction leaves it');
  assert.deepEqual(built.placeholders, []);
});

test("a worklet's params its own AudioParams, set as any is; its sound in from where it comes from and out to where it goes; taken apart with the rest", () => {
  const { context, made, built } = limiterOn(standInWorklets());
  const [limiter] = made('worklet');
  built.set(['ceiling'], -3, { at: 3 });
  assert.deepEqual(last(limiter.parameters.get('ceiling')), ['set', -3, 3]);
  built.set(['clip'], 9, { at: 3 });
  assert.deepEqual(last(limiter.parameters.get('clip')), ['set', 9, 3], 'its clip too');
  assert.equal(into(context, limiter).length, 1, 'fed by its source');
  assert.deepEqual(outOf(context, limiter), [context.destination]);
  built.dispose();
  assert.ok(context.rec.disconnects.includes(limiter), 'disconnected');
});

test("where the worklets haven't loaded, the library's limiter at the same gain, ceiling and release: a compressor at its ceiling as hard as it goes, its make-up taken back, its reduction read", () => {
  const { made, built } = limiterOn(NO_WORKLETS, { gain: 2 });
  assert.equal(made('worklet').length, 0);
  const [compressor, ...more] = made('compressor');
  assert.equal(more.length, 0);
  assert.deepEqual(
    ['threshold', 'ratio', 'knee', 'release'].map((name) => compressor[name].value),
    [-1, 20, 0, 0.1],
  );
  const [drive, back] = made('gain');
  near(dB(drive.gain.value), 2, 'its gain, in');
  near(dB(back.gain.value), -0.6 * 1 * (1 - 1 / 20), "the compressor's make-up taken back");
  compressor.reduction = -4;
  assert.equal(built.reading([], 'reduction'), 4);
  assert.deepEqual(built.placeholders, [], 'not a placeholder');
});

test("the library's limiter handed on whole: its params moved, its clip held and heard nowhere", () => {
  const { made, built } = limiterOn(NO_WORKLETS, { clip: 6 });
  const [compressor] = made('compressor');
  built.set(['ceiling'], -3, { at: 3 });
  assert.deepEqual(last(compressor.threshold), ['set', -3, 3], "the library's ceiling, moved");
  assert.doesNotThrow(() => built.set(['clip'], 9, { at: 3 }));
  assert.doesNotThrow(() => built.set(['clip'], 1));
  assert.deepEqual(made('compressor'), [compressor], 'moves nothing: no node made again');
  assert.equal(made('worklet').length, 0);
});

test("loaded by loadWorklets(): its node made of the processor that loaded, the library's limiter where its module didn't", async () => {
  const loaded = new StandInContext(() => 2);
  const worklets = await loadWorklets(loaded, { 'lookahead limiter': 'limiter.js' }, { construct: workletNodeOn });
  assert.equal(limiterOn(worklets).made('worklet').length, 1);
  const failing = new StandInContext(() => 2);
  failing.audioWorklet.behave = () => Promise.reject(new Error('404'));
  const said = [];
  const none = await loadWorklets(
    failing,
    { 'lookahead limiter': 'limiter.js' },
    { warn: (...words) => said.push(words), construct: workletNodeOn },
  );
  const { made } = limiterOn(none);
  assert.deepEqual([made('worklet').length, made('compressor').length], [0, 1], "the library's");
  assert.equal(said.length, 1);
});
