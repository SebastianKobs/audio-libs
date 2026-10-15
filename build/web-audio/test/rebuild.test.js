// What's built built again (mockup/src/libs/build/web-audio), on the stand-in for Web Audio:
//   - the new beside the old, the inputs moved over to it, the old let go once it has rung out;
//   - the old faded where it makes sound of its own, the new faded in; one only processing left to ring out;
//   - the values told and the copies added kept; a preset changing a setting, built again with it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StandInContext, into, outOf } from './audio-stand-in.js';
import { CROSSFADE, RING_OUT, WebAudioBuilder } from '../index.ts';
import { BLOCKS } from '../../../plan/blocks/index.ts';
import { SYNTH, UTILITY } from '../../../plan/format/test/plans.ts';

// what's built of a plan on a stand-in context at a time, fed from a source; the context's nodes by their kind
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
// a sound of its own: an oscillator into a gain, out
const TONE = {
  version: 1,
  node: {
    name: 'tone',
    kind: 'Tone',
    inputs: [],
    outputs: [{ name: 'out', channels: 1 }],
    params: [],
    settings: [],
    inside: {
      children: [
        { ...block('oscillator'), name: 'osc' },
        { ...block('gain'), name: 'level' },
      ],
      wires: [
        { from: { node: 'osc', output: 'out' }, to: { node: 'level', input: 'in' } },
        { from: { node: 'level', output: 'out' }, to: { output: 'out' } },
      ],
      macros: [],
      pools: [],
    },
  },
};
// a block as a plan has it, at its declared defaults
function block(kind) {
  const { inputs, outputs, params, settings } = BLOCKS[kind];
  const jack = ({ name, channels = 1 }) => ({ name, channels });
  return {
    name: kind,
    kind,
    inputs: inputs.map(jack),
    outputs: outputs.map(jack),
    params: params.map((spec) => ({ spec, value: spec.default })),
    settings: settings.map((spec) => ({ spec, value: spec.default })),
  };
}

test('what only processes sound built again: its input moved over to the new, the old left to ring out, unfaded, let go once it has', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { context, source, what, made } = built(UTILITY);
  const [oldGain] = made('gain');
  const [oldPan] = made('panner');
  what.rebuild(UTILITY);
  const [, newGain] = made('gain');
  const [, newPan] = made('panner');
  assert.deepEqual(outOf(context, source), [newGain], 'its input moved over');
  assert.deepEqual(into(context, context.destination), [oldPan, newPan], 'both heard while the old rings out, unfaded');
  t.mock.timers.tick(RING_OUT - 1);
  assert.ok(!context.rec.disconnects.includes(oldGain), 'still ringing');
  t.mock.timers.tick(1);
  assert.ok(
    [oldGain, oldPan].every((node) => context.rec.disconnects.includes(node)),
    'let go once it has rung out',
  );
  assert.ok(!context.rec.disconnects.includes(newPan), 'the new kept');
});

test('what makes sound of its own built again: the old faded out, the new faded in, over the crossfade; its oscillator stopped once it has rung out', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { context, what, made } = built(TONE);
  const [oldOsc] = made('oscillator');
  const [oldLevel] = made('gain');
  what.rebuild(TONE);
  const [fadeOut] = outOf(context, oldLevel);
  assert.deepEqual(
    fadeOut.gain.events,
    [
      ['set', 1, 4],
      ['linear', 0, 4 + CROSSFADE],
    ],
    'the old faded out',
  );
  const [, newLevel] = made('gain').filter((node) => node !== fadeOut);
  const [fadeIn] = outOf(context, newLevel);
  assert.deepEqual(
    fadeIn.gain.events,
    [
      ['set', 0, 4],
      ['linear', 1, 4 + CROSSFADE],
    ],
    'the new faded in',
  );
  assert.deepEqual(into(context, context.destination), [fadeOut, fadeIn]);
  t.mock.timers.tick(RING_OUT);
  assert.equal(oldOsc.stops.length, 1);
  assert.ok(context.rec.disconnects.includes(fadeOut), 'its fade let go with it');
  assert.ok(!context.rec.disconnects.includes(fadeIn), 'the new kept');
});

test('what was told kept as it was built again: the values set, a macro by its own address, the copies added', () => {
  const effect = built(UTILITY);
  effect.what.set(['level'], 0.3);
  effect.what.rebuild(UTILITY);
  assert.deepEqual(effect.made('gain').at(-1).gain.events.at(-1), ['set', 0.3, 4], "the level's, onto the new gain");
  const instrument = built(SYNTH);
  instrument.what.add(['voice'], 2);
  instrument.what.set(['voice 2', 'oscillator', 'frequency'], 330);
  instrument.what.rebuild(SYNTH);
  const [, newOsc] = instrument.made('oscillator');
  assert.deepEqual(newOsc.frequency.events.at(-1), ['set', 330, 4], 'voice 2 added again, its frequency as told');
  instrument.what.letGo(['voice 2']);
  instrument.what.rebuild(SYNTH);
  assert.equal(instrument.made('oscillator').length, 2, 'a voice let go not added again, what it was told forgotten');
});

test('a preset that changes a setting: built again with it, its values set on the new; one that keeps it, passed over', () => {
  const { what, made } = built(UTILITY);
  what.preset({ 'pan/pan': 0.5 }, { 'pan/law': 'pan pot' });
  const [, newPan] = made('panner');
  assert.ok(newPan, 'built again');
  assert.equal(newPan.channelCountMode === 'explicit', false, 'a pan pot');
  assert.deepEqual(newPan.pan.events.at(-1), ['set', 0.5, 4]);
  what.preset({}, { 'pan/law': 'pan pot' });
  assert.equal(made('panner').length, 2, 'kept: not built again');
});
